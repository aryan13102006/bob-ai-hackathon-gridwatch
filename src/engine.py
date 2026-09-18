from bootstrap import ROOT
import json, math
import pandas as pd
import joblib
from train import FEATURES

NAMES=['Riverbank','Central Hospital','North Industrial','University','Old Town','Airport','East Residential','Railway','South Market','Waterworks','West Junction','Hilltop']
LIMITS={'wind':(0,120),'rain':(0,100),'crews':(1,12),'load':(20,140)}

class Advisor:
    def __init__(self):
        self.bundle=joblib.load(ROOT/'models/failure.joblib')
        self.metrics=json.loads((ROOT/'models/metrics.json').read_text())
        self.history=pd.read_csv(ROOT/'data/synthetic_history.csv')

    def analyze(self,wind=45,rain=25,crews=3,load=70):
        for key,v in [('wind',wind),('rain',rain),('crews',crews),('load',load)]:
            lo,hi=LIMITS[key]
            if not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v) or not lo<=v<=hi: raise ValueError(f'{key} must be between {lo} and {hi}')
        if int(crews)!=crews: raise ValueError('crews must be an integer')
        frame=self.history[self.history.day==359].head(12).copy()
        # All locations, service areas, weather and topology are fictional demo fixtures.
        frame['wind_forecast_kmh']=wind
        frame['rain_forecast_mm']=rain
        # The entered load applies to every fictional transformer. The synthetic
        # data generator uses 0.27 C per load percentage point for temperature.
        frame['temperature_c']+=.27*(load-frame['load_pct'])
        frame['load_pct']=load
        p=self.bundle['model'].predict_proba(frame[FEATURES])[:,1]
        assets=[]
        for index,(_,row) in enumerate(frame.iterrows()):
            customers=1500+((index*1739)%12000);critical=2 if index in [1,9] else (1 if index in [5,7] else 0)
            backup=.5 if index in [3,5] else 0
            impact=customers*(1-backup)+critical*5000
            evidence=[]
            for feature in FEATURES:
                ref=frame.iloc[[index]][FEATURES].copy();ref[feature]=self.bundle['medians'][feature]
                delta=float(p[index]-self.bundle['model'].predict_proba(ref)[0,1])
                evidence.append({'feature':feature,'value':round(float(row[feature]),2),'risk_delta':round(delta,4)})
            evidence=sorted(evidence,key=lambda e:e['risk_delta'],reverse=True)[:3]
            task='Electrical inspection' if row.partial_discharge_pc>25 or row.oil_quality_pct<75 else 'Line and access inspection'
            assets.append({'id':f'TX-{index+1:03}','name':NAMES[index],'area':['North','Central','East','South'][index%4], 'x':120+(index%4)*185+(index//4%2)*25,'y':95+(index//4)*125,'risk':round(float(p[index]),4),'priority':round(float(p[index]*impact),1),'customers':customers,'critical_sites':critical,'backup_fraction':backup,'impact_weight':impact,'evidence':evidence,'sensors':{f:round(float(row[f]),2) for f in FEATURES},'task':task,'hours':4 if task=='Electrical inspection' else 2,'skill':'electrical' if task=='Electrical inspection' else 'line','alert':bool(p[index]>=self.bundle['threshold'])})
        assets.sort(key=lambda a:a['priority'],reverse=True)
        teams=[{'id':f'Crew {i+1}','skill':'electrical' if i%2==0 else 'line','remaining_hours':8,'staging_area':None} for i in range(int(crews))]
        plan=[]
        for a in assets:
            if not a['alert']: continue
            eligible=[t for t in teams if t['skill']==a['skill'] and t['remaining_hours']>=a['hours']+1]
            team=max(eligible,key=lambda t:t['remaining_hours']) if eligible else None
            start=8-team['remaining_hours'] if team else None
            if team:
                team['remaining_hours']-=a['hours']+1
                if team['staging_area'] is None: team['staging_area']=a['area']
            plan.append({'asset_id':a['id'],'asset':a['name'],'action':a['task'],'priority':a['priority'],'crew':team['id'] if team else 'Unassigned','start_hour':start,'duration_hours':a['hours']+1,'status':'Proposed' if team else 'Capacity / skill gap'})
        areas=[]
        for area in ['North','Central','East','South']:
            rows=[a for a in assets if a['area']==area]
            areas.append({'area':area,'expected_customer_exposure':round(sum(a['risk']*a['customers']*(1-a['backup_fraction']) for a in rows)), 'highest_asset_risk':max(a['risk'] for a in rows)})
        return {'mode':'Synthetic planning scenario','horizon_hours':24,'weather':{'wind_kmh':wind,'rain_mm':rain,'source':'Operator-entered scenario, not a live forecast'},'load_pct':load,'assets':assets,'areas':areas,'crews':teams,'plan':plan,'threshold':self.bundle['threshold'],'limitations':['Synthetic failure model: no field validation.','The shared load and related temperature adjustment are synthetic, not measured transformer readings.','Area exposure assumes disjoint fictional customer groups, not a network power-flow calculation.','Each job includes a fixed one-hour travel allowance; no route optimization.','Plans require operator review and do not dispatch crews.'],'summary':{'flagged_assets':sum(a['alert'] for a in assets),'expected_customer_exposure':sum(a['expected_customer_exposure'] for a in areas),'unassigned_jobs':sum(p['crew']=='Unassigned' for p in plan)}}
