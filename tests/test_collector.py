import json
import os
import stat
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import collector as c


class QuotaTests(unittest.TestCase):
    def test_claude_remaining_not_used_and_zero_is_known(self):
        windows = c.claude_windows({
            'five_hour': {'utilization': 28.5, 'resets_at': '2030-01-01T00:00:00Z'},
            'seven_day': {'utilization': 100, 'resets_at': None},
        })
        self.assertEqual([w['remaining'] for w in windows], [71.5, 0])
        self.assertEqual(windows[0]['resetsAt'], 1893456000)

    def test_unknown_never_becomes_full(self):
        for value in [None, True, False, '12', float('nan'), float('inf'), -2]:
            with self.subTest(value=value):
                self.assertEqual(c.claude_windows({'five_hour': {'utilization': value}}), [])

    def test_over_quota_is_empty_and_missing_is_absent(self):
        self.assertEqual(c.claude_windows({'five_hour': {'utilization': 120}})[0]['remaining'], 0)
        self.assertEqual(c.claude_windows({'five_hour': None}), [])

    def test_claude_model_scopes_and_legacy_deduplicated(self):
        result = c.claude_windows({
            'seven_day_opus': {'utilization': 10},
            'limits': [{'kind': 'weekly_scoped', 'scope': {'model': {'id': 'opus', 'display_name': 'Opus'}}, 'percent': 20}],
        })
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['remaining'], 80)
        self.assertEqual(result[0]['label'], 'Opus · Weekly')

    def test_codex_all_buckets_no_legacy_duplicate(self):
        bucket = {'limitId': 'codex', 'primary': {'usedPercent': 25, 'windowDurationMins': 300, 'resetsAt': 1893456000},
                  'secondary': {'usedPercent': 60, 'windowDurationMins': 10080}}
        other = {'limitId': 'model', 'limitName': 'GPT', 'primary': {'usedPercent': 5, 'windowDurationMins': 300}}
        result = c.codex_windows({'rateLimits': bucket, 'rateLimitsByLimitId': {'codex': bucket, 'model': other}})
        self.assertEqual(len(result), 3)
        self.assertEqual([w['remaining'] for w in result], [75, 40, 95])
        self.assertEqual(result[0]['label'], 'Session')
        self.assertEqual(result[1]['label'], 'Weekly')
        self.assertIn('GPT', result[2]['label'])

    def test_codex_legacy_bucket(self):
        self.assertEqual(c.codex_windows({'rateLimits': {'primary': {'usedPercent': 0, 'windowDurationMins': 60}}})[0]['remaining'], 100)

    def test_cached_expired_windows_are_unknown(self):
        previous = {'id': 'claude', 'name': 'Claude Code', 'status': 'ok', 'plan': 'Pro', 'fetchedAt': 100,
                    'windows': [{'id': 'five_hour', 'remaining': 70, 'resetsAt': 150}, {'id': 'seven_day', 'remaining': 20, 'resetsAt': 500}]}
        result = c.keep_previous(previous, c.failure('claude', 'offline'), now=200)
        self.assertEqual(result['status'], 'stale')
        self.assertIsNone(result['windows'][0]['remaining'])
        self.assertEqual(result['windows'][1]['remaining'], 20)
        self.assertEqual(result['fetchedAt'], 100)
        self.assertEqual(previous['windows'][0]['remaining'], 70)

    def test_auth_failure_stays_actionable_with_stale_data(self):
        previous = {'windows': [{'remaining': 30, 'resetsAt': 900}], 'fetchedAt': 100, 'plan': 'Pro'}
        result = c.keep_previous(previous, c.failure('claude', 'auth'), now=200)
        self.assertEqual(result['status'], 'auth')
        self.assertTrue(result['stale'])


class CacheTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.cache = Path(self.tmp.name)/'cache.json'

    def test_private_atomic_cache(self):
        c.write_cache(self.cache, {'hello': 'world'})
        self.assertEqual(json.loads(self.cache.read_text()), {'hello': 'world'})
        self.assertEqual(stat.S_IMODE(self.cache.stat().st_mode), 0o600)
        self.assertEqual(list(self.cache.parent.glob('*.tmp')), [])

    def test_refresh_floor_and_identity_change(self):
        calls = []
        def fetch():
            calls.append(1)
            return {'id': 'claude', 'name': 'Claude Code', 'plan': 'Pro', 'status': 'ok', 'windows': [{'id': 'five_hour', 'remaining': 40, 'resetsAt': 3000}]}
        c.cached_provider('claude', {}, 'user-a', fetch, 1000, False)
        previous = c.cached_provider('claude', {}, 'user-a', fetch, 1000, False)
        self.assertEqual(len(calls), 2)
        self.assertEqual(c.cached_provider('claude', previous, 'user-a', fetch, 1010, True)['_attemptAt'], 1000)
        self.assertEqual(len(calls), 2)
        c.cached_provider('claude', previous, 'user-b', fetch, 1010, False)
        self.assertEqual(len(calls), 3)

    def test_rate_limit_backoff_even_when_forced(self):
        calls = []
        def fetch():
            calls.append(1)
            return c.failure('claude', 'limited', retry_after=600)
        previous = c.cached_provider('claude', {}, 'a', fetch, 1000, False)
        result = c.cached_provider('claude', previous, 'a', fetch, 1200, True)
        self.assertEqual(len(calls), 1)
        self.assertEqual(result['status'], 'limited')

    def test_changed_account_does_not_keep_old_quota(self):
        previous = {'_identity': 'old', '_attemptAt': 1, 'fetchedAt': 1, 'status': 'ok', 'windows': [{'remaining': 50, 'resetsAt': 9999}]}
        result = c.cached_provider('claude', previous, 'new', lambda: c.failure('claude', 'auth'), 1000, False)
        self.assertEqual(result['windows'], [])

    def test_public_output_omits_private_cache_fields(self):
        self.assertEqual(c.public_record({'id': 'claude', '_identity': 'secret', '_attemptAt': 10}), {'id': 'claude'})


class ProtocolTests(unittest.TestCase):
    def test_codex_initializes_and_reads_quota(self):
        result = c.fetch_codex([sys.executable, str(Path(__file__).with_name('fake_codex.py'))], timeout=2)
        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['plan'], 'Pro')
        self.assertEqual(result['windows'][0]['remaining'], 75)

    def test_codex_timeout_is_bounded_and_sanitized(self):
        start = time.monotonic()
        result = c.fetch_codex([sys.executable, '-c', 'import time;time.sleep(60)'], timeout=0.15)
        self.assertLess(time.monotonic()-start, 2)
        self.assertEqual(result['status'], 'offline')
        self.assertNotIn('Traceback', json.dumps(result))

    def test_claude_expired_credentials_are_not_refreshed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'.credentials.json'
            original = json.dumps({'claudeAiOauth': {'accessToken': 'do-not-print-me', 'expiresAt': 1}})
            path.write_text(original)
            with patch.dict(os.environ, {'CLAUDE_CONFIG_DIR': tmp, 'CLAUDE_CODE_OAUTH_TOKEN': ''}):
                result = c.fetch_claude()
            self.assertEqual(result['status'], 'auth')
            self.assertNotIn('do-not-print-me', json.dumps(result))
            self.assertEqual(path.read_text(), original)


if __name__ == '__main__':
    unittest.main()
