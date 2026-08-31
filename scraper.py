from datetime import datetime, timedelta, timezone

import instaloader

from config import FIRST_RUN_LOOKBACK_MINUTES
from storage import get_last_seen, post_seen
from utils import is_meet_post


class InstagramRateLimited(RuntimeError):
    """Instagram rejected a request with HTTP 429."""


class InstagramScraper:
    def __init__(self, username, password=None, session_file=None):
        if not username:
            raise RuntimeError("INSTAGRAM_USERNAME is required")

        self.loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_geotags=False,
            save_metadata=False,
            compress_json=False,
            max_connection_attempts=1,
            fatal_status_codes=[429],
        )

        if session_file:
            try:
                self.loader.load_session_from_file(username, session_file)
                print(f"Loaded Instagram session from {session_file}")
            except Exception as exc:
                raise RuntimeError(
                    f"Could not load Instagram session from {session_file}"
                ) from exc
        elif password:
            try:
                self.loader.login(username, password)
            except Exception as exc:
                raise RuntimeError("Instagram password login failed") from exc
        else:
            raise RuntimeError(
                "Instagram authentication is not configured; provide a session file"
            )

    def scrape_account(self, account):
        now = datetime.now(timezone.utc)
        last_seen = get_last_seen(account)
        cutoff = last_seen or (now - timedelta(minutes=FIRST_RUN_LOOKBACK_MINUTES))
        newest_for_account = last_seen
        meets = []

        try:
            profile = instaloader.Profile.from_username(self.loader.context, account)

            for post in profile.get_posts():
                posted_at = post.date_utc.replace(tzinfo=timezone.utc)

                if posted_at <= cutoff:
                    break

                if newest_for_account is None or posted_at > newest_for_account:
                    newest_for_account = posted_at

                if post_seen(post.shortcode) or not is_meet_post(post.caption):
                    continue

                meets.append(
                    {
                        "account": account,
                        "shortcode": post.shortcode,
                        "caption": post.caption or "",
                        "image_url": post.url,
                        "url": f"https://www.instagram.com/p/{post.shortcode}/",
                        "date": posted_at,
                    }
                )
        except Exception as exc:
            if "429" in str(exc) or "Too Many Requests" in str(exc):
                raise InstagramRateLimited(f"Instagram rate-limited @{account}") from exc
            raise

        meets.sort(key=lambda post: post["date"])
        return meets, newest_for_account
