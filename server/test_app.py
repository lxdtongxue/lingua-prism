import http.client
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest

_tmp = tempfile.TemporaryDirectory()
os.environ['LP_DATA_DIR'] = _tmp.name
import app


class Accounts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = app.Server(('127.0.0.1', 0))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        _tmp.cleanup()

    def request(self, path, method='GET', body=None, cookie='', origin=None):
        c = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        headers = {'Cookie': cookie}
        if body is not None: headers['Content-Type'] = 'application/json'
        if origin: headers['Origin'] = origin
        c.request(method, '/api' + path, json.dumps(body) if body is not None else None, headers)
        r = c.getresponse()
        result = r.status, json.loads(r.read()), (r.getheader('Set-Cookie') or '').split(';')[0]
        c.close()
        return result

    def test_lifecycle_and_isolation(self):
        self.assertEqual(self.request('/state')[0], 401)
        status, a, cookie = self.request('/session', 'POST', {'token': 'TestToken_123'})
        self.assertEqual(status, 200)
        self.assertTrue(a['created'])
        _, b, other_device = self.request('/session', 'POST', {'token': 'TestToken_123'})
        self.assertEqual(a['id'], b['id'])
        _, stranger, stranger_cookie = self.request('/session', 'POST', {'token': 'Different_123'})
        self.assertNotEqual(a['id'], stranger['id'])
        payload = {'revision': 0, 'profile': {'nickname': '测试', 'avatar': 3}, 'data': {'known-languages': {'l1': ['zh'], 'l2': ['en']}}}
        self.assertEqual(self.request('/state', 'PUT', payload, cookie)[0], 200)
        self.assertEqual(self.request('/state', cookie=other_device)[1]['data'], payload['data'])
        self.assertEqual(self.request('/state', cookie=stranger_cookie)[1]['data'], {})
        conflict = self.request('/state', 'PUT', payload, other_device)
        self.assertEqual(conflict[0], 409)
        self.assertEqual(conflict[1]['revision'], 1)
        with app.connect() as db:
            self.assertEqual(json.loads(db.execute('SELECT data FROM users WHERE id=?', (a['id'],)).fetchone()[0]), payload['data'])
        self.assertEqual(self.request('/session', 'DELETE', cookie=cookie)[0], 200)
        self.assertEqual(self.request('/state', cookie=cookie)[0], 401)
        self.assertEqual(self.request('/account', 'DELETE', cookie=other_device)[0], 200)
        self.assertEqual(self.request('/state', cookie=other_device)[0], 401)
        self.assertEqual(self.request('/state', cookie=stranger_cookie)[0], 200)

    def test_validation_and_storage(self):
        self.assertEqual(self.request('/session', 'POST', {'token': 'short'})[0], 400)
        self.assertEqual(self.request('/session', 'POST', {'token': 'ValidToken_456'}, origin='http://other.invalid')[0], 403)
        _, _, cookie = self.request('/session', 'POST', {'token': 'ValidToken_456'})
        for data in [{'unknown': {}}, {'known-languages': {'l1': ['zh', 'en'], 'l2': []}}, {'decision-state': {'tier': 'bad', 'answers': {}}}, {'__proto__': {}}]:
            self.assertEqual(self.request('/state', 'PUT', {'revision': 0, 'profile': {'nickname': 'Test', 'avatar': 0}, 'data': data}, cookie)[0], 400)
        self.assertEqual(Path(_tmp.name, 'secret').stat().st_mode & 0o777, 0o600)
        self.assertEqual(Path(_tmp.name, 'state.sqlite3').stat().st_mode & 0o777, 0o600)
        with app.connect() as db:
            rows = db.execute('SELECT token_hash FROM users').fetchall()
            self.assertTrue(all(len(row[0]) == 64 and 'ValidToken' not in row[0] for row in rows))

    def test_rate_limit(self):
        for _ in range(16): result = self.request('/session', 'POST', {'token': 'short'})
        self.assertEqual(result[0], 429)
        self.server.attempts.clear()


if __name__ == '__main__': unittest.main()
