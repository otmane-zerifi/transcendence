from django.urls import path
from .views import UserRegistration, UserLogin, UserLogout, \
                    OAuthLogin, OAuthCallback, VerifyEmail, ResendActivation, User2FALogin, \
                    CustomRefreshTokenView, ResendOTP, UserProfile, UserPublicProfile, UserSearch, CheckTokens

app_name = 'users'

urlpatterns = [
    path('register/', UserRegistration.as_view(), name="create_user"),
    path('login/', UserLogin.as_view(), name='user_login'),
    path('logout/', UserLogout.as_view(), name='user_logout'),

    path('verify-email/<str:token>', VerifyEmail.as_view(), name='verify_email'),
    path('otp-verification/', User2FALogin.as_view(), name='otp_verification'),
    path('resend-otp/', ResendOTP.as_view(), name='resend_otp'),
    path('resend-activation/', ResendActivation.as_view(), name='resend_activation'),

    path('refresh/token/', CustomRefreshTokenView.as_view(), name='refresh_token'),
    path('check/token/', CheckTokens.as_view(), name='check_token'),

    path('oauth/login/', OAuthLogin.as_view(), name='remote_authentication'),
    path('oauth/callback/', OAuthCallback.as_view(), name='remote_authentication_callback'),

    path('profile/', UserProfile.as_view(), name='user_profile'),
    path('profile/<str:username>', UserPublicProfile.as_view(), name='user_profile'),
    path('search/', UserSearch.as_view(), name='search_user'),
]
