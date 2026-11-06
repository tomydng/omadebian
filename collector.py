#!/usr/bin/python3
"""Read account quota without model calls. Only display-safe data is emitted."""
from __future__ import annotations

import argparse
import concurrent.futures
import copy
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import selectors
import shutil
import signal
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

NAMES = {'claude': 'Claude Code', 'codex': 'Codex'}
MESSAGES = {
    'auth': 'Sign in again to read your remaining quota.',
    'missing': 'Sign in with the CLI to show your quota.',
    'offline': 'Could not refresh. Check your connection and try again.',
    'limited': 'Usage checks are temporarily rate limited. Retrying later.',
    'unavailable': 'This account does not report subscription quota.',
    'error': 'Could not read usage data. Try refreshing again.',
}
_processes: set[subprocess.Popen] = set()
_process_lock = threading.Lock()
_cancelled = threading.Event()


def object_or_empty(value):
    return value if isinstance(value, dict) else {}


def read_json(path):
    try:
        return object_or_empty(json.loads(path.read_text()))
    except (OSError, ValueError):
        return {}


def remaining(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value) or value < 0:
        return None
    return round(max(0.0, 100.0-value), 6)


def reset_time(value):
    try:
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)) and math.isfinite(value):
            return int(value) if 0 < value < 10**11 else None
        if isinstance(value, str):
            return int(datetime.fromisoformat(value.replace('Z', '+00:00')).replace(tzinfo=timezone.utc).timestamp())
    except (ValueError, OverflowError, OSError):
        pass
    return None


def window(key, label, used, reset=None):
    left = remaining(used)
    return {'id': key, 'label': label, 'remaining': left, 'resetsAt': reset_time(reset)} if left is not None else None


def claude_windows(payload):
    payload = object_or_empty(payload)
    result = []
    for key, label in [('five_hour', 'Session'), ('seven_day', 'Weekly')]:
        bucket = object_or_empty(payload.get(key))
        row = window(key, label, bucket.get('utilization'), bucket.get('resets_at'))
        if row:
            result.append(row)
    models = set()
    for entry in payload.get('limits') or []:
        entry = object_or_empty(entry)
        model = object_or_empty(object_or_empty(entry.get('scope')).get('model'))
        name = str(model.get('display_name') or model.get('id') or '')[:60]
        kind = str(entry.get('kind') or '')
        period = 'Weekly' if 'week' in kind else 'Session' if 'hour' in kind else 'Monthly' if 'month' in kind else kind
        identity = (name.lower(), period)
        if not name or identity in models:
            continue
        row = window('model:'+name+':'+kind, name+' · '+period, entry.get('percent'), entry.get('resets_at'))
        if row:
            result.append(row)
            models.add(identity)
    for model in ('opus', 'sonnet'):
        if any(model in name and period == 'Weekly' for name, period in models):
            continue
        bucket = object_or_empty(payload.get('seven_day_'+model))
        row = window('seven_day_'+model, model.title()+' · Weekly', bucket.get('utilization'), bucket.get('resets_at'))
        if row:
            result.append(row)
    return result


def codex_windows(payload):
    payload = object_or_empty(payload)
    buckets = object_or_empty(payload.get('rateLimitsByLimitId'))
    if not buckets:
        buckets = {'codex': object_or_empty(payload.get('rateLimits'))}
    result = []
    for bucket_id, raw_bucket in buckets.items():
        bucket = object_or_empty(raw_bucket)
        prefix = '' if bucket_id == 'codex' or len(buckets) == 1 else str(bucket.get('limitName') or bucket_id)[:60]+' · '
        for key in ('primary', 'secondary'):
            item = object_or_empty(bucket.get(key))
            minutes = item.get('windowDurationMins')
            label = 'Weekly' if isinstance(minutes, (int, float)) and minutes >= 10080 else 'Session'
            row = window(str(bucket_id)+':'+key, prefix+label, item.get('usedPercent'), item.get('resetsAt'))
            if row:
                result.append(row)
    return result


def failure(provider, status, retry_after=0):
    result = {'id': provider, 'name': NAMES[provider], 'plan': '', 'status': status,
              'message': MESSAGES.get(status, MESSAGES['error']), 'windows': [], 'fetchedAt': None}
    if retry_after:
        result['_retryAfter'] = min(86400, max(60, retry_after))
    return result


def success(provider, plan, windows):
    return {'id': provider, 'name': NAMES[provider], 'plan': str(plan)[:60], 'status': 'ok',
            'message': '', 'windows': windows, 'fetchedAt': int(time.time()), 'stale': False}


def claude_home():
    return Path(os.environ.get('CLAUDE_CONFIG_DIR') or Path.home()/'.claude').expanduser()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_claude():
    oauth = object_or_empty(read_json(claude_home()/'.credentials.json').get('claudeAiOauth'))
    token = os.environ.get('CLAUDE_CODE_OAUTH_TOKEN') or oauth.get('accessToken')
    if not isinstance(token, str) or not token:
        return failure('claude', 'missing')
    expiry = oauth.get('expiresAt')
    if not os.environ.get('CLAUDE_CODE_OAUTH_TOKEN') and isinstance(expiry, (int, float)) and expiry < time.time()*1000:
        return failure('claude', 'auth')
    request = urllib.request.Request('https://api.anthropic.com/api/oauth/usage', headers={
        'Authorization': 'Bearer '+token, 'anthropic-beta': 'oauth-2025-04-20', 'Accept': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=12) as response:
            payload = json.loads(response.read(1048577))
        windows = claude_windows(payload)
        plan = str(oauth.get('subscriptionType') or '').title()
        tier = str(oauth.get('rateLimitTier') or '')
        for multiplier in ('20x', '5x'):
            if multiplier in tier:
                plan += ' '+multiplier
                break
        return success('claude', plan, windows) if windows else failure('claude', 'unavailable')
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            return failure('claude', 'auth')
        if error.code == 429:
            retry = error.headers.get('Retry-After', '')
            return failure('claude', 'limited', int(retry) if retry.isdigit() else 300)
        return failure('claude', 'offline')
    except (OSError, ValueError, TypeError):
        return failure('claude', 'offline')


class Rpc:
    def __init__(self, command, timeout):
        self.deadline = time.monotonic()+timeout
        self.buffer = b''
        with _process_lock:
            if _cancelled.is_set():
                raise OSError('Cancelled')
            self.process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                            stderr=subprocess.DEVNULL, start_new_session=True)
            _processes.add(self.process)
        self.selector = selectors.DefaultSelector()
        self.selector.register(self.process.stdout, selectors.EVENT_READ)

    def send(self, value):
        self.process.stdin.write((json.dumps(value)+'\n').encode())
        self.process.stdin.flush()

    def call(self, method, request_id, params=None):
        request = {'id': request_id, 'method': method}
        if params is not None:
            request['params'] = params
        self.send(request)
        while time.monotonic() < self.deadline:
            if b'\n' in self.buffer:
                line, self.buffer = self.buffer.split(b'\n', 1)
                try:
                    message = json.loads(line)
                except ValueError:
                    continue
                if isinstance(message, dict) and message.get('id') == request_id:
                    if 'error' in message:
                        raise ValueError('RPC refused request')
                    return object_or_empty(message.get('result'))
                continue
            if not self.selector.select(max(0, self.deadline-time.monotonic())):
                break
            chunk = os.read(self.process.stdout.fileno(), 65536)
            if not chunk:
                raise OSError('RPC ended')
            self.buffer += chunk
            if len(self.buffer) > 1048576:
                raise ValueError('RPC response too large')
        raise TimeoutError('RPC deadline')

    def close(self):
        self.selector.close()
        try:
            os.killpg(self.process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            self.process.wait(timeout=1)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(self.process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            self.process.wait()
        for stream in (self.process.stdin, self.process.stdout):
            stream.close()
        with _process_lock:
            _processes.discard(self.process)


def find_codex():
    found = shutil.which('codex')
    if found:
        return found
    for path in (Path.home()/'.local/bin/codex', Path.home()/'.npm-global/bin/codex', Path.home()/'.local/share/mise/shims/codex'):
        if os.access(path, os.X_OK):
            return str(path)
    return None


def fetch_codex(command=None, timeout=18):
    if command is None:
        executable = find_codex()
        if not executable:
            return failure('codex', 'missing')
        command = [executable, 'app-server']
    rpc = None
    try:
        rpc = Rpc(command, timeout)
        rpc.call('initialize', 0, {'clientInfo': {'name': 'gnome_agents', 'title': 'Agents for GNOME', 'version': '1.0.0'}})
        rpc.send({'method': 'initialized'})
        account = object_or_empty(rpc.call('account/read', 1, {'refreshToken': False}).get('account'))
        if not account:
            return failure('codex', 'auth')
        if account.get('type') == 'apiKey':
            return failure('codex', 'unavailable')
        payload = rpc.call('account/rateLimits/read', 2)
        windows = codex_windows(payload)
        plan = account.get('planType') or object_or_empty(payload.get('rateLimits')).get('planType') or ''
        return success('codex', str(plan).title(), windows) if windows else failure('codex', 'unavailable')
    except (OSError, ValueError, subprocess.SubprocessError):
        return failure('codex', 'offline')
    finally:
        if rpc:
            rpc.close()


def identity(provider):
    if provider == 'claude':
        data = os.environ.get('CLAUDE_CODE_OAUTH_TOKEN') or json.dumps(read_json(claude_home()/'.credentials.json'), sort_keys=True)
        data = str(claude_home())+'|'+data
    else:
        home = Path(os.environ.get('CODEX_HOME') or Path.home()/'.codex').expanduser()
        data = str(home)+'|'+json.dumps(read_json(home/'auth.json'), sort_keys=True)+'|'+os.environ.get('CODEX_ACCESS_TOKEN', '')
    return hashlib.sha256(data.encode()).hexdigest()


def keep_previous(previous, current, now):
    result = copy.deepcopy(current)
    if previous.get('windows') and current['status'] != 'ok':
        result['windows'] = copy.deepcopy(previous['windows'])
        result['fetchedAt'] = previous.get('fetchedAt')
        result['plan'] = previous.get('plan', '')
        result['stale'] = True
        if result['status'] == 'offline':
            result['status'] = 'stale'
        for item in result['windows']:
            if item.get('resetsAt') and item['resetsAt'] <= now:
                item['remaining'] = None
    return result


def cached_provider(provider, previous, fingerprint, fetch, now, force):
    previous = object_or_empty(previous)
    if previous.get('_identity') != fingerprint:
        previous = {}
    age = now-previous.get('_attemptAt', 0)
    minimum = max(60 if force else 300, previous.get('_retryAfter', 0))
    if previous and 0 <= age < minimum:
        result = copy.deepcopy(previous)
        for item in result.get('windows', []):
            if item.get('resetsAt') and item['resetsAt'] <= now:
                item['remaining'] = None
        return result
    try:
        fresh = fetch()
    except Exception:
        fresh = failure(provider, 'error')
    result = keep_previous(previous, fresh, now)
    result['_identity'] = fingerprint
    result['_attemptAt'] = now
    return result


def write_cache(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, name = tempfile.mkstemp(prefix='quota-', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(data, stream, allow_nan=False)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def public_record(record):
    return {key: value for key, value in record.items() if not key.startswith('_')}


def collect(force=False):
    root = Path(os.environ.get('XDG_CACHE_HOME') or Path.home()/'.cache')/'gnome-agents'
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock_fd = os.open(root/'quota.lock', os.O_CREAT | os.O_RDWR, 0o600)
    with os.fdopen(lock_fd, 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        cache = read_json(root/'quota.json')
        now = int(time.time())
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(cached_provider, name, cache.get(name), identity(name), fetch, now, force)
                       for name, fetch in [('claude', fetch_claude), ('codex', fetch_codex)]]
            providers = [future.result() for future in futures]
        # Codex may refresh its own credentials; bind the cache to that new login.
        for provider in providers:
            provider['_identity'] = identity(provider['id'])
        write_cache(root/'quota.json', {provider['id']: provider for provider in providers})
    return {'updatedAt': now, 'providers': [public_record(provider) for provider in providers]}


def cancel(signum, frame):
    _cancelled.set()
    # The handler must not acquire a thread lock that interrupted code could own.
    for process in tuple(_processes):
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    raise SystemExit(0)


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, cancel)
    signal.signal(signal.SIGINT, cancel)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(collect(args.force), allow_nan=False))
    except Exception:
        print(json.dumps({'updatedAt': int(time.time()), 'providers': [failure(name, 'error') for name in NAMES]}))
