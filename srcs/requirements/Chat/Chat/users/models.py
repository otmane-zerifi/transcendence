from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from enum import Enum
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

class AuthOptions(Enum):
    CLASSIC = "Classic"
    INTRA = "42 Intra"

class CustomAccountManager(BaseUserManager):

    def create_user(self, email, user_name, password, **kwargs):
        if not email:
            raise ValueError(_("E-mail is required"))

        email = self.normalize_email(email)
        user = self.model(email=email, user_name=user_name, **kwargs)
        user.set_password(password)
        user.save()

        return user
    
    def create_superuser(self, email, user_name, password, **kwargs):
        kwargs.setdefault('is_staff', True)
        kwargs.setdefault('is_superuser', True)
        kwargs.setdefault('is_active', True)

        if kwargs.get('is_staff') is not True:
            raise ValueError('Superuser must be assigned to is_staff=True.')
        if kwargs.get('is_superuser') is not True:
            raise ValueError('Superuser must be assigned to is_superuser=True.')

        return self.create_user(email, user_name, password, **kwargs)

class MyUser(AbstractBaseUser, PermissionsMixin):

    auth = models.CharField(
        _("authentication method"),
        max_length=20,
        choices=[(auth.name, auth.value) for auth in AuthOptions],
        default=AuthOptions.CLASSIC.value,
    )

    email = models.EmailField(_("email address"), unique=True)
    user_name = models.CharField(_("username"), max_length=50, unique=True)
    nickename = models.CharField(_("nickename"), max_length=50, unique=True, null=True)
    first_name = models.CharField(_("first name"), max_length=50)
    last_name = models.CharField(_("last name"), max_length=50)
    joined_at = models.DateTimeField(default=timezone.now)
    avatar = models.ImageField(_("avatar"), upload_to='avatars/', null=True, blank=True, default='avatars/op.webp')

    pingpong_games_played = models.IntegerField(_("total number of Ping Pong games played"), default=0)
    pingpong_wins = models.IntegerField(_("total number of Ping Pong games won"), default=0)
    pingpong_losses = models.IntegerField(_("total number of Ping Pong games lost"), default=0)

    is_online = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_2fa_active = models.BooleanField(default=False)

    oauth_access_token = models.CharField(max_length=255, blank=True, null=True)
    oauth_refresh_token = models.CharField(max_length=255, blank=True, null=True)

    objects = CustomAccountManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['user_name']

    def __str__(self):
        return self.user_name

class OTPUser(models.Model):

    user = models.ForeignKey(MyUser, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    expired_at = models.DateTimeField()

    def is_expired(self):
        return timezone.now() > self.expired_at
    
    def __str__(self):
        return self.user