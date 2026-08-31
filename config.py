import os

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")

INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD")
RAILWAY_VOLUME_MOUNT_PATH = os.getenv("RAILWAY_VOLUME_MOUNT_PATH")
INSTAGRAM_SESSION_FILE = os.getenv("INSTAGRAM_SESSION_FILE") or (
    os.path.join(RAILWAY_VOLUME_MOUNT_PATH, "session-instagram")
    if RAILWAY_VOLUME_MOUNT_PATH
    else None
)

LLAMA_API_KEY = os.getenv("LLAMA_API_KEY")
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "llama-3.3-70b-versatile")

SCRAPE_INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "40"))
FIRST_RUN_LOOKBACK_MINUTES = int(os.getenv("FIRST_RUN_LOOKBACK_MINUTES", "90"))
IMAGE_HASH_MAX_DISTANCE = int(os.getenv("IMAGE_HASH_MAX_DISTANCE", "6"))

ACCOUNTS_LIST = [
    account.strip().lstrip("@")
    for account in os.getenv("ACCOUNTS_LIST", "").split(",")
    if account.strip()
]

ENABLE_INLINE_BUTTONS = os.getenv("ENABLE_INLINE_BUTTONS", "true").lower() == "true"
ENABLE_CALENDAR_SYNC = os.getenv("ENABLE_CALENDAR_SYNC", "true").lower() == "true"
ENABLE_IMAGE_ATTACH = os.getenv("ENABLE_IMAGE_ATTACH", "true").lower() == "true"
ENABLE_WEEKLY_DIGEST = os.getenv("ENABLE_WEEKLY_DIGEST", "true").lower() == "true"
ENABLE_REMINDER_PINGS = os.getenv("ENABLE_REMINDER_PINGS", "false").lower() == "true"
