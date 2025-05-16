from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import AuthenticationFailed

def decode_token(token):
    try:
        access_token = AccessToken(token)
        return access_token.payload
    except Exception as e:
        raise AuthenticationFailed(f"Token is invalid: {str(e)}")

class CustomRefreshToken(RefreshToken):
    def add_custom_claim(self, key, value):
        self.payload[key] = value
