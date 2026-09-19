"""Reproducible temporal benchmarks. No test-set model selection."""
from bootstrap import ROOT
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, average_precision_score, roc_auc_score, brier_score_loss, precision_score, recall_score, f1_score, confusion_matrix

FEATURES = ['temperature_c','vibration_mm_s','partial_discharge_pc','oil_quality_pct','wind_forecast_kmh','rain_forecast_mm','incidents_90d','age_years','load_pct']

def synthetic_data():
    rng = np.random.default_rng(42)
    records = []
    age = rng.uniform(3, 35, 36)
    wear = rng.normal(0, .7, 36)
    histories = [[] for _ in age]
    for day in range(360):
        storm = rng.uniform(0, 1)
        for asset in range(36):
            wear[asset] = .85 * wear[asset] + rng.normal(0, .45)
            w = wear[asset]
            wind = np.clip(15 + 65 * storm + rng.normal(0, 12), 0, 120)
            rain = np.clip(55 * storm + rng.normal(0, 13), 0, 100)
            load = np.clip(70 + 20 * np.sin(day / 20) + rng.normal(0, 18), 20, 140)
            temp = np.clip(48 + .27 * load + 7 * w + rng.normal(0, 5), 30, 125)
            vib = np.clip(1.5 + .8 * w + rng.normal(0, .4), .1, 7)
            pdv = np.clip(18 + 15 * w + rng.normal(0, 8), 0, 130)
            oil = np.clip(95 - age[asset] * .65 - 7 * w + rng.normal(0, 4), 15, 100)
            past = sum(day - 90 <= d < day for d in histories[asset])
            # Stochastic future event, not an observed fault copied into an input.
            logit = -5 + .055*(temp-60) + .7*vib + .02*pdv + .026*wind + .012*rain + .025*(80-oil) + .018*age[asset] + .018*past
            failure = int(rng.random() < 1/(1+np.exp(-logit)))
            records.append([day,asset,temp,vib,pdv,oil,wind,rain,past,age[asset],load,failure])
            if failure: histories[asset].append(day)
    return pd.DataFrame(records, columns=['day','asset_id'] + FEATURES + ['failure_next_24h'])

def classification_metrics(y,p,threshold):
    pred = p >= threshold
    return { 'average_precision':float(average_precision_score(y,p)), 'roc_auc':float(roc_auc_score(y,p)), 'brier':float(brier_score_loss(y,p)), 'precision':float(precision_score(y,pred,zero_division=0)), 'recall':float(recall_score(y,pred,zero_division=0)), 'f1':float(f1_score(y,pred,zero_division=0)), 'confusion_matrix':confusion_matrix(y,pred,labels=[0,1]).tolist(), 'prevalence':float(y.mean()), 'rows':len(y)}

def train_failure():
    df = synthetic_data()
    df.to_csv(ROOT/'data/synthetic_history.csv',index=False)
    tr,va,te = df[df.day<216],df[(df.day>=217)&(df.day<288)],df[df.day>=289]
    models={'logistic':make_pipeline(StandardScaler(),LogisticRegression(max_iter=500)), 'boosted_trees':HistGradientBoostingClassifier(max_iter=120,max_leaf_nodes=15,l2_regularization=8,random_state=42)}
    scores={}
    for name,model in models.items():
        model.fit(tr[FEATURES],tr.failure_next_24h)
        scores[name]=average_precision_score(va.failure_next_24h,model.predict_proba(va[FEATURES])[:,1])
    chosen=max(scores,key=scores.get)
    model=models[chosen]
    pv=model.predict_proba(va[FEATURES])[:,1]
    thresholds=np.arange(.1,.81,.025)
    threshold=float(max(thresholds,key=lambda t:f1_score(va.failure_next_24h,pv>=t)))
    p=model.predict_proba(te[FEATURES])[:,1]
    base=((te.temperature_c>85)|(te.vibration_mm_s>3)|(te.wind_forecast_kmh>70)).astype(float)
    result={'provenance':'SYNTHETIC ONLY: does not establish real-world outage accuracy','selected_model':chosen,'validation_average_precision':scores,'threshold':threshold,'split':{'train_days':[0,215],'validation_days':[217,287],'test_days':[289,359],'embargo_days':1},'test':classification_metrics(te.failure_next_24h,p,threshold),'threshold_baseline':classification_metrics(te.failure_next_24h,base,.5),'features':FEATURES,'seed':42}
    joblib.dump({'model':model,'threshold':threshold,'medians':tr[FEATURES].median().to_dict()}, ROOT/'models/failure.joblib')
    return result

def forecast_data():
    df=pd.read_csv(ROOT/'data/raw/ETTh1.csv',parse_dates=['date'])
    x=df.drop(columns='date').copy()
    for lag in [1,6,12,24,48,168]: x[f'OT_lag_{lag}']=df.OT.shift(lag)
    x['OT_mean24']=df.OT.rolling(24).mean()
    x['hour_sin']=np.sin(2*np.pi*df.date.dt.hour/24)
    x['hour_cos']=np.cos(2*np.pi*df.date.dt.hour/24)
    y=df.OT.shift(-24)
    valid=x.notna().all(axis=1)&y.notna()
    return df.loc[valid].reset_index(drop=True),x[valid].reset_index(drop=True),y[valid].reset_index(drop=True)

def train_forecast():
    df,x,y=forecast_data()
    n=len(x); a=int(n*.6); b=int(n*.8)
    tr=np.arange(a-24); va=np.arange(a,b-24); te=np.arange(b,n)
    models={str(alpha):make_pipeline(StandardScaler(),Ridge(alpha=alpha)) for alpha in [1,10,100,1000]}
    val={}
    for name,m in models.items():
        m.fit(x.iloc[tr],y.iloc[tr]);val[name]=float(mean_absolute_error(y.iloc[va],m.predict(x.iloc[va])))
    selected=min(val,key=val.get);m=models[selected]
    pred=m.predict(x.iloc[te]); persistence=df.OT.iloc[te].to_numpy()
    residual=np.abs(y.iloc[va]-m.predict(x.iloc[va])); q=float(np.quantile(residual,.9,method='higher'))
    metrics=lambda p:{'mae_c':float(mean_absolute_error(y.iloc[te],p)),'rmse_c':float(np.sqrt(mean_squared_error(y.iloc[te],p)))}
    result={'provenance':'REAL ETTh1 transformer observations; temperature forecasting, not failure prediction','horizon_hours':24,'selected_model':'StandardScaler + Ridge','alpha':float(selected),'validation_mae':val,'test':metrics(pred),'persistence_baseline':metrics(persistence),'interval_radius_c':q,'test_interval_coverage':float(np.mean(np.abs(y.iloc[te]-pred)<=q)), 'split':{k:{'rows':len(ix),'first_origin':str(df.date.iloc[ix[0]]),'last_origin':str(df.date.iloc[ix[-1]])} for k,ix in [('train',tr),('validation',va),('test',te)]},'embargo_hours':24}
    joblib.dump(m,ROOT/'models/temperature.joblib')
    trace=[{'date':str(df.date.iloc[i]+pd.Timedelta(hours=24)),'actual':round(float(y.iloc[i]),2),'predicted':round(float(p),2),'persistence':round(float(df.OT.iloc[i]),2),'lower':round(float(p-q),2),'upper':round(float(p+q),2)} for i,p in zip(te[-168:],pred[-168:])]
    (ROOT/'models/forecast_trace.json').write_text(json.dumps(trace))
    return result

if __name__=='__main__':
    (ROOT/'models').mkdir(exist_ok=True);(ROOT/'data').mkdir(exist_ok=True)
    result={'failure':train_failure(),'temperature':train_forecast()}
    (ROOT/'models/metrics.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
