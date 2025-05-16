from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken, AuthenticationFailed
from .tokens import decode_token

class CheckBlacklistedRefreshTokenPermission(BasePermission):
    def is_refresh_token_blacklisted(self, refresh_token):
        try:
            token = OutstandingToken.objects.get(token=refresh_token)
            blacklisted_token = BlacklistedToken.objects.get(token=token)
        except:
            return False
        return True

    def has_permission(self, request, view):
        refresh_token = request.headers.get('refresh')

        if not refresh_token:
            return False

        if self.is_refresh_token_blacklisted(refresh_token):
            return False

        return True

class Check2FAPermission(BasePermission):
    def has_permission(self, request, view):
        access_token = request.headers.get('Authorization', None).split('Bearer ')[-1]

        user = request.user
        if user.is_2fa_active is False:
            return True

        claims = decode_token(access_token)
        verified_2fa = claims.get("2fa")
        if verified_2fa:
            return True
        
        return False

class Check2FANotVerifiedPermission(BasePermission):
    def has_permission(self, request, view):
        access_token = request.headers.get('Authorization', None).split('Bearer ')[-1]

        claims = decode_token(access_token)
        verified_2fa = claims.get("2fa")
        if verified_2fa:
            return False
        
        return True
