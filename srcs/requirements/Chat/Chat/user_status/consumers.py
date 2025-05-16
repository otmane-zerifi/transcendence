import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import UserSession
import uuid

class UserStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("user_status", self.channel_name)
        if self.scope["user"].is_authenticated:
            self.user = self.scope["user"]
            self.session_id = str(uuid.uuid4())
            await self.create_user_session()
            await self.set_user_online_status(True)
            await self.accept()
            await self.channel_layer.group_send(
                "user_status",
                {
                    "type": "user_status_change",
                    "user_id": self.user.id,
                    "status": "online"
                }
            )

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user.is_authenticated:
            await self.set_user_online_status(False)
            await self.close_user_session()
            await self.channel_layer.group_send(
                "user_status",
                {
                    "type": "user_status_change",
                    "user_id": self.user.id,
                    "status": "offline"
                }
            )
        await self.channel_layer.group_discard("user_status", self.channel_name)

    async def user_status_change(self, event):
        await self.send(text_data=json.dumps({
            "type": "status_change",
            "user_id": event["user_id"],
            "status": event["status"]
        }))

    @database_sync_to_async
    def create_user_session(self):
        UserSession.objects.create(
            user=self.user,
            session_id=self.session_id,
            is_active=True
        )

    @database_sync_to_async
    def close_user_session(self):
        UserSession.objects.filter(
            user=self.user,
            session_id=self.session_id,
            is_active=True
        ).update(
            is_active=False,
            disconnected_at=timezone.now()
        )

    @database_sync_to_async
    def set_user_online_status(self, status):
        self.user.is_online = status
        self.user.save(update_fields=['is_online'])