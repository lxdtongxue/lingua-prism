"""Lingua Prism token accounts. Python stdlib + SQLite, behind same-origin Nginx."""
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import defaultdict, deque
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

DATA = Path(os.environ.get('LP_DATA_DIR', '/var/lib/lingua-prism'))
SESSION_AGE = 30 * 86400
MAX_BODY = 256 * 1024
COOKIE = 'lp_session'
TOKEN = re.compile(r'^[A-Za-z0-9_-]{8,32}$')
BUCKETS = {'tall-results', 'decision-state', 'known-languages'}


def initialize():
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    key = DATA / 'secret'
    if not key.exists():
        fd = os.open(key, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as f:
            f.write(secrets.token_bytes(32))
    with connect() as db:
        db.executescript('''
          PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL,
            profile TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',
            revision INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL,
            updated INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS sessions (
            hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires INTEGER NOT NULL);
          CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
        ''')
    os.chmod(DATA / 'state.sqlite3', 0o600)
    return key.read_bytes()


class Connection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()


def connect():
    db = sqlite3.connect(DATA / 'state.sqlite3', timeout=10, factory=Connection)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db


def clean_json(value, depth=0):
    if depth > 16:
        raise ValueError('invalid_data')
    if value is None or isinstance(value, bool):
        return
    if isinstance(value, (int, float)):
        if not math.isfinite(value) or abs(value) > 1e15:
            raise ValueError('invalid_data')
    elif isinstance(value, str):
        if len(value) > 2000:
            raise ValueError('invalid_data')
    elif isinstance(value, list):
        if len(value) > 512:
            raise ValueError('invalid_data')
        for item in value:
            clean_json(item, depth + 1)
    elif isinstance(value, dict):
        if len(value) > 256:
            raise ValueError('invalid_data')
        for key, item in value.items():
            if key in ('__proto__', 'constructor', 'prototype') or len(key) > 100:
                raise ValueError('invalid_data')
            clean_json(item, depth + 1)
    else:
        raise ValueError('invalid_data')


def validate_data(data):
    clean_json(data)
    if not isinstance(data, dict) or set(data) - BUCKETS:
        raise ValueError('invalid_data')
    for name, value in data.items():
        if not isinstance(value, dict):
            raise ValueError('invalid_data')
        if name == 'known-languages':
            if set(value) != {'l1', 'l2'} or any(
                not isinstance(v, list) or len(v) > 1 or any(not isinstance(x, str) or not re.fullmatch(r'[a-z]{2,8}', x) for x in v)
                for v in value.values()
            ):
                raise ValueError('invalid_data')
        elif name == 'tall-results':
            if set(value) - {'VL', 'SD', 'LA'}:
                raise ValueError('invalid_data')
            for sub, result in value.items():
                maximum = 20 if sub == 'VL' else 30
                if not isinstance(result, dict) or type(result.get('score')) is not int or not 0 <= result['score'] <= maximum or result.get('max') != maximum or not isinstance(result.get('trials'), list) or len(result['trials']) > maximum:
                    raise ValueError('invalid_data')
                if not isinstance(result.get('placeholder'), bool) or not isinstance(result.get('at'), (int, float)):
                    raise ValueError('invalid_data')
        elif name == 'decision-state':
            if value.get('tier') not in ('basic', 'sponsor') or not isinstance(value.get('answers'), dict):
                raise ValueError('invalid_data')
            for field in ('sliders', 'anchors'):
                weights = value.get(field, {})
                if not isinstance(weights, dict) or any(type(v) not in (int, float) or not 0 <= v <= 100 for v in weights.values()):
                    raise ValueError('invalid_data')


def validate_profile(profile):
    if not isinstance(profile, dict) or set(profile) != {'nickname', 'avatar'}:
        raise ValueError('invalid_profile')
    if not isinstance(profile['nickname'], str) or not 1 <= len(profile['nickname'].strip()) <= 20 or type(profile['avatar']) is not int or not 0 <= profile['avatar'] < 8:
        raise ValueError('invalid_profile')
    return {'nickname': profile['nickname'].strip(), 'avatar': profile['avatar']}


class Server(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, address):
        self.secret = initialize()
        self.attempts = defaultdict(deque)
        self.rate_lock = threading.Lock()
        super().__init__(address, Handler)


class Handler(BaseHTTPRequestHandler):
    server_version = 'LinguaPrism'

    def log_message(self, *_):
        pass  # Never log tokens, cookies, request bodies or client addresses.

    def reply(self, status, body, cookie=None):
        raw = json.dumps(body, ensure_ascii=False, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(raw)))
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(raw)

    def cookie(self, token='', age=SESSION_AGE):
        secure = '; Secure' if self.headers.get('X-Forwarded-Proto') == 'https' else ''
        return f'{COOKIE}={token}; Path=/api/; Max-Age={age}; HttpOnly; SameSite=Strict{secure}'

    def body(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            raise ValueError('invalid_data')
        if not 0 < length <= MAX_BODY or self.headers.get_content_type() != 'application/json':
            raise ValueError('invalid_data')
        value = json.loads(self.rfile.read(length))
        if not isinstance(value, dict):
            raise ValueError('invalid_data')
        return value

    def session(self, db):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
            token = cookie[COOKIE].value
        except (KeyError, ValueError):
            return None
        digest = hashlib.sha256(token.encode()).hexdigest()
        row = db.execute('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.hash=? AND s.expires>?', (digest, int(time.time()))).fetchone()
        return row

    @staticmethod
    def state(row):
        return {'id': row['id'], 'profile': json.loads(row['profile']), 'data': json.loads(row['data']), 'revision': row['revision']}

    def handle_request(self):
        path = urlsplit(self.path).path.rstrip('/')
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            return self.reply(403, {'error': 'origin'})
        if path == '/api/health' and self.command == 'GET':
            with connect() as db:
                db.execute('SELECT 1')
            return self.reply(200, {'ok': True})
        if path == '/api/session' and self.command == 'POST':
            ip = self.headers.get('X-Real-IP', self.client_address[0])
            now = time.time()
            with self.server.rate_lock:
                # Bound memory even when clients send many different addresses.
                for key in list(self.server.attempts):
                    if not self.server.attempts[key] or self.server.attempts[key][-1] < now - 600:
                        del self.server.attempts[key]
                for key, limit, window in [(ip, 15, 600), ('global', 300, 60)]:
                    times = self.server.attempts[key]
                    while times and times[0] < now - window:
                        times.popleft()
                    if len(times) >= limit:
                        return self.reply(429, {'error': 'rate_limit'})
                self.server.attempts[ip].append(now)
                self.server.attempts['global'].append(now)
            body = self.body()
            token = body.get('token', '')
            if not isinstance(token, str) or not TOKEN.fullmatch(token):
                raise ValueError('bad_token')
            digest = hmac.new(self.server.secret, token.encode(), hashlib.sha256).hexdigest()
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                db.execute('DELETE FROM sessions WHERE expires<=?', (int(now),))
                row = db.execute('SELECT * FROM users WHERE token_hash=?', (digest,)).fetchone()
                created = row is None
                if created:
                    if db.execute('SELECT COUNT(*) FROM users').fetchone()[0] >= 10000:
                        return self.reply(503, {'error': 'capacity'})
                    uid = secrets.token_hex(16)
                    profile = validate_profile(body.get('profile', {'nickname': 'Lingua', 'avatar': 0}))
                    db.execute('INSERT INTO users(id,token_hash,profile,created,updated) VALUES(?,?,?,?,?)', (uid, digest, json.dumps(profile), int(now), int(now)))
                    row = db.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
                session = secrets.token_urlsafe(32)
                db.execute('INSERT INTO sessions VALUES(?,?,?)', (hashlib.sha256(session.encode()).hexdigest(), row['id'], int(now) + SESSION_AGE))
            return self.reply(200, {**self.state(row), 'created': created}, self.cookie(session))
        with connect() as db:
            row = self.session(db)
            if row is None:
                return self.reply(401, {'error': 'signed_out'})
            if path == '/api/state' and self.command == 'GET':
                return self.reply(200, self.state(row))
            if path == '/api/state' and self.command == 'PUT':
                body = self.body()
                validate_data(body.get('data'))
                profile = validate_profile(body.get('profile'))
                revision = body.get('revision')
                if type(revision) is not int or revision < 0:
                    raise ValueError('invalid_data')
                db.execute('BEGIN IMMEDIATE')
                row = self.session(db)
                if row is None:
                    return self.reply(401, {'error': 'signed_out'})
                if revision != row['revision']:
                    return self.reply(409, self.state(row))
                db.execute('UPDATE users SET profile=?,data=?,revision=revision+1,updated=? WHERE id=?', (json.dumps(profile), json.dumps(body['data']), int(time.time()), row['id']))
                row = db.execute('SELECT * FROM users WHERE id=?', (row['id'],)).fetchone()
                db.commit()
                return self.reply(200, self.state(row))
            if path == '/api/session' and self.command == 'DELETE':
                cookie = SimpleCookie(self.headers.get('Cookie', ''))
                digest = hashlib.sha256(cookie[COOKIE].value.encode()).hexdigest()
                db.execute('DELETE FROM sessions WHERE hash=?', (digest,))
                db.commit()
                return self.reply(200, {'ok': True}, self.cookie(age=0))
            if path == '/api/account' and self.command == 'DELETE':
                db.execute('DELETE FROM users WHERE id=?', (row['id'],))
                db.commit()
                return self.reply(200, {'ok': True}, self.cookie(age=0))
        return self.reply(404, {'error': 'not_found'})

    def dispatch(self):
        try:
            self.handle_request()
        except (ValueError, TypeError, json.JSONDecodeError):
            self.reply(400, {'error': 'invalid_data'})
        except (sqlite3.Error, OSError):
            self.reply(503, {'error': 'unavailable'})

    do_GET = dispatch
    do_POST = dispatch
    do_PUT = dispatch
    do_DELETE = dispatch


if __name__ == '__main__':
    Server(('127.0.0.1', int(os.environ.get('LP_PORT', '8787')))).serve_forever()
