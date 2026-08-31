import os
import sqlite3
import threading
from datetime import datetime, timezone

_DB_LOCK = threading.Lock()


def _db_path():
    mount = os.getenv("RAILWAY_VOLUME_MOUNT_PATH")
    data_dir = mount if mount else os.getenv("DATA_DIR", "./data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "meet_bot.sqlite3")


def _connect():
    conn = sqlite3.connect(_db_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _DB_LOCK, _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS account_state (
                account TEXT PRIMARY KEY,
                last_seen_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS seen_posts (
                shortcode TEXT PRIMARY KEY,
                account TEXT NOT NULL,
                post_url TEXT NOT NULL,
                posted_at TEXT NOT NULL,
                image_hash TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS seen_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_hash TEXT NOT NULL,
                shortcode TEXT NOT NULL,
                account TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_seen_images_hash ON seen_images(image_hash);

            CREATE TABLE IF NOT EXISTS scrape_schedule (
                account TEXT PRIMARY KEY,
                next_run_at TEXT NOT NULL,
                rate_limit_failures INTEGER NOT NULL DEFAULT 0
            );
            """
        )


def _iso(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def get_last_seen(account):
    with _DB_LOCK, _connect() as conn:
        row = conn.execute(
            "SELECT last_seen_at FROM account_state WHERE account = ?", (account,)
        ).fetchone()
    return datetime.fromisoformat(row["last_seen_at"]) if row else None


def set_last_seen(account, dt):
    value = _iso(dt)
    with _DB_LOCK, _connect() as conn:
        conn.execute(
            """
            INSERT INTO account_state(account, last_seen_at)
            VALUES (?, ?)
            ON CONFLICT(account) DO UPDATE SET last_seen_at = excluded.last_seen_at
            """,
            (account, value),
        )


def get_scrape_schedule(account):
    with _DB_LOCK, _connect() as conn:
        row = conn.execute(
            "SELECT next_run_at, rate_limit_failures FROM scrape_schedule "
            "WHERE account = ?",
            (account,),
        ).fetchone()
    if not row:
        return None
    return datetime.fromisoformat(row["next_run_at"]), row["rate_limit_failures"]


def set_scrape_schedule(account, next_run_at, rate_limit_failures):
    with _DB_LOCK, _connect() as conn:
        conn.execute(
            """
            INSERT INTO scrape_schedule(account, next_run_at, rate_limit_failures)
            VALUES (?, ?, ?)
            ON CONFLICT(account) DO UPDATE SET
                next_run_at = excluded.next_run_at,
                rate_limit_failures = excluded.rate_limit_failures
            """,
            (account, _iso(next_run_at), rate_limit_failures),
        )


def post_seen(shortcode):
    with _DB_LOCK, _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM seen_posts WHERE shortcode = ?", (shortcode,)
        ).fetchone()
    return row is not None


def hamming_distance(hash_a, hash_b):
    if not hash_a or not hash_b or len(hash_a) != len(hash_b):
        return 10**9
    return bin(int(hash_a, 16) ^ int(hash_b, 16)).count("1")


def find_similar_image(image_hash, max_distance=6):
    if not image_hash:
        return None
    with _DB_LOCK, _connect() as conn:
        rows = conn.execute(
            "SELECT image_hash, shortcode, account FROM seen_images"
        ).fetchall()
    for row in rows:
        distance = hamming_distance(image_hash, row["image_hash"])
        if distance <= max_distance:
            return {
                "shortcode": row["shortcode"],
                "account": row["account"],
                "distance": distance,
            }
    return None


def remember_post(post, image_hash=None, status="sent"):
    now = datetime.now(timezone.utc).isoformat()
    posted_at = _iso(post["date"])
    with _DB_LOCK, _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO seen_posts
            (shortcode, account, post_url, posted_at, image_hash, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                post["shortcode"],
                post["account"],
                post["url"],
                posted_at,
                image_hash,
                status,
                now,
            ),
        )
        if image_hash and status == "sent":
            conn.execute(
                """
                INSERT INTO seen_images(image_hash, shortcode, account, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (image_hash, post["shortcode"], post["account"], now),
            )
