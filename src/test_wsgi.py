"""Deployment adapter integration checks against the actual advisor."""
import json
import unittest
from wsgiref.util import setup_testing_defaults
from wsgi import application


class DeploymentTests(unittest.TestCase):
    def request(self, path, query='', method='GET'):
        env = {}
        setup_testing_defaults(env)
        env.update(PATH_INFO=path, QUERY_STRING=query, REQUEST_METHOD=method)
        response = {}
        def start(status, headers):
            response.update(status=status, headers=dict(headers))
        body = b''.join(application(env, start))
        return response, body

    def test_real_endpoints(self):
        for path in ['/api/health', '/api/metrics', '/api/forecast', '/api/analyze']:
            result, body = self.request(path)
            self.assertEqual(result['status'], '200 OK')
            self.assertTrue(json.loads(body))
            self.assertEqual(result['headers']['Cache-Control'], 'no-store')
        _, body = self.request('/api/analyze', 'wind=85&rain=65&crews=3')
        self.assertEqual(len(json.loads(body)['assets']), 12)

    def test_rejects_bad_queries_and_methods(self):
        for query in ['wind=nan', 'wind=1&wind=2', 'crews=1.5', 'unknown=2', 'rain=']:
            result, _ = self.request('/api/analyze', query)
            self.assertEqual(result['status'], '400 Bad Request')
        result, _ = self.request('/api/analyze', method='POST')
        self.assertEqual(result['status'], '405 Method Not Allowed')
        result, _ = self.request('/models/failure.joblib')
        self.assertEqual(result['status'], '404 Not Found')

    def test_head_health(self):
        result, body = self.request('/api/health', method='HEAD')
        self.assertEqual(result['status'], '200 OK')
        self.assertEqual(body, b'')


if __name__ == '__main__':
    unittest.main(verbosity=2)
