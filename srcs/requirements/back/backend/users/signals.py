from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.utils import timezone
from .models import MyUser

@receiver(user_logged_in)
def update_last_login(sender, request, user, **kwargs):
    user.last_logging = timezone.now()
    user.save()
