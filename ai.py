import json
import requests
from config import LLAMA_API_KEY, LLAMA_MODEL


def analyze_meet(caption, ocr_text):
    prompt = f"""
You are a car-meet detector. Decide whether this post advertises a real upcoming car meet/event.
Extract the event information from the caption and poster OCR.

Return ONLY valid JSON using exactly these keys:
{{
  "is_car_meet": true,
  "name": null,
  "date": null,
  "time": null,
  "location": null,
  "host": null,
  "fee": null,
  "notes": null
}}

Use false for is_car_meet when the content is not actually advertising a car meet/event.
Do not invent missing information; use null.

Caption:
{caption}

Poster OCR:
{ocr_text}
"""

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {LLAMA_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": LLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        },
        timeout=30,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return json.loads(content)
