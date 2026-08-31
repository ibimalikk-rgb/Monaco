# Railway setup for the meet bot

## 1. Add these Railway Variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_ID`
- `INSTAGRAM_USERNAME`
- `LLAMA_API_KEY`
- `LLAMA_MODEL` (optional; defaults to `llama-3.3-70b-versatile`)
- `ACCOUNTS_LIST` (comma-separated Instagram usernames, no @ required)
- `ACCOUNT_SCRAPE_INTERVAL_MINUTES` (optional, default `75` per account)
- `ACCOUNT_STAGGER_MINUTES` (optional, default `10` between first checks)
- `SCHEDULE_JITTER_MINUTES` (optional, default `10` random extra delay)
- `STARTUP_DELAY_MINUTES` (optional, default `45` after a deployment)
- `RATE_LIMIT_BACKOFF_MINUTES` (optional, default `44` after the first 429)
- `RATE_LIMIT_MAX_BACKOFF_MINUTES` (optional, default `360`)
- `FIRST_RUN_LOOKBACK_MINUTES` (optional, default `90`)
- `IMAGE_HASH_MAX_DISTANCE` (optional, default `6`)

## 2. Add a Railway Volume

Attach a persistent Volume to the bot service and mount it at `/data`.
Railway automatically exposes `RAILWAY_VOLUME_MOUNT_PATH`; the bot stores its SQLite database there.

Upload a valid Instaloader session to the volume as `/session-instagram`.
The bot sees this file at `/data/session-instagram` and loads it automatically.
`INSTAGRAM_PASSWORD` is not required when this session file is present.

For a non-Railway deployment, set `INSTAGRAM_SESSION_FILE` to the session file's
absolute path. Password login remains available as a fallback when no session
file path is configured, but it is not recommended for unattended deployments.

The database remembers:
- the newest Instagram post timestamp seen for every watched account;
- every Instagram shortcode already handled;
- a perceptual fingerprint for every poster already sent.

Without a Volume, Railway's normal service filesystem is ephemeral and this memory can disappear on redeploy/restart.

## 3. Start command

`python main.py`

## Duplicate behavior

A 64-bit perceptual dHash is stored for sent posters. New candidate posters are compared by Hamming distance. The default threshold is `6` bits. Increase it slightly if reposts with compression/resizing slip through; lower it if distinct posters are incorrectly treated as duplicates.

## Instagram scheduling and rate limits

The bot keeps one authenticated Instaloader client alive for the process lifetime
and checks one account at a time. Each account is checked every 75-85 minutes by
default. Initial account checks are staggered by 10 minutes.

An HTTP 429 ends that account's attempt immediately. Its next attempt is delayed
by 44 minutes, then 88, 176, and so on, capped at 6 hours. The next-run time and
failure count are stored in the `/data` SQLite database, so a redeploy does not
erase the cooldown.

Because a 429 can apply to the whole Instagram login or host IP, every account is
paused during that cooldown. Their next attempts are staggered again instead of
creating a burst when the cooldown expires.

`SCRAPE_INTERVAL_MINUTES` is no longer used. Remove it from Railway Variables or
replace it with `ACCOUNT_SCRAPE_INTERVAL_MINUTES` if a different interval is needed.

## First deployment behavior

There is intentionally no full-history scrape. On an account with no saved checkpoint, only posts from the most recent `FIRST_RUN_LOOKBACK_MINUTES` are inspected. After that, only posts newer than the saved account checkpoint are inspected.
