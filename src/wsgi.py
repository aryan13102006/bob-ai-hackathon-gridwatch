"""Read-only public demo API. Run behind Gunicorn on Render."""
from bootstrap import ROOT
import json
import logging
from functools import lru_cache
from urllib.parse import parse_qs

from engine import Advisor
from residual_life import ResidualLifeStore, add_residual_life


@lru_cache(maxsize=1)
def get_advisor():
    return Advisor()


@lru_cache(maxsize=1)
def get_residual_life_store():
    return ResidualLifeStore()


def application(environ, start_response):
    headers = [('Content-Type', 'application/json; charset=utf-8'),
               ('Cache-Control', 'no-store'),
               ('X-Content-Type-Options', 'nosniff')]
    status = '200 OK'
    try:
        method = environ.get('REQUEST_METHOD', 'GET')
        path = environ.get('PATH_INFO', '/')
        query = environ.get('QUERY_STRING', '')
        if method not in ('GET', 'HEAD'):
            status, data = '405 Method Not Allowed', {'error': 'Only GET and HEAD are supported'}
            headers.append(('Allow', 'GET, HEAD'))
        elif path not in ('/api/health', '/api/analyze', '/api/forecast', '/api/metrics'):
            status, data = '404 Not Found', {'error': 'Endpoint not found'}
        elif len(query) > 1024:
            status, data = '414 URI Too Long', {'error': 'Query string too long'}
        else:
            advisor = get_advisor()
            if path == '/api/health':
                data = {'status': 'ok', 'models_loaded': True, 'mode': 'synthetic-demo',
                        'residual_life_database': 'configured' if get_residual_life_store().configured else 'not-configured'}
            elif path == '/api/metrics':
                data = advisor.metrics
            elif path == '/api/forecast':
                data = json.loads((ROOT / 'models/forecast_trace.json').read_text())
            else:
                params = parse_qs(query, keep_blank_values=True, max_num_fields=4)
                if set(params) - {'wind', 'rain', 'crews', 'load'} or any(len(v) != 1 for v in params.values()):
                    raise ValueError('Use wind, rain, crews and load once each')
                data = advisor.analyze(float(params.get('wind', ['45'])[0]),
                                       float(params.get('rain', ['25'])[0]),
                                       float(params.get('crews', ['3'])[0]),
                                       float(params.get('load', ['70'])[0]))
                add_residual_life(data, get_residual_life_store())
    except (ValueError, TypeError) as error:
        status, data = '400 Bad Request', {'error': str(error)}
    except Exception:
        logging.exception('GridWatch API request failed')
        status, data = '503 Service Unavailable', {'error': 'The demo service is temporarily unavailable. Please retry.'}
    payload = json.dumps(data, allow_nan=False).encode('utf-8')
    headers.append(('Content-Length', str(len(payload))))
    start_response(status, headers)
    return [b'' if environ.get('REQUEST_METHOD') == 'HEAD' else payload]
