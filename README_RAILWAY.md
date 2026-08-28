# Railway setup for the meet bot

## 1. Add these Railway Variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_ID`
- `INSTAGRAM_USERNAME`
- `INSTAGRAM_PASSWORD`
- `LLAMA_API_KEY`
- `LLAMA_MODEL` (optional; defaults to `llama-3.3-70b-versatile`)
- `ACCOUNTS_LIST` (comma-separated Instagram usernames, no @ required)
- `SCRAPE_INTERVAL_MINUTES` (optional, default `40`)
- `FIRST_RUN_LOOKBACK_MINUTES` (optional, default `90`)
- `IMAGE_HASH_MAX_DISTANCE` (optional, default `6`)

## 2. Add a Railway Volume

Attach a persistent Volume to the bot service and mount it at `/data`.
Railway automatically exposes `RAILWAY_VOLUME_MOUNT_PATH`; the bot stores its SQLite database there.

The database remembers:
- the newest Instagram post timestamp seen for every watched account;
- every Instagram shortcode already handled;
- a perceptual fingerprint for every poster already sent.

Without a Volume, Railway's normal service filesystem is ephemeral and this memory can disappear on redeploy/restart.

## 3. Start command

`python main.py`

## Duplicate behavior

A 64-bit perceptual dHash is stored for sent posters. New candidate posters are compared by Hamming distance. The default threshold is `6` bits. Increase it slightly if reposts with compression/resizing slip through; lower it if distinct posters are incorrectly treated as duplicates.

## First deployment behavior

There is intentionally no full-history scrape. On an account with no saved checkpoint, only posts from the most recent `FIRST_RUN_LOOKBACK_MINUTES` are inspected. After that, only posts newer than the saved account checkpoint are inspected.
