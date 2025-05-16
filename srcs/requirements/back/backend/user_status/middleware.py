
        
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:

            query_string = scope["query_string"].decode()
            query_params = parse_qs(query_string)
            token = query_params.get('token', [None])[0]

            if token:
                access_token = AccessToken(token)
                user = await database_sync_to_async(get_user_model().objects.get)(id=access_token['user_id'])
                scope['user'] = user
            else:
                scope['user'] = AnonymousUser()
        except Exception as e:
            print(f"WebSocket auth error: {e}")
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)