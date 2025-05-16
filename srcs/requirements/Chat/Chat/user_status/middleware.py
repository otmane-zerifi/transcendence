from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs
import logging

logger = logging.getLogger(__name__)

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:
            logger.info(f"Scope: {scope}")
            query_string = scope["query_string"].decode()
            query_params = parse_qs(query_string)
            logger.info(f"Query params: {query_params}")
            
            token = query_params.get('token', [None])[0]
            logger.info(f"Raw token: {token}")

            if token and token.startswith("Bearer "):
                token = token[7:]  # Remove 'Bearer ' part
                logger.info(f"Cleaned token: {token}")

            if token:
                try:
                    logger.info("Attempting to validate token...")
                    access_token = AccessToken(token)
                    logger.info(f"Token validated successfully, user_id: {access_token['user_id']}")
                    user = await database_sync_to_async(get_user_model().objects.get)(id=access_token['user_id'])
                    logger.info(f"Found user: {user}")
                    scope['user'] = user
                    scope['token'] = token
                except Exception as e:
                    logger.error(f"Token validation error: {e}")
                    scope['user'] = AnonymousUser()
            else:
                logger.warning("No token provided")
                scope['user'] = AnonymousUser()
        except Exception as e:
            logger.error(f"WebSocket auth error: {e}")
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
