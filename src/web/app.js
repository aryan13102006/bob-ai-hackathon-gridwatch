let state,metrics,trace,view='overview',liveTimer,runInFlight=false,telemetryPhase=Date.now()/40000,lastAlertKey='',dismissedAlertKey='',currentMode='normal',selectedAssetId='TX-001';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString(),pct=n=>(n*100).toFixed(1)+'%';
const scenarioInputIds=['wind','rain','load','crews'];
const liveModes={
  normal:{number:'1',kicker:'NORMAL ENVELOPE',title:'Stable operation',description:'Routine synthetic load and weather variation.',load:[62,12],wind:[25,15],rain:[12,10]},
  above:{number:'2',kicker:'ABOVE AVERAGE',title:'Limit time in this range',description:'Elevated stress. Equipment should not remain here for long.',load:[88,10],wind:[55,15],rain:[38,15]},
  extreme:{number:'3',kicker:'EXTREME CONDITION',title:'Crew response required',description:'Harmful operating conditions. Review and mobilize a qualified crew.',load:[122,10],wind:[96,18],rain:[78,18]}
};
async function get(url){let r;try{r=await fetch(url,{signal:AbortSignal.timeout(70000)})}catch(e){throw Error('The demo backend is starting or unavailable. Wait a moment, then click Analyze scenario to retry.')}const isJSON=(r.headers.get('content-type')||'').includes('application/json');const d=isJSON?await r.json():{};if(!r.ok||!isJSON)throw Error(d.error||'The demo backend is waking up. Please retry shortly.');return d}
const stat=(label,value,note)=>`<div class="stat"><span class="muted">${label}</span><strong>${value}</strong><span class="muted">${note}</span></div>`;
function diagnoseTransformer(asset){
  const s=asset.sensors,issues=[];
  const high=(title,value,unit,warn,critical,action)=>{if(value>=warn)issues.push({title,value:`${value}${unit}`,guide:`Target below ${warn}${unit}`,severity:value>=critical?'critical':'warning',action})};
  high('Transformer overload',s.load_pct,'%',95,110,'Reduce loading and verify cooling capacity.');
  high('High winding temperature',s.temperature_c,'°C',82,90,'Inspect cooling, connections and thermal hotspots.');
  high('Excess vibration',s.vibration_mm_s,' mm/s',2.5,4,'Inspect mounting, core and mechanical looseness.');
  high('Partial discharge activity',s.partial_discharge_pc,' pC',25,40,'Perform an electrical insulation inspection.');
  if(s.oil_quality_pct<=75)issues.push({title:'Degraded oil quality',value:`${s.oil_quality_pct}%`,guide:'Target above 75%',severity:s.oil_quality_pct<=60?'critical':'warning',action:'Sample the oil and inspect insulation condition.'});
  high('High incident history',s.incidents_90d,' incidents',40,60,'Review recent events and recurring fault patterns.');
  high('Severe wind exposure',s.wind_forecast_kmh,' km/h',70,100,'Inspect access, lines and external equipment.');
  high('Heavy rainfall exposure',s.rain_forecast_mm,' mm',50,80,'Check drainage, bushings and moisture ingress.');
  high('Age-related attention',s.age_years,' years',30,40,'Review maintenance history and end-of-life plan.');
  if(asset.risk>=state.threshold)issues.push({title:'Model risk above alert threshold',value:pct(asset.risk),guide:`Alert threshold ${pct(state.threshold)}`,severity:asset.risk>=.8?'critical':'warning',action:`Review the proposed ${asset.task.toLowerCase()}.`});
  return issues.sort((a,b)=>(a.severity==='critical'?0:1)-(b.severity==='critical'?0:1));
}
function residualLife(asset){
  if(asset.residual_life){
    const life=asset.residual_life,f=life.factors;
    return {value:life.percentage,label:life.label,age:f.age_profile_pct,incidents:f.incident_history_pct,insulation:f.insulation_health_pct};
  }
  const s=asset.sensors,clamp=value=>Math.max(0,Math.min(100,value));
  const age=clamp(100-(s.age_years/45)*100);
  const incidents=clamp(100-s.incidents_90d*1.1);
  const insulation=clamp((s.oil_quality_pct+clamp(100-s.partial_discharge_pc*1.4))/2);
  const value=Math.round(age*.45+incidents*.30+insulation*.25);
  return {value,age:Math.round(age),incidents:Math.round(incidents),insulation:Math.round(insulation),label:value>=70?'Healthy reserve':value>=45?'Reduced reserve':'Limited reserve'};
}
function focusedTransformer(){
  const asset=state.assets.find(a=>a.id===selectedAssetId)||state.assets[0];selectedAssetId=asset.id;
  const level=currentMode==='extreme'?'emergency':currentMode==='above'?'elevated':asset.risk>=.8?'critical':asset.alert?'attention':'stable';
  const label={emergency:'Extreme condition',elevated:'Above average',critical:'Critical',attention:'Needs attention',stable:'Stable'}[level];
  const readings=[['Transformer load',asset.sensors.load_pct,'%'],['Temperature',asset.sensors.temperature_c,'°C'],['Vibration',asset.sensors.vibration_mm_s,'mm/s'],['Partial discharge',asset.sensors.partial_discharge_pc,'pC'],['Oil quality',asset.sensors.oil_quality_pct,'%'],['Wind forecast',asset.sensors.wind_forecast_kmh,'km/h'],['Rain forecast',asset.sensors.rain_forecast_mm,'mm'],['Incidents / 90d',asset.sensors.incidents_90d,''],['Asset age',asset.sensors.age_years,'years']];
  const issues=diagnoseTransformer(asset);
  const life=residualLife(asset);
  const issueMarkup=issues.length?`<div class="issue-grid">${issues.map(issue=>`<article class="issue ${issue.severity}"><i aria-hidden="true">${issue.severity==='critical'?'!':'↑'}</i><div><span>${issue.severity}</span><h4>${issue.title}</h4><p><strong>${issue.value}</strong> · ${issue.guide}</p><small>${issue.action}</small></div></article>`).join('')}</div>`:'<div class="all-clear"><i>✓</i><div><strong>No screening thresholds breached</strong><p>Current synthetic readings are inside the displayed operating guides.</p></div></div>';
  return `<section class="focus-panel ${level}" aria-label="Selected transformer live conditions"><div class="focus-head"><div><span class="focus-kicker">SELECTED TRANSFORMER / LIVE SYNTHETIC DATA</span><h2>${asset.name}</h2><p>${asset.id} · ${asset.area} area</p></div><span class="single-focus-badge">Showing this transformer only</span></div><div class="focus-summary"><div class="risk-orb"><span>24h risk</span><strong>${pct(asset.risk)}</strong><em>${label}</em></div><div class="focus-impact"><span>${fmt(asset.customers)} customers</span><span>${asset.critical_sites} critical sites</span><span>${pct(asset.backup_fraction)} backup coverage</span><b>${asset.task}</b></div></div><div class="focus-readings">${readings.map(([name,value,unit])=>`<div><span>${name}</span><strong>${value}<small>${unit}</small></strong></div>`).join('')}</div><div class="diagnostics"><div class="diagnostics-head"><div><span>CONDITION DIAGNOSIS</span><h3>What needs attention</h3></div><b>${issues.length} ${issues.length===1?'issue':'issues'} detected</b></div>${issueMarkup}<p class="diagnostic-note">Rule-based screening of synthetic readings. Confirm any concern with field measurements and qualified personnel.</p></div><div class="residual-life"><div class="life-gauge" role="img" aria-label="Estimated residual life ${life.value} percent" style="--life:${life.value}"><div><strong>${life.value}%</strong><span>residual life</span></div></div><div class="life-copy"><span class="focus-kicker">HISTORY-BASED SYNTHETIC ESTIMATE</span><h3>Estimated residual life</h3><p>${life.label}. Calculated for ${asset.name} from its age, recent incident record and insulation condition.</p><div class="life-factors"><span><b>${life.age}%</b>Age profile</span><span><b>${life.incidents}%</b>Incident history</span><span><b>${life.insulation}%</b>Insulation health</span></div><small>This is a screening indicator, not an engineering remaining-useful-life prediction. Confirm with inspection, testing and maintenance records.</small></div></div></section>`;
}
function renderScenarioAsset(){
  if(!state)return;const asset=state.assets.find(a=>a.id===selectedAssetId)||state.assets[0];selectedAssetId=asset.id;
  $('live-transformer-select').value=asset.id;$('live-risk').textContent=pct(asset.risk);$('live-load').textContent=`${asset.sensors.load_pct}%`;$('live-temperature').textContent=`${asset.sensors.temperature_c}°C`;$('live-vibration').textContent=`${asset.sensors.vibration_mm_s} mm/s`;
}
function overview(){return `<div class="results-heading"><h2>Scenario results</h2><span>Ranked by risk and grid impact</span></div>${focusedTransformer()}<div class="stats">${stat('Equipment requiring attention',state.summary.flagged_assets+'/12','24-hour synthetic failure risk')}${stat('Expected customer exposure',fmt(state.summary.expected_customer_exposure),'Risk-weighted scenario estimate')}${stat('Jobs awaiting a crew',state.summary.unassigned_jobs,'Capacity or skill gaps')}</div><div class="layout"><section class="panel"><div class="panel-head"><h2>Equipment risk map</h2><span class="muted">Fictional service territory</span></div><svg class="map" viewBox="0 0 820 430" role="img" aria-label="Schematic of twelve fictional grid assets"><defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#dce9ec"/></pattern></defs><rect width="820" height="430" fill="url(#grid)"/><path d="M40 380 Q230 300 285 210 T780 35" fill="none" stroke="#cfe4e7" stroke-width="30"/><g stroke="#7facb3" stroke-width="2" fill="none"><path d="M120 95H675M145 220H700M120 345H675M120 95L145 220L120 345M305 95L330 220L305 345M490 95L515 220L490 345M675 95L700 220L675 345"/></g>${state.assets.map(a=>`<g><circle data-asset="${a.id}" tabindex="0" role="button" aria-label="${a.name}: ${pct(a.risk)} risk" cx="${a.x}" cy="${a.y}" r="${11+a.risk*13}" fill="${a.alert?'#d27d43':'#18a6a4'}"/><text x="${a.x}" y="${a.y+39}" text-anchor="middle" fill="#466b78" font-size="13">${a.name}</text></g>`).join('')}</svg><div class="legend">Orange: above model alert threshold (${pct(state.threshold)}) · Teal: below threshold</div></section><section class="panel"><h2>Your priority watchlist</h2><p class="muted">Risk × customer exposure, with critical-site weighting</p>${state.assets.slice(0,5).map(a=>`<button class="asset" data-asset="${a.id}"><b>${a.name}</b><span class="risk">${pct(a.risk)}</span><small>${a.id} · ${fmt(a.customers)} customers · ${a.critical_sites} critical sites</small></button>`).join('')}</section></div><section class="panel"><h2>Area exposure</h2><div class="crew-grid">${state.areas.map(a=>`<div><h3>${a.area}</h3><b>${fmt(a.expected_customer_exposure)}</b><span class="muted"> expected customer exposure</span><div class="bar"><span style="width:${100*a.expected_customer_exposure/Math.max(...state.areas.map(x=>x.expected_customer_exposure))}%"></span></div></div>`).join('')}</div></section>`}
function plan(){return `<div class="field-banner"><img src="/grid-engineers.png" alt="AI-generated illustration of utility engineers inspecting equipment"><div><p class="eyebrow">FIELD READINESS / AI-GENERATED ILLUSTRATION</p><h2>The right crew. The right priority.</h2><p>Review the queue, resolve capacity gaps and position your teams.</p></div></div><section class="panel"><div class="panel-head"><h2>Proposed maintenance queue</h2><button id="export">Export plan JSON</button></div><p class="muted">8-hour shifts. Each job includes a 1-hour travel allowance. Assignments respect crew skill and available hours.</p><div class="table-wrap"><table><thead><tr><th>Priority</th><th>Asset / action</th><th>Crew</th><th>Shift window</th><th>Status</th></tr></thead><tbody>${state.plan.map((p,i)=>`<tr><td>${i+1}</td><td><b>${p.asset}</b><br>${p.action}</td><td>${p.crew}</td><td>${p.start_hour===null?'—':`${p.start_hour}–${p.start_hour+p.duration_hours}h`}</td><td><span class="tag ${p.crew==='Unassigned'?'':'good'}">${p.status}</span></td></tr>`).join('')||'<tr><td colspan="5">No assets exceed the alert threshold in this scenario.</td></tr>'}</tbody></table></div></section><section class="panel"><h2>Crew pre-positioning</h2><div class="crew-grid">${state.crews.map(t=>`<div class="crew"><b>${t.id}</b><p>${t.skill} specialist<br>Stage: ${t.staging_area||'Remain at depot'}<br>${t.remaining_hours}h unallocated</p></div>`).join('')}</div></section><p class="muted">Staging uses the area of each crew's first priority job. It does not account for road closures or safe access. Operator review required.</p>`}
function evidence(){const f=metrics.failure,t=metrics.temperature;let values=trace.flatMap(p=>[p.actual,p.predicted,p.lower,p.upper]),lo=Math.min(...values)-2,hi=Math.max(...values)+2;const points=key=>trace.map((p,i)=>`${50+i*840/(trace.length-1)},${220-(p[key]-lo)*175/(hi-lo)}`).join(' ');return `<section class="panel"><h2>Real transformer data / temperature forecast</h2><p class="muted">ETTh1 · predict oil temperature 24 hours ahead · chronological test set · 24-hour boundary embargo</p><div class="stats">${stat('Model MAE',t.test.mae_c.toFixed(2)+' °C','Mean absolute error on unseen dates')}${stat('Persistence MAE',t.persistence_baseline.mae_c.toFixed(2)+' °C','Baseline: current temperature persists')}${stat('Interval coverage',pct(t.test_interval_coverage),'Nominal 90%, validation residual interval')}</div><svg class="chart" viewBox="0 0 930 270" role="img" aria-label="Actual and predicted temperature for the final seven test days"><line x1="50" x2="890" y1="220" y2="220" stroke="#adbdc5"/><polygon points="${points('upper')} ${trace.map((p,i)=>`${50+i*840/(trace.length-1)},${220-(p.lower-lo)*175/(hi-lo)}`).reverse().join(' ')}" fill="#ddf2f1"/><polyline points="${points('actual')}" fill="none" stroke="#173c50" stroke-width="2"/><polyline points="${points('predicted')}" fill="none" stroke="#00a7a2" stroke-width="2"/><text x="5" y="50" font-size="12">${hi.toFixed(0)}°C</text><text x="5" y="220" font-size="12">${lo.toFixed(0)}°C</text><text x="50" y="250" font-size="12">${trace[0].date.slice(0,10)}</text><text x="790" y="250" font-size="12">${trace.at(-1).date.slice(0,10)}</text></svg><p class="legend">Navy: actual · Teal: model · Shading: validation residual interval. These are historical observations, not a live forecast.</p></section><section class="panel"><h2>Synthetic failure model / separate benchmark</h2><p>${f.selected_model} · probability of a simulated event in the next 24 hours. Results measure recovery of the simulator's relationships only.</p><div class="table-wrap"><table><thead><tr><th>Test metric</th><th>Trained model</th><th>Threshold baseline</th></tr></thead><tbody>${['average_precision','roc_auc','brier','precision','recall','f1'].map(k=>`<tr><td>${k.replaceAll('_',' ')}</td><td>${f.test[k].toFixed(3)}</td><td>${f.threshold_baseline[k].toFixed(3)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Test prevalence: ${pct(f.test.prevalence)} · ${fmt(f.test.rows)} samples · alert threshold chosen on validation data. Brier score: lower is better. All other displayed metrics: higher is better.</p><p>Field deployment needs timestamped utility failures, archived weather forecasts and asset histories, followed by validation on unseen assets and later periods.</p></section>`}
function detail(id){const a=state.assets.find(a=>a.id===id);$('detail-body').innerHTML=`<p class="eyebrow">${a.id} / ${a.area}</p><h2>${a.name}</h2><h1>${pct(a.risk)} <span class="muted">synthetic failure risk</span></h1><p>${fmt(a.customers)} customers · ${a.critical_sites} critical sites · ${pct(a.backup_fraction)} backup coverage</p><h3>Largest positive feature sensitivities</h3><p class="muted">Change in model output when one feature is replaced with its training median. This is sensitivity, not proof of a physical cause.</p><table>${a.evidence.map(e=>`<tr><td>${e.feature.replaceAll('_',' ')}</td><td>${e.value}</td><td>${e.risk_delta>=0?'+':''}${(100*e.risk_delta).toFixed(1)} points</td></tr>`).join('')}</table><h3>Sensor snapshot</h3><table>${Object.entries(a.sensors).map(([k,v])=>`<tr><td>${k.replaceAll('_',' ')}</td><td>${v}</td></tr>`).join('')}</table><p>Proposed action: ${a.task}</p>`;$('detail').showModal()}
let simSelectedId='';
function simulation(){
  // persist selection across re-renders; default to highest-risk asset on first load
  if(!simSelectedId||!state.assets.find(a=>a.id===simSelectedId)) simSelectedId=state.assets[0].id;
  const opts=state.assets.map(a=>`<option value="${a.id}"${a.id===simSelectedId?' selected':''}>${a.name} (${a.id})</option>`).join('');
  function tintFor(r){return r>=0.65?'sim-tint-red':r>=0.35?'sim-tint-orange':'sim-tint-green'}
  function wrapFor(r){return r>=0.65?'sim-wrap-red':r>=0.35?'sim-wrap-orange':'sim-wrap-green'}
  function labelFor(r){return r>=0.65?{level:'CRITICAL',color:'#b91c1c'}:r>=0.35?{level:'ELEVATED',color:'#b45309'}:{level:'NORMAL',color:'#166534'}}
  function statusBlocks(a){
    const r=a.risk,s=a.sensors,ev=a.evidence,lbl=labelFor(r);
    const block1=`<div class="sim-block sim-block-${lbl.level.toLowerCase()}"><p class="sim-block-label">Operating Condition</p><p class="sim-block-title" style="color:${lbl.color}">${lbl.level}</p><p>${s.temperature_c>85?'Oil temperature is critically elevated, indicating thermal runaway risk.':s.temperature_c>65?'Temperature is running warm; continued monitoring advised.':'Thermal levels are within safe operating range.'} ${s.vibration_mm_s>3?'Vibration exceeds safe limits — possible mechanical loosening or core fault.':s.vibration_mm_s>1.8?'Mild vibration detected; may indicate early mechanical wear.':'Mechanical vibration is stable and within normal bounds.'} Current failure probability: <strong>${pct(r)}</strong>.</p></div>`;
    const block2=`<div class="sim-block"><p class="sim-block-label">Sensor Snapshot</p><p class="sim-block-title">Readings at a glance</p><p>${s.partial_discharge_pc>25?'Partial discharge is high, pointing to insulation degradation.':'Partial discharge is within acceptable range.'} ${s.oil_quality_pct<75?'Dielectric oil quality has dropped below the 75% threshold — an electrical inspection is warranted.':'Oil quality is adequate for continued operation.'} ${s.load_pct>95?'The unit is operating near full rated capacity.':s.load_pct>75?'Load is moderately high.':'Load is well within rated capacity.'} Asset age: <strong>${s.age_years.toFixed(1)} years</strong> · past incidents (90d): <strong>${s.incidents_90d}</strong>.</p></div>`;
    const topEv=ev[0]?`The dominant driver is <strong>${ev[0].feature.replaceAll('_',' ')}</strong> (value ${ev[0].value}, +${(100*ev[0].risk_delta).toFixed(1)} risk pts).`:'';
    const block3=`<div class="sim-block"><p class="sim-block-label">Weather Exposure & Action</p><p class="sim-block-title">Scenario: ${state.weather.wind_kmh} km/h wind · ${state.weather.rain_mm} mm rain</p><p>${state.weather.wind_kmh>70?'Wind is severe and significantly elevates line and structural stress.':state.weather.wind_kmh>45?'Wind is moderately elevated.':'Wind loading is low.'} ${state.weather.rain_mm>50?'Rainfall is heavy, increasing moisture ingress risk.':state.weather.rain_mm>25?'Moderate rainfall in scenario.':'Rainfall is low.'} ${topEv} Recommended action: <strong>${a.task}</strong> · serving <strong>${fmt(a.customers)}</strong> customers${a.critical_sites>0?' including '+a.critical_sites+' critical site(s)':''}.</p></div>`;
    return block1+block2+block3;
  }
  function buildSVG(a){
    const r=a.risk,s=a.sensors,tint=tintFor(r),dur=r>=0.65?'0.7s':r>=0.35?'1.2s':'2.2s',arcs=r>=0.65?3:r>=0.35?2:1;
    const arcPaths=Array.from({length:arcs},(_,i)=>{const x=160+i*28,dy=i%2===0?-18:18;return `<path class="sim-arc" d="M${x} 118 Q${x+12} ${118+dy} ${x+24} 118" fill="none" stroke-width="3" stroke-linecap="round" style="animation-delay:${i*0.22}s;animation-duration:${dur}"/>`;}).join('');
    const loadBar=Math.round((s.load_pct/140)*60),tempFill=Math.round(Math.max(0,Math.min(1,(s.temperature_c-30)/95))*80);
    return `<svg class="sim-svg ${tint}" viewBox="0 0 340 300" role="img" aria-label="Transformer simulation for ${a.name}"><defs><radialGradient id="sg-${a.id}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="currentColor" stop-opacity="0.28"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient><filter id="sb-${a.id}"><feGaussianBlur stdDeviation="5"/></filter></defs><ellipse cx="170" cy="165" rx="130" ry="110" fill="url(#sg-${a.id})" filter="url(#sb-${a.id})"/><rect x="60" y="245" width="220" height="12" rx="6" fill="currentColor" opacity="0.25"/><rect class="sim-tank" x="95" y="125" width="150" height="120" rx="10"/><rect x="100" y="130" width="28" height="110" rx="5" fill="white" opacity="0.12"/><rect x="68" y="143" width="13" height="20" rx="3" fill="currentColor" opacity="0.6"/><rect x="68" y="170" width="13" height="20" rx="3" fill="currentColor" opacity="0.6"/><rect x="68" y="197" width="13" height="20" rx="3" fill="currentColor" opacity="0.6"/><rect x="259" y="143" width="13" height="20" rx="3" fill="currentColor" opacity="0.6"/><rect x="259" y="170" width="13" height="20" rx="3" fill="currentColor" opacity="0.6"/><rect x="259" y="197" width="13" height="20" rx="3" fill="currentColor" opacity="0.6"/><rect x="129" y="88" width="15" height="40" rx="5" fill="currentColor" opacity="0.75"/><rect x="162" y="83" width="15" height="45" rx="5" fill="currentColor" opacity="0.75"/><rect x="195" y="88" width="15" height="40" rx="5" fill="currentColor" opacity="0.75"/><circle cx="136" cy="85" r="8" fill="currentColor" opacity="0.9"/><circle cx="169" cy="80" r="8" fill="currentColor" opacity="0.9"/><circle cx="202" cy="85" r="8" fill="currentColor" opacity="0.9"/><line x1="136" y1="77" x2="136" y2="48" stroke="currentColor" stroke-width="3" opacity="0.6"/><line x1="169" y1="72" x2="169" y2="43" stroke="currentColor" stroke-width="3" opacity="0.6"/><line x1="202" y1="77" x2="202" y2="48" stroke="currentColor" stroke-width="3" opacity="0.6"/>${arcPaths}<rect x="285" y="128" width="14" height="104" rx="4" fill="currentColor" opacity="0.18"/><rect x="285" y="${232-tempFill}" width="14" height="${tempFill}" rx="4" fill="currentColor" opacity="0.8"/><text x="292" y="123" text-anchor="middle" font-size="10" font-weight="600" fill="currentColor" opacity="0.9">°C</text><rect x="41" y="128" width="14" height="104" rx="4" fill="currentColor" opacity="0.18"/><rect x="41" y="${232-loadBar}" width="14" height="${loadBar}" rx="4" fill="currentColor" opacity="0.8"/><text x="48" y="123" text-anchor="middle" font-size="10" font-weight="600" fill="currentColor" opacity="0.9">LD</text><circle cx="170" cy="185" r="54" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" class="sim-pulse" style="animation-duration:${dur}"/><circle cx="170" cy="185" r="70" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.15" class="sim-pulse" style="animation-duration:${dur};animation-delay:0.3s"/><text x="170" y="181" text-anchor="middle" font-size="23" font-weight="800" fill="currentColor" opacity="1">${pct(r)}</text><text x="170" y="199" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" opacity="0.75" letter-spacing="1">FAILURE RISK</text><text x="170" y="268" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" opacity="0.9">${a.name}</text><text x="170" y="283" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65">${a.id} · ${a.area} area</text></svg>`;
  }
  function refreshSim(id){
    simSelectedId=id;
    const a=state.assets.find(x=>x.id===id)||state.assets[0],lbl=labelFor(a.risk);
    $('sim-visual').innerHTML=buildSVG(a);
    $('sim-visual').className=`sim-visual-wrap ${wrapFor(a.risk)}`;
    $('sim-info').innerHTML=statusBlocks(a);
    const pill=document.querySelector('.sim-status-pill');
    pill.textContent=`${lbl.level} — ${pct(a.risk)} risk · threshold ${pct(state.threshold)}`;
    pill.style.setProperty('--pill-color',lbl.color);
  }
  function buildView(id){
    const a=state.assets.find(x=>x.id===id)||state.assets[0],lbl=labelFor(a.risk);
    return `<div class="sim-shell"><div class="sim-header"><div><p class="eyebrow">TRANSFORMER SIMULATION / LIVE SCENARIO</p><h2>Equipment State Monitor</h2><p class="muted">Select any asset to visualise its current simulated state under the active weather scenario.</p></div><label class="sim-select-wrap" for="sim-pick">Asset<select id="sim-pick" class="sim-select">${opts}</select></label></div><div class="sim-layout"><div class="sim-visual-col"><div class="sim-visual-wrap ${wrapFor(a.risk)}" id="sim-visual">${buildSVG(a)}</div><div class="sim-status-pill" style="--pill-color:${lbl.color}">${lbl.level} — ${pct(a.risk)} risk · threshold ${pct(state.threshold)}</div></div><div class="sim-info-col" id="sim-info">${statusBlocks(a)}</div></div><p class="muted sim-foot">All asset names, sensor readings and failure probabilities are synthetic simulation fixtures. Weather is an operator-entered scenario.</p></div>`;
  }
  setTimeout(()=>{const pick=$('sim-pick');if(pick)pick.onchange=()=>refreshSim(pick.value);},0);
  return buildView(simSelectedId);
}
function render(){if(!state)return;document.body.dataset.view=view;const titles={overview:'Your grid, in perspective.',plan:'A plan for every priority.',evidence:'The evidence behind the model.',sim:'Transformer State Monitor.'};$('subtitle').textContent=({overview:'Know where to look. Decide what comes next.',plan:'Turn equipment risk into an actionable maintenance queue.',evidence:'Measured performance. Transparent limitations.',sim:'Live simulated state for every asset in your scenario.'})[view];$('workspace-hero').classList.toggle('hidden',view==='evidence'||view==='sim');$('title').textContent=titles[view];$('content').innerHTML=({overview,plan,evidence,sim:simulation})[view]();renderScenarioAsset();document.querySelectorAll('[data-asset]').forEach(el=>{el.onclick=()=>detail(el.dataset.asset);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(el.dataset.asset)}}});if($('export'))$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gridwatch-plan.json';a.click();URL.revokeObjectURL(url)}}
function conditionNotice(){
  const monitored=state.assets.find(a=>a.id===selectedAssetId)||state.assets[0];
  const hottest=monitored.sensors.temperature_c;
  const load=monitored.sensors.load_pct;
  let level='';
  if(currentMode==='extreme') level='emergency';
  else if(currentMode==='above') level='warning';
  else if(load>=110||hottest>=90||monitored.risk>=.8) level='critical';
  else if(load>=95||hottest>=82||monitored.risk>=.65) level='warning';
  if(!level){$('condition-alert').hidden=true;lastAlertKey='';dismissedAlertKey='';return}
  const key=`${level}:${monitored.id}`;
  const title=level==='emergency'?'Immediate crew response advised':level==='critical'?'Critical transformer condition':'Elevated transformer stress';
  const message=level==='emergency'?`${monitored.name} is at ${pct(monitored.risk)} synthetic risk. Send a qualified crew to review the proposed response immediately. No crew has been dispatched automatically.`:`${monitored.name} is at ${pct(monitored.risk)} synthetic risk. Load ${Math.round(load)}%, highest temperature ${hottest.toFixed(1)}°C.`;
  $('condition-alert').className=`condition-alert ${level}`;
  $('alert-level').textContent=level==='emergency'?'Extreme · crew action':level==='critical'?'Critical condition':'Above average · time limited';
  $('alert-title').textContent=title;
  $('alert-message').textContent=message;
  $('alert-action').hidden=level!=='emergency';
  if(key!==dismissedAlertKey)$('condition-alert').hidden=false;
  if(key!==lastAlertKey&&'Notification' in window&&Notification.permission==='granted') new Notification(`GridWatch: ${title}`,{body:message,tag:'gridwatch-condition'});
  lastAlertKey=key;
}
function setLiveFeed(active){
  clearInterval(liveTimer);liveTimer=null;
  $('live-toggle').setAttribute('aria-pressed',String(active));
  $('live-toggle').textContent=active?'Pause live feed':'Resume live feed';
  if(!active)return;
  liveTimer=setInterval(()=>{if(!runInFlight){advanceSyntheticTelemetry();run('live')}},8000);
}
function advanceSyntheticTelemetry(){
  telemetryPhase+=.22;
  const mode=liveModes[currentMode];
  $('load').value=Math.round(mode.load[0]+mode.load[1]*Math.sin(telemetryPhase));
  $('wind').value=Math.round(mode.wind[0]+mode.wind[1]*Math.sin(telemetryPhase*.73+1.1));
  $('rain').value=Math.round(mode.rain[0]+mode.rain[1]*Math.sin(telemetryPhase*.51-1.4));
}
function setMode(mode){
  if(!liveModes[mode])return;
  currentMode=mode;const config=liveModes[mode];
  $('mode-dial').dataset.mode=mode;$('mode-number').textContent=config.number;
  $('mode-kicker').textContent=config.kicker;$('mode-title').textContent=config.title;$('mode-description').textContent=config.description;
  document.querySelectorAll('.mode-choice').forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-checked',String(active))});
  dismissedAlertKey='';setLiveFeed(true);advanceSyntheticTelemetry();run('live');
}
async function enableBrowserAlerts(){
  if(!('Notification' in window)){$('alerts-toggle').textContent='In-app alerts on';return}
  const permission=await Notification.requestPermission();
  $('alerts-toggle').textContent=permission==='granted'?'Browser alerts on':'In-app alerts on';
}
async function run(source='manual'){
  if(runInFlight)return;
  runInFlight=true;
  const button=$('run');
  button.disabled=true;
  scenarioInputIds.forEach(id=>$(id).disabled=true);
  button.textContent='Analyzing…';
  $('scenario-status').textContent=metrics?'Running model…':'Connecting to backend…';
  $('error').textContent='';
  try{
    if(!metrics||!trace){[metrics,trace]=await Promise.all([get('/api/metrics'),get('/api/forecast')])}
    const params=new URLSearchParams(scenarioInputIds.map(id=>[id,$(id).value]));
    state=await get(`/api/analyze?${params}`);
    render();
    conditionNotice();
    $('telemetry-time').textContent=`Last synthetic reading · ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
    $('scenario-status').textContent='Analysis up to date';
    $('scenario-status').classList.remove('pending-note');
  }catch(e){
    $('error').textContent=e.message;
    $('scenario-status').textContent='Analysis not updated';
  }finally{
    button.disabled=false;
    scenarioInputIds.forEach(id=>$(id).disabled=false);
    button.textContent='Refresh now ↗';
    runInFlight=false;
  }
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>(x.classList.toggle('active',x===b),x.setAttribute('aria-current',x===b?'page':'false')));render()});
$('run').onclick=()=>run('manual');
$('live-toggle').onclick=()=>{const active=$('live-toggle').getAttribute('aria-pressed')!=='true';setLiveFeed(active);if(active&&!runInFlight){advanceSyntheticTelemetry();run('live')}};
$('alerts-toggle').onclick=enableBrowserAlerts;
$('live-transformer-select').onchange=e=>{selectedAssetId=e.target.value;if(state){dismissedAlertKey='';render();conditionNotice()}};
$('alert-close').onclick=()=>{dismissedAlertKey=lastAlertKey;$('condition-alert').hidden=true};
$('alert-action').onclick=()=>{document.querySelector('[data-view="plan"]').click();$('condition-alert').hidden=true};
document.querySelectorAll('.mode-choice').forEach(button=>button.onclick=()=>setMode(button.dataset.mode));
$('close').onclick=()=>$('detail').close();
run('live').finally(()=>setLiveFeed(true));

scenarioInputIds.forEach(id=>$(id).addEventListener('input',()=>{setLiveFeed(false);$('scenario-status').textContent='Changes not applied';$('scenario-status').classList.add('pending-note')}));
