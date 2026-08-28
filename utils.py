from io import BytesIO
import requests
from PIL import Image


def is_meet_post(caption):
    if not caption:
        return False
    keywords = ["meet", "car meet", "cruise", "cars", "show", "event"]
    caption_lower = caption.lower()
    return any(k in caption_lower for k in keywords)


def download_image(url, timeout=20):
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    return response.content


def perceptual_dhash(image_bytes, hash_size=8):
    """64-bit difference hash. Similar images have small Hamming distance."""
    image = Image.open(BytesIO(image_bytes)).convert("L")
    image = image.resize((hash_size + 1, hash_size))
    pixels = list(image.getdata())

    value = 0
    for row in range(hash_size):
        offset = row * (hash_size + 1)
        for col in range(hash_size):
            value <<= 1
            if pixels[offset + col] > pixels[offset + col + 1]:
                value |= 1

    return f"{value:0{hash_size * hash_size // 4}x}"
