from django.urls import path
from .consumers import ChatConsumer

websocket_urlpatterns = [
    path('chatws/chat-server/', ChatConsumer.as_asgi()),
] 