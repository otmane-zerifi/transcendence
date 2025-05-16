from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator, MaxLengthValidator
from rest_framework import serializers
from .models import MyUser, OTPUser
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken

class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyUser
        fields = ('email', 'user_name', 'password')                              # '__all__'
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def check_user(self, validated_data):
        user = authenticate(username=validated_data['email'], password=validated_data['password'])
        return user

class User2FASerializer(serializers.Serializer):
    otp = serializers.CharField(
        validators=[
            MinLengthValidator(6),
            MaxLengthValidator(6)
        ]
    )

    def check_otp(self, user, validated_data):
        otp = validated_data['otp']

        try:
            user_otp = OTPUser.objects.get(user=user, otp=otp)
        except OTPUser.DoesNotExist:
            raise ValidationError('Invalid or expired OTP')
        
        if user_otp.is_expired():
            raise ValidationError('OTP has expired')
        
        user_otp.delete()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyUser
        fields = '__all__'
        read_only_fields = ('email', 'user_name', 'joined_at', 'pingpong_games_played',
                            'pingpong_wins', 'pingpong_losses', 'is_online', 'is_staff',
                            'is_active', 'oauth_access_token', 'oauth_refresh_token')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.avatar:
            data['avatar'] = None 
        else:
            data['avatar'] = instance.avatar.url
        return data
