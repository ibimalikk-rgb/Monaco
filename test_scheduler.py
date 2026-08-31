import os
import sys
import types
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch


for name in ("ai", "ocr", "telegram_bot", "utils"):
    module = types.ModuleType(name)
    sys.modules[name] = module

sys.modules["ai"].analyze_meet = lambda caption, ocr: {}
sys.modules["ocr"].extract_text_from_bytes = lambda value: ""
sys.modules["telegram_bot"].send_meet = lambda *args, **kwargs: None
sys.modules["utils"].download_image = lambda url: b""
sys.modules["utils"].perceptual_dhash = lambda value: "0" * 16
sys.modules["utils"].is_meet_post = lambda caption: False

os.environ.setdefault("INSTAGRAM_USERNAME", "test-account")

import main


class SchedulerTests(unittest.TestCase):
    def test_success_delay_uses_base_interval_and_jitter(self):
        with patch.object(main, "ACCOUNT_SCRAPE_INTERVAL_MINUTES", 75):
            self.assertEqual(main.successful_delay_minutes(7), 82)

    def test_rate_limit_backoff_quadruples_instaloader_wait(self):
        with (
            patch.object(main, "RATE_LIMIT_BACKOFF_MINUTES", 44),
            patch.object(main, "RATE_LIMIT_MAX_BACKOFF_MINUTES", 360),
        ):
            self.assertEqual(main.rate_limit_delay_minutes(1, 0), 44)
            self.assertEqual(main.rate_limit_delay_minutes(2, 0), 88)
            self.assertEqual(main.rate_limit_delay_minutes(3, 0), 176)
            self.assertEqual(main.rate_limit_delay_minutes(4, 0), 352)
            self.assertEqual(main.rate_limit_delay_minutes(5, 0), 360)

    def test_rate_limit_cooldown_pauses_and_restaggars_every_account(self):
        now = datetime(2026, 8, 31, tzinfo=timezone.utc)
        schedule = {
            "alpha": (now, 1),
            "bravo": (now + timedelta(minutes=5), 0),
            "charlie": (now + timedelta(minutes=10), 0),
        }
        with (
            patch.object(main, "ACCOUNT_STAGGER_MINUTES", 10),
            patch.object(main, "set_scrape_schedule") as save,
        ):
            main.apply_global_cooldown(
                schedule, "alpha", now + timedelta(minutes=44)
            )

        self.assertEqual(schedule["alpha"][0], now + timedelta(minutes=44))
        self.assertEqual(schedule["bravo"][0], now + timedelta(minutes=54))
        self.assertEqual(schedule["charlie"][0], now + timedelta(minutes=64))
        self.assertEqual(save.call_count, 3)


if __name__ == "__main__":
    unittest.main()
