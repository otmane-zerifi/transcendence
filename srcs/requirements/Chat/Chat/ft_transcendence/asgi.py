import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ft_transcendence.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from user_status.routing import websocket_urlpatterns as user_status_patterns
from friends.routing import websocket_urlpatterns as notification_patterns
from user_status.middleware import TokenAuthMiddleware 
from chat.routing import websocket_urlpatterns as chat_url

django_asgi_app = get_asgi_application()

combined_patterns = user_status_patterns + notification_patterns + chat_url

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddleware(
            URLRouter(combined_patterns)
        )
    ),
})