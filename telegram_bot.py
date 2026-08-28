from io import BytesIO
import html

from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from config import (
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID,
    ENABLE_INLINE_BUTTONS,
    ENABLE_IMAGE_ATTACH,
)

bot = Bot(token=TELEGRAM_BOT_TOKEN)


def _value(value):
    value = value if value not in (None, "", "null") else "Unknown"
    return html.escape(str(value))


def send_meet(meet_data, image_bytes=None):
    text = (
        "🔥 <b>New Meet Detected!</b>\n\n"
        f"<b>Name:</b> {_value(meet_data.get('name'))}\n"
        f"<b>Date:</b> {_value(meet_data.get('date'))}\n"
        f"<b>Time:</b> {_value(meet_data.get('time'))}\n"
        f"<b>Location:</b> {_value(meet_data.get('location'))}\n"
        f"<b>Host:</b> {_value(meet_data.get('host'))}\n"
        f"<b>Fee:</b> {_value(meet_data.get('fee'))}\n"
        f"<b>Notes:</b> {_value(meet_data.get('notes'))}"
    )

    buttons = None
    source_url = meet_data.get("source_url")
    if ENABLE_INLINE_BUTTONS and source_url:
        buttons = InlineKeyboardMarkup(
            [[InlineKeyboardButton("View Post", url=source_url)]]
        )

    bot.send_message(
        chat_id=TELEGRAM_CHANNEL_ID,
        text=text,
        parse_mode="HTML",
        reply_markup=buttons,
    )

    if ENABLE_IMAGE_ATTACH and image_bytes:
        photo = BytesIO(image_bytes)
        photo.name = "meet.jpg"
        bot.send_photo(chat_id=TELEGRAM_CHANNEL_ID, photo=photo)
