import time

from ai import analyze_meet
from config import (
    ACCOUNTS_LIST,
    IMAGE_HASH_MAX_DISTANCE,
    INSTAGRAM_PASSWORD,
    INSTAGRAM_SESSION_FILE,
    INSTAGRAM_USERNAME,
    SCRAPE_INTERVAL_MINUTES,
)
from ocr import extract_text_from_bytes
from scraper import scrape_instagram
from storage import (
    find_similar_image,
    init_db,
    remember_post,
    set_last_seen,
)
from telegram_bot import send_meet
from utils import download_image, perceptual_dhash


def run_scrape_cycle():
    posts, newest_seen = scrape_instagram(
        ACCOUNTS_LIST,
        INSTAGRAM_USERNAME,
        INSTAGRAM_PASSWORD,
        INSTAGRAM_SESSION_FILE,
    )
    print(f"Found {len(posts)} new meet candidate(s).")

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
            # Do not remember a failed post as sent/duplicate. The account watermark
            # is only advanced after the cycle completes successfully below.
            print(f"Failed processing @{post['account']}/{post['shortcode']}: {exc}")
            newest_seen.pop(post["account"], None)

    # Advance each account only after its candidates have been handled. If one post
    # for an account failed, that account is left unchanged so the next cycle retries it.
    for account, newest_date in newest_seen.items():
        set_last_seen(account, newest_date)


def main():
    init_db()
    print("Meet Detector Running...")
    print(f"Watching {len(ACCOUNTS_LIST)} Instagram account(s).")

    while True:
        try:
            run_scrape_cycle()
        except Exception as exc:
            print("Scrape cycle failed:", exc)

        time.sleep(SCRAPE_INTERVAL_MINUTES * 60)


if __name__ == "__main__":
    main()
