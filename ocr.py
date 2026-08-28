from io import BytesIO
import easyocr
from PIL import Image

reader = easyocr.Reader(["en"])


def extract_text_from_bytes(image_bytes):
    try:
        image = Image.open(BytesIO(image_bytes))
        results = reader.readtext(image)
        return " ".join(result[1] for result in results)
    except Exception as exc:
        print("OCR failed:", exc)
        return ""
