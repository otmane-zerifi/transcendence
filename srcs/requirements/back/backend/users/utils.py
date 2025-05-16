import os, random, string, requests, jwt, time
from io import BytesIO
from PIL import Image
from django.core.files import File
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models
from ft_transcendence.settings import SECRET_KEY


def generate_otp():
    otp = ''.join(random.choices(string.digits, k=6))
    return otp

def save_image(image_url):
    response = requests.get(image_url)
    if response.status_code == 200:
        img = Image.open(BytesIO(response.content))

        image_name = os.path.basename(image_url)
        file_path = os.path.join(settings.MEDIA_ROOT, 'avatars', image_name)
        img.save(file_path)

        return 'avatars/' + image_name

    return None

def is_token_expired(auth_header: str) -> bool:
    access_token = auth_header.split('Bearer ' )[-1].strip()
    try:
        decoded_token = jwt.decode(access_token, SECRET_KEY, algorithms=["HS256"], options={"verify_exp": False})
        print(f"==>>{decoded_token}")
        current_time = int(time.time())
        print(f"==>>>{current_time}")
        print(f"==>>>>{decoded_token['exp']}")

        if decoded_token.get('exp') < current_time:
            return True
        return False
    except jwt.ExpiredSignatureError:
        return True
    except jwt.PyJWTError:
        raise "Invalid token"
