import os, random, string, requests
from io import BytesIO
from PIL import Image
from django.core.files import File
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models


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
