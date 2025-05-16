import os, requests, json, jwt, time
from datetime import timedelta, datetime
from django.conf import settings
from django.utils import timezone
from django.shortcuts import redirect, get_object_or_404
from django.core.exceptions import ValidationError
from django.db.models import Q
from urllib.parse import urlencode
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from .serializers import UserRegisterSerializer, UserLoginSerializer, User2FASerializer, UserProfileSerializer
from .models import MyUser, OTPUser
from friends.models import Friendship, FriendRequest
from .permissions import CheckBlacklistedRefreshTokenPermission, Check2FAPermission, Check2FANotVerifiedPermission
from .tokens import CustomRefreshToken, decode_token
from .mails import send_otp_email, send_verification_email
from .utils import generate_otp, save_image, is_token_expired

class UserProfile(APIView):
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, Check2FAPermission]

    def get(self, request):
        try:
            user = request.user
            serializer = UserProfileSerializer(user)
            userData = {
                "ID": serializer.data['id'],
                "email": serializer.data['email'],
                "username": serializer.data['user_name'],
                "nickename": serializer.data['nickename'],
                "first_name": serializer.data['first_name'],
                "last_name": serializer.data['last_name'],
                "registration_date": serializer.data['joined_at'],
                "avatar": serializer.data['avatar'],
                "pingpong_games_played": serializer.data['pingpong_games_played'],
                "pingpong_wins": serializer.data['pingpong_wins'],
                "pingpong_losses": serializer.data['pingpong_losses'],
                "is_2fa_active": serializer.data['is_2fa_active'],
            }
            return Response({"message": "User Profile Retrieved Successfully!", "user": userData}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        try:
            user = request.user
            serializer = UserProfileSerializer(user, data=request.data, partial=True)	# Additional Partial Updates
            if serializer.is_valid(raise_exception=True):
                serializer.save()
                userData = {
                    "ID": serializer.data['id'],
                    "email": serializer.data['email'],
                    "username": serializer.data['user_name'],
                    "nickename": serializer.data['nickename'],
                    "first_name": serializer.data['first_name'],
                    "last_name": serializer.data['last_name'],
                    "registration_date": serializer.data['joined_at'],
                    "avatar": serializer.data['avatar'],
                    "auth": serializer.data['auth'],
                    "pingpong_games_played": serializer.data['pingpong_games_played'],
                    "pingpong_wins": serializer.data['pingpong_wins'],
                    "pingpong_losses": serializer.data['pingpong_losses'],
                    "is_2fa_active": serializer.data['is_2fa_active'],
                }
                return Response({"message": "User Profile Updated Successfully!", "user": userData}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)



class UserPublicProfile(APIView):
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, Check2FAPermission]

    def get(self, request, username):
        try:
            user = get_object_or_404(MyUser, user_name=username)
            serializer = UserProfileSerializer(user)
            userData = {
                "ID": serializer.data['id'],
                "username": serializer.data['user_name'],
                "nickename": serializer.data['nickename'],
                "avatar": serializer.data['avatar'],
                "auth": serializer.data['auth'],
                "friend": Friendship.objects.filter(user=request.user, friend=user).exists(),
                "received_friendship_request": FriendRequest.objects.filter(
                    sender=user, receiver=request.user, status="PENDING"
                ).exists(),
                "sent_friendship_request": FriendRequest.objects.filter(
                    sender=request.user, receiver=user, status="PENDING"
                ).exists(),
                "pingpong_games_played": serializer.data['pingpong_games_played'],
                "pingpong_wins": serializer.data['pingpong_wins'],
                "pingpong_losses": serializer.data['pingpong_losses'],
            }
            return Response({"message": "User Profile Retrieved Successfully!", "user": userData}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserSearch(APIView):
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, Check2FAPermission]

    def post(self, request):
        try:
            search = request.data['search']
            users = MyUser.objects.filter(user_name__icontains=search)
            if not users:
                return Response({"message": "No user found"}, status=status.HTTP_404_NOT_FOUND)
            data = []
            for user in users:
                serializer = UserProfileSerializer(user)
                userData = {
                    "ID": serializer.data['id'],
                    "username": serializer.data['user_name'],
                    "avatar": serializer.data['avatar'],
                }
                data.append(userData)
            return Response({"message": "Users found!", "users": data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserRegistration(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            newUser = serializer.save()
            if newUser:
                refresh = CustomRefreshToken.for_user(newUser)
                newUser.last_login = timezone.now()
                newUser.save()
                # verification_link = f"http://127.0.0.1:8000/api/user/verify-email/{refresh.access_token}"
                # send_verification_email(newUser.email, verification_link)
                newUserData = {
                    "ID": newUser.id,
                    "email": newUser.email,
                    "username": newUser.user_name,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
                res = {"message": "User registered successfully!",  
                       "user": newUserData}
                return Response(res, status=status.HTTP_201_CREATED)
        return Response(serializer.error, status=status.HTTP_400_BAD_REQUEST)



class UserLogin(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.check_user(request.data)
            if user is None:
                return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
            refresh = CustomRefreshToken.for_user(user)
            user.last_login = timezone.now()
            user.save()
            userData = {
                "ID": user.id,
                "email": user.email,
                "username": user.user_name,
                "is_2fa_active": user.is_2fa_active,
            }
            if user.is_2fa_active:
                refresh.add_custom_claim('2fa', False)
                verification_link = f"http://127.0.0.1:8000/api/user/otp-verification"
                otp = generate_otp()
                expired_at = timezone.now() + timedelta(minutes=5)
                OTPUser.objects.update_or_create(
                    user=user,
                    defaults={'otp': otp, 'expired_at': expired_at}
                )
                send_otp_email(user.email, verification_link, otp)
                message = "Need to verify 2FA!"
            else:
                message = "User is successfully logged in!"
            tokens = {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
            userData.update(tokens)
            res = {"message": message,
                   "user": userData}
            return Response(res, status=status.HTTP_200_OK)
        return Response(serializer.error, status=status.HTTP_400_BAD_REQUEST)



class User2FALogin(APIView):
    permission_classes = [IsAuthenticated, Check2FANotVerifiedPermission, CheckBlacklistedRefreshTokenPermission]

    def post(self, request):
        serializer = User2FASerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            try:
                # access_token = request.headers.get('Authorization', None).split('Bearer ')[-1]
                # claims = decode_token(access_token)
                # user_id = claims.get("user_id")
                # user = get_object_or_404(MyUser, id=int(user_id))

                user = request.user

                serializer.check_otp(user=user, validated_data=request.data)
                refresh_token = request.headers.get('refresh')
                token = RefreshToken(refresh_token)
                token.blacklist()
                refresh = CustomRefreshToken.for_user(user)
                refresh.add_custom_claim('2fa', True)
                user.last_login = timezone.now()
                user.save()
                userData = {
                    "ID": user.id,
                    "email": user.email,
                    "username": user.user_name,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
                res = {"message": "User is successfully logged in!",
                    "user": userData}
                return Response(res, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.error, status=status.HTTP_400_BAD_REQUEST)



class UserLogout(APIView):
    permission_classes = [IsAuthenticated, Check2FAPermission, CheckBlacklistedRefreshTokenPermission]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "User logged out successfully"}, status=status.HTTP_200_OK)
        except KeyError:
            return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
        except TokenError:
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)



class CustomRefreshTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            raise AuthenticationFailed('Refresh token is required')
        
        try:
            refresh = CustomRefreshToken(refresh_token)
            user = MyUser.objects.get(id=refresh['user_id'])
            try:
                stat_2fa = refresh['2fa']
            except Exception:
                stat_2fa = False
            access_token = refresh.access_token
            new_refresh = CustomRefreshToken.for_user(user)
            if stat_2fa:
                new_refresh.add_custom_claim('2fa', stat_2fa)
            refresh.blacklist()
            refresh = new_refresh
            return Response({"access": str(access_token),
                             "refresh": str(refresh)}, status=status.HTTP_200_OK)
        except MyUser.DoesNotExist:
            raise AuthenticationFailed('User associated with this refresh token does not exist.')
        except Exception as e:
            raise AuthenticationFailed(f'Invalid refresh token: {str(e)}')


# class CheckTokens(APIView):
#     permission_classes = [AllowAny]
#     authentication_classes = []

#     def get(self, request):
#         auth_header = request.headers.get('Authorization').strip()
#         try:
#             exp = is_token_expired(auth_header=auth_header)
#             return Response({"is_epired": exp}, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CheckTokens(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        access_token = request.headers.get('Authorization')
        refresh_token = request.headers.get('refresh')

        if not access_token or not refresh_token:
            return Response({
                "error": "Both access and refresh tokens are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        access_token = access_token.split('Bearer ')[-1]

        try:
            # Check access token
            access_token_payload = decode_token(access_token)
            is_access_expired = access_token_payload.get('exp', 0) < timezone.now().timestamp()
        except Exception:
            is_access_expired = True

        try:
            # Check refresh token
            refresh_token_payload = decode_token(refresh_token)
            is_refresh_expired = refresh_token_payload.get('exp', 0) < timezone.now().timestamp()

            # Check if refresh token is blacklisted
            token = OutstandingToken.objects.filter(token=refresh_token).first()
            if token and BlacklistedToken.objects.filter(token=token).exists():
                is_refresh_expired = True
        except Exception:
            is_refresh_expired = True

        return Response({
            "is_token_expired": is_access_expired,
            "is_refresh_token_expired": is_refresh_expired
        }, status=status.HTTP_200_OK)


class VerifyEmail(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        header_token = request.headers.get('Authorization', None)

        if not header_token:
            pass
        else:
            header_token = header_token.split('Bearer ')[-1].strip()
            if header_token != token:
                return Response({"error": "Not the same user"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = get_object_or_404(MyUser, id=user_id)

            if not user.is_active:
                user.is_active = True
                user.save()
                return Response({"message": "Email verified successfully"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Email is already verified"}, status=status.HTTP_400_BAD_REQUEST)
        except TokenError:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)



class ResendActivation(APIView):
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, Check2FAPermission]

    def get(self, request):
        try:
            user = request.user
            refresh = CustomRefreshToken.for_user(user)
            verification_link = f"http://127.0.0.1:8000/api/user/verify-email/{refresh.access_token}"
            send_verification_email(user.email, verification_link)
            userData = {
                "ID": user.id,
                "email": user.email,
                "username": user.user_name,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
            res = {"message": "The email has been sent!",
                    "user": userData}
            return Response(res, status=status.HTTP_200_OK)
        except TokenError:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)



class ResendOTP(APIView):
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, Check2FANotVerifiedPermission]

    def get(self, request):
        try:
            user = request.user
            verification_link = f"http://127.0.0.1:8000/api/user/otp-verification"
            otp = generate_otp()
            expired_at = timezone.now() + timedelta(minutes=5)
            OTPUser.objects.update_or_create(
                user=user,
                defaults={'otp': otp, 'expired_at': expired_at}
            )
            send_otp_email(user.email, verification_link, otp)
            return Response({"message": "Need to verify 2FA!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)



# OAuth 2.0

class OAuthLogin(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query_params = urlencode({
            'client_id': settings.OAUTH_CLIENT_ID,
            'response_type': 'code',
            'redirect_uri': settings.OAUTH_REDIRECT_URI,
            'scope': settings.OAUTH_SCOPE,
        })
        authorization_url = f"{settings.OAUTH_AUTHORIZATION_URL}?{query_params}"
        print(f"Authorization URL: {authorization_url}\n")
        return redirect(authorization_url)

class OAuthCallback(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get('code')
        print(code)
        token_response = requests.post(
            settings.OAUTH_TOKEN_URL,
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': settings.OAUTH_REDIRECT_URI,
                'client_id': settings.OAUTH_CLIENT_ID,
                'client_secret': settings.OAUTH_CLIENT_SECRET,
            }
        )
        token_response_data = token_response.json()
        access_token = token_response_data.get('access_token')
        refresh_token = token_response_data.get('refresh_token')
        print("-------------------------------------------\n")
        print(token_response_data)
        print("-------------------------------------------\n")
        print(f"Access Token = {access_token}\n")
        print(f"Refresh Token = {refresh_token}\n")
        print("\n-------------------------------------------")
        if (token_response.status_code == 200):
            user_info_response = requests.get(
                'https://api.intra.42.fr/v2/me',
                headers={
                    'Authorization': f'Bearer {access_token}',
                }
            )
# **********
            username = user_info_response.json()['login']
            if MyUser.objects.filter(user_name=username) \
                .exclude(email=user_info_response.json()['email']) \
                .exists():
                username = username + str(MyUser.objects.filter(user_name__icontains=username).count())
# **********
            user, created = MyUser.objects.get_or_create(
                email=user_info_response.json()['email'],
                defaults={
                    'user_name': username,
                    'first_name': user_info_response.json()['cursus_users'][0]['user']['first_name'],
                    'last_name': user_info_response.json()['cursus_users'][0]['user']['last_name'],
                    'auth': '42 Intra',
                    'oauth_access_token': access_token,
                    'oauth_refresh_token': refresh_token
                }
            )
            if created:
                avatar = save_image(user_info_response.json()['image']['link'])
                user.avatar = avatar
                user.save()
# **********
            if not created:
                user.oauth_access_token = access_token
                user.oauth_refresh_token = refresh_token
                user.save()

            refresh = CustomRefreshToken.for_user(user)
            user.last_login = timezone.now()
            user.save()

# **********
            userData = {
                "ID": user.id,
                "email": user.email,
                "username": user.user_name,
                "nickename": user.nickename,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "registration_date": user.joined_at,
                "avatar": user.avatar.url,
                "pingpong_games_played": user.pingpong_games_played,
                "pingpong_wins": user.pingpong_wins,
                "pingpong_losses": user.pingpong_losses,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
            res = {"message": "User is successfully logged in!",
                   "user": userData}

            return Response(res, status=status.HTTP_200_OK)
        return Response({'error': 'Login failed'}, status=status.HTTP_502_BAD_GATEWAY)
