from bootstrap import ROOT
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json, argparse
from engine import Advisor
from residual_life import ResidualLifeStore, add_residual_life

def create_handler(advisor, residual_life_store=None):
    residual_life_store = residual_life_store or ResidualLifeStore()
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            url=urlparse(self.path)
            try:
                q=parse_qs(url.query)
                if url.path=='/api/analyze':
                    result=advisor.analyze(float(q.get('wind',[45])[0]),float(q.get('rain',[25])[0]),float(q.get('crews',[3])[0]),float(q.get('load',[70])[0]))
                    add_residual_life(result,residual_life_store)
                elif url.path=='/api/metrics': result=advisor.metrics
                elif url.path=='/api/forecast': result=json.loads((ROOT/'models/forecast_trace.json').read_text())
                elif url.path=='/api/health': result={'status':'ok','models_loaded':True,'residual_life_database':'configured' if residual_life_store.configured else 'not-configured'}
                elif url.path in ['/','/app.js','/style.css','/design.css','/ios.css','/grid-substation.png','/grid-substation-enhanced.png','/grid-substation-editorial.png','/grid-engineers.png']:
                    name={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/design.css':'design.css','/ios.css':'ios.css','/grid-substation.png':'grid-substation.png','/grid-substation-enhanced.png':'grid-substation-enhanced.png','/grid-substation-editorial.png':'grid-substation-editorial.png','/grid-engineers.png':'grid-engineers.png'}[url.path]
                    payload=(ROOT/'src/web'/name).read_bytes()
                    self.send_response(200);self.send_header('Content-Type',{'index.html':'text/html','app.js':'text/javascript','style.css':'text/css','design.css':'text/css','ios.css':'text/css','grid-substation.png':'image/png','grid-substation-enhanced.png':'image/png','grid-substation-editorial.png':'image/png','grid-engineers.png':'image/png'}[name]+'; charset=utf-8');self.end_headers();self.wfile.write(payload);return
                else: self.send_error(404);return
                payload=json.dumps(result,allow_nan=False).encode()
                self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(payload)
            except (ValueError,TypeError) as error:
                self.send_response(400);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'error':str(error)}).encode())
    return Handler

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),create_handler(Advisor()))
    print(f'GridWatch: http://127.0.0.1:{args.port}',flush=True)
    server.serve_forever()
