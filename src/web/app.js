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
function render(){if(!state)return;document.body.dataset.view=view;const titles={overview:'Your grid, in perspective.',plan:'A plan for every priority.',evidence:'The evidence behind the model.'};$('subtitle').textContent=({overview:'Know where to look. Decide what comes next.',plan:'Turn equipment risk into an actionable maintenance queue.',evidence:'Measured performance. Transparent limitations.'})[view];$('workspace-hero').classList.toggle('hidden',view==='evidence');$('title').textContent=titles[view];$('content').innerHTML=({overview,plan,evidence})[view]();renderScenarioAsset();document.querySelectorAll('[data-asset]').forEach(el=>{el.onclick=()=>detail(el.dataset.asset);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(el.dataset.asset)}}});if($('export'))$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gridwatch-plan.json';a.click();URL.revokeObjectURL(url)}}
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
