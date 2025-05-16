from django.db import models
# from django.contrib.auth.models import User
from users.models import MyUser 
from django.core.exceptions import ValidationError
from .utils import validate_image_file
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.core.files import File
from io import BytesIO
import requests

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', 
        null=True, 
        blank=True,
        default='profile_pictures/default.png'
    )
    
    oauth_picture_url = models.URLField(null=True, blank=True)
    level = models.IntegerField(default=1)
    rank = models.IntegerField(default=1)
    xp = models.IntegerField(default=0)

    def save_oauth_profile_picture(self, picture_url):
        """Download and save profile picture from OAuth provider"""
        if picture_url:
            try:
                response = requests.get(picture_url)
                if response.status_code == 200:
                    img_temp = BytesIO(response.content)
                    file_name = f"oauth_profile_{self.user.id}.jpg"
                    self.profile_picture.save(file_name, File(img_temp), save=True)
                    self.oauth_picture_url = picture_url
                    self.save()
                return True
            except Exception as e:
                print(f"Error saving OAuth profile picture: {str(e)}")
                return False

    @receiver(post_save, sender=MyUser)
    def create_user_profile(sender, instance, created, **kwargs):
        if created:
            Profile.objects.create(user=instance)

    @receiver(post_save, sender=MyUser)
    def save_user_profile(sender, instance, **kwargs):
        instance.profile.save()

    def __str__(self):
        return f"{self.user.user_name}'s profile"
    

class MatchHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    opponent = models.CharField(max_length=100)
    result = models.CharField(max_length=10)  # 'win', 'loss', or 'draw'
    date_played = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.user_name} vs {self.opponent} - {self.result}"



