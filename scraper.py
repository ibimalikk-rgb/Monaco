from datetime import datetime, timedelta, timezone
import instaloader

from config import FIRST_RUN_LOOKBACK_MINUTES
from storage import get_last_seen, post_seen
from utils import is_meet_post


def scrape_instagram(accounts, username, password, session_file=None):
    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_geotags=False,
        save_metadata=False,
        compress_json=False,
    )

    if not username:
        raise RuntimeError("INSTAGRAM_USERNAME is required")

    if session_file:
        try:
            loader.load_session_from_file(username, session_file)
            print(f"Loaded Instagram session from {session_file}")
        except Exception as exc:
            raise RuntimeError(
                f"Could not load Instagram session from {session_file}"
            ) from exc
    elif password:
        try:
            loader.login(username, password)
        except Exception as exc:
            raise RuntimeError("Instagram password login failed") from exc
    else:
        raise RuntimeError(
            "Instagram authentication is not configured; provide a session file"
        )

    now = datetime.now(timezone.utc)
    meets = []
    newest_seen = {}

    for account in accounts:
        last_seen = get_last_seen(account)
        cutoff = last_seen or (now - timedelta(minutes=FIRST_RUN_LOOKBACK_MINUTES))
        newest_for_account = last_seen

        try:
            profile = instaloader.Profile.from_username(loader.context, account)

            # Instaloader returns newest posts first, so once we hit the cutoff
            # there is no reason to crawl deeper into the account history.
            for post in profile.get_posts():
                posted_at = post.date_utc.replace(tzinfo=timezone.utc)

                if posted_at <= cutoff:
                    break

                if newest_for_account is None or posted_at > newest_for_account:
                    newest_for_account = posted_at

                if post_seen(post.shortcode):
                    continue

                if not is_meet_post(post.caption):
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

            if newest_for_account is not None:
                newest_seen[account] = newest_for_account

        except Exception as exc:
            print(f"Error scraping @{account}: {exc}")

    # Oldest first makes Telegram output chronological when several new posts appear.
    meets.sort(key=lambda post: post["date"])
    return meets, newest_seen
