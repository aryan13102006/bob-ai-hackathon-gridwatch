from bootstrap import ROOT
import unittest, json, threading, urllib.request, urllib.error
from engine import Advisor
from server import create_handler, ThreadingHTTPServer
from train import forecast_data
import pandas as pd

class SystemTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.advisor=Advisor()
    def test_storm_increases_risk(self):
        normal=self.advisor.analyze(20,5,3);storm=self.advisor.analyze(85,65,3)
        self.assertGreater(sum(a['risk'] for a in storm['assets']),sum(a['risk'] for a in normal['assets']))
    def test_crew_capacity_and_skill(self):
        result=self.advisor.analyze(100,90,2)
        lookup={a['id']:a for a in result['assets']}
        for crew in result['crews']:
            jobs=[p for p in result['plan'] if p['crew']==crew['id']]
            self.assertLessEqual(sum(p['duration_hours'] for p in jobs),8)
            for job in jobs:self.assertEqual(lookup[job['asset_id']]['skill'],crew['skill'])
        self.assertGreater(result['summary']['unassigned_jobs'],0)
    def test_no_future_forecast_features(self):
        df,x,y=forecast_data()
        raw=pd.read_csv(ROOT/'data/raw/ETTh1.csv')
        self.assertAlmostEqual(x.iloc[0].OT_lag_24,raw.iloc[144].OT)
        self.assertAlmostEqual(y.iloc[0],raw.iloc[192].OT)
        split=self.advisor.metrics['temperature']['split']
        for left,right in [('train','validation'),('validation','test')]:
            self.assertLess(pd.Timestamp(split[left]['last_origin'])+pd.Timedelta(hours=24),pd.Timestamp(split[right]['first_origin']))
    def test_invalid_inputs(self):
        for args in [(float('nan'),2,3),(10,101,3),(10,2,1.5),(10,2,0)]:
            with self.assertRaises(ValueError):self.advisor.analyze(*args)
    def test_priority_order_and_exposure(self):
        r=self.advisor.analyze();self.assertEqual([a['priority'] for a in r['assets']],sorted([a['priority'] for a in r['assets']],reverse=True))
        self.assertEqual(r['summary']['expected_customer_exposure'],sum(a['expected_customer_exposure'] for a in r['areas']))
    def test_api_and_static(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),create_handler(self.advisor))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            for path in ['/','/app.js','/style.css','/api/metrics','/api/forecast','/api/analyze']:
                with urllib.request.urlopen(base+path) as r:self.assertEqual(r.status,200)
            with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(base+'/api/analyze?wind=nan')
            self.assertEqual(e.exception.code,400)
            with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(base+'/../models/failure.joblib')
            self.assertEqual(e.exception.code,404)
        finally:server.shutdown();server.server_close()

if __name__=='__main__':unittest.main(verbosity=2)
