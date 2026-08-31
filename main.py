import random
import time
from datetime import datetime, timedelta, timezone

from ai import analyze_meet
from config import (
    ACCOUNTS_LIST,
    ACCOUNT_SCRAPE_INTERVAL_MINUTES,
    ACCOUNT_STAGGER_MINUTES,
    IMAGE_HASH_MAX_DISTANCE,
    INSTAGRAM_PASSWORD,
    INSTAGRAM_SESSION_FILE,
    INSTAGRAM_USERNAME,
    RATE_LIMIT_BACKOFF_MINUTES,
    RATE_LIMIT_MAX_BACKOFF_MINUTES,
    SCHEDULE_JITTER_MINUTES,
    STARTUP_DELAY_MINUTES,
)
from ocr import extract_text_from_bytes
from scraper import InstagramRateLimited, InstagramScraper
from storage import (
    find_similar_image,
    get_scrape_schedule,
    init_db,
    remember_post,
    set_last_seen,
    set_scrape_schedule,
)
from telegram_bot import send_meet
from utils import download_image, perceptual_dhash


def rate_limit_delay_minutes(failures, jitter_minutes=None):
    jitter = (
        random.uniform(0, SCHEDULE_JITTER_MINUTES)
        if jitter_minutes is None
        else jitter_minutes
    )
    backoff = min(
        RATE_LIMIT_BACKOFF_MINUTES * (2 ** max(0, failures - 1)),
        RATE_LIMIT_MAX_BACKOFF_MINUTES,
    )
    return backoff + jitter


def successful_delay_minutes(jitter_minutes=None):
    jitter = (
        random.uniform(0, SCHEDULE_JITTER_MINUTES)
        if jitter_minutes is None
        else jitter_minutes
    )
    return ACCOUNT_SCRAPE_INTERVAL_MINUTES + jitter


def apply_global_cooldown(schedule, limited_account, cooldown_until):
    ordered_accounts = [limited_account] + sorted(
        account for account in schedule if account != limited_account
    )
    for index, account in enumerate(ordered_accounts):
        _, failures = schedule[account]
        next_run = cooldown_until + timedelta(minutes=index * ACCOUNT_STAGGER_MINUTES)
        schedule[account] = (next_run, failures)
        set_scrape_schedule(account, next_run, failures)


def process_posts(account, posts):
    completed = True
    print(f"Found {len(posts)} new meet candidate(s) for @{account}.")

    for post in posts:
        try:
            image_bytes = download_image(post["image_url"])
            image_hash = perceptual_dhash(image_bytes)

            duplicate = find_similar_image(
                image_hash, max_distance=IMAGE_HASH_MAX_DISTANCE
            )
            if duplicate:
                print(
                    f"Skipping duplicate poster @{post['account']}/{post['shortcode']} "
                    f"(matches @{duplicate['account']}/{duplicate['shortcode']}, "
                    f"distance={duplicate['distance']})"
                )
                remember_post(post, image_hash=image_hash, status="duplicate")
                continue

            ocr_text = extract_text_from_bytes(image_bytes)
            meet = analyze_meet(post["caption"], ocr_text)

            if not meet.get("is_car_meet", False):
                print(f"AI rejected @{post['account']}/{post['shortcode']} as non-meet")
                remember_post(post, image_hash=image_hash, status="rejected")
                continue

            meet["source_url"] = post["url"]
            send_meet(meet, image_bytes=image_bytes)
            remember_post(post, image_hash=image_hash, status="sent")
            print(f"Sent @{post['account']}/{post['shortcode']} to Telegram")
        except Exception as exc:
            completed = False
            print(f"Failed processing @{post['account']}/{post['shortcode']}: {exc}")

    return completed


def initial_schedule(accounts, now):
    schedule = {}
    for index, account in enumerate(accounts):
        saved = get_scrape_schedule(account)
        if saved:
            schedule[account] = saved
            continue

        due_at = now + timedelta(
            minutes=STARTUP_DELAY_MINUTES + (index * ACCOUNT_STAGGER_MINUTES)
        )
        schedule[account] = (due_at, 0)
        set_scrape_schedule(account, due_at, 0)
    return schedule


def main():
    init_db()
    scraper = InstagramScraper(
        INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD, INSTAGRAM_SESSION_FILE
    )
    schedule = initial_schedule(ACCOUNTS_LIST, datetime.now(timezone.utc))

    print("Meet Detector Running...")
    print(f"Watching {len(ACCOUNTS_LIST)} Instagram account(s), one at a time.")

    while True:
        if not schedule:
            print("No Instagram accounts configured; sleeping for 10 minutes.")
            time.sleep(600)
            continue

        account, (due_at, failures) = min(
            schedule.items(), key=lambda item: item[1][0]
        )
        wait_seconds = max(0, (due_at - datetime.now(timezone.utc)).total_seconds())
        if wait_seconds:
            print(f"Next scrape: @{account} at {due_at.astimezone().isoformat()}")
            time.sleep(wait_seconds)

        try:
            posts, newest_seen = scraper.scrape_account(account)
            completed = process_posts(account, posts)
            if completed and newest_seen is not None:
                set_last_seen(account, newest_seen)

            failures = 0
            delay = successful_delay_minutes()
            print(f"Completed @{account}; next check in {delay:.1f} minutes.")
        except InstagramRateLimited as exc:
            failures += 1
            delay = rate_limit_delay_minutes(failures)
            print(
                f"{exc}. Ending this attempt and backing off for "
                f"{delay:.1f} minutes (failure {failures})."
            )
            schedule[account] = (due_at, failures)
            cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=delay)
            apply_global_cooldown(schedule, account, cooldown_until)
            continue
        except Exception as exc:
            delay = max(30, ACCOUNT_STAGGER_MINUTES)
            print(f"Error scraping @{account}: {exc}. Retrying in {delay} minutes.")

        next_run = datetime.now(timezone.utc) + timedelta(minutes=delay)
        schedule[account] = (next_run, failures)
        set_scrape_schedule(account, next_run, failures)


if __name__ == "__main__":
    main()
