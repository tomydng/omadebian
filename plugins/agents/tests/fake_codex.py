"""Local protocol fixture. It rejects RPC requests sent before initialized."""
import json
import sys

initialized = False
for line in sys.stdin:
    msg = json.loads(line)
    method = msg['method']
    if method == 'initialized':
        initialized = True
        continue
    if method == 'initialize':
        result = {'userAgent': 'test'}
    elif not initialized:
        print(json.dumps({'id': msg['id'], 'error': {'message': 'Not initialized'}}), flush=True)
        continue
    elif method == 'account/read':
        result = {'account': {'type': 'chatgpt', 'planType': 'pro'}}
    else:
        result = {'rateLimits': {'primary': {'usedPercent': 25, 'windowDurationMins': 300, 'resetsAt': 1893456000}}}
    print(json.dumps({'id': msg['id'], 'result': result}), flush=True)
