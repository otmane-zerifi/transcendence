import json
import sys
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import User
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.db import transaction
from users.models import MyUser as ChatUser
from friends.models import  Friendship
from chat.models import  PrivateChat, Message 
from jwt import decode, ExpiredSignatureError, InvalidTokenError
from django.conf import settings
from channels.exceptions import DenyConnection
from django.db.models import Q
import logging
from channels.layers import get_channel_layer
from chat.utils import get_user_friends
from friends.models import Notification

logger = logging.getLogger(__name__)

def checkToken(encodedToken):
    if not encodedToken:
        raise DenyConnection("No token provided")
    
    try:
        decodedToken = decode(encodedToken, settings.SECRET_KEY, algorithms=["HS256"])
    except (ExpiredSignatureError, InvalidTokenError) as e:
        raise DenyConnection(str(e))

    return decodedToken

class ChatConsumer(AsyncJsonWebsocketConsumer):
    active_users = set()

    async def connect(self):
        try:
            token = self.scope.get('token')
            user = self.scope.get('user')

            logger.info(f"Token in scope: {token}")
            logger.info(f"User in scope: {user}")
            logger.info(f"Scope: {self.scope}")

            if not token:
                logger.error("Missing token.")
                raise DenyConnection("Missing token.")

            self.Token = checkToken(token)
            if not self.Token:
                logger.error("Invalid token.")
                raise DenyConnection("Invalid token.")

            await self.accept()
            self.User = await database_sync_to_async(ChatUser.objects.get)(id=self.Token['user_id'])
            self.UserGroup = f"chatuser_{self.User.id}"

            await self.channel_layer.group_add(self.UserGroup, self.channel_name)
            ChatConsumer.active_users.add(self.User.id)

            await self.broadcast_chat_status('online')

        except Exception as e:
            logger.error(f"Error connecting user: {e}")
            await self.close(4000)

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            print(f"Received message: {text_data_json}")

            message_type = text_data_json.get('type')
            handler = self.message_handlers.get(message_type)

            if handler:
                await handler(self, text_data_json)
            else:
                await self.send_json({'type': 'error', 'message': 'Invalid message type'})
        except Exception as e:
            logger.error(f"Error in receive method: {e}")
            await self.send_json({'type': 'error', 'message': 'Error processing your request'})

    async def broadcast_chat_status(self, status):
        try:
            friends_ids = await get_user_friends(self.User)
        except Exception as e:
            logger.warning("Target group is not friends ids.")
            return

        # avatar_url = get_avatar_url(self.User.avatar)
        channel_layer = get_channel_layer()

        for friend_id in friends_ids:
            if friend_id in ChatConsumer.active_users:
                group_name = f"chatuser_{friend_id}"

                try:
                    await channel_layer.group_send(
                        group_name,
                        {
                            "type": "chat_status",
                            "id": friend_id,
                            "status": status,
                        }
                    )
                except Exception as e:
                    logger.warning("Target group is not defined.")

    async def send_message(self, data):
        target_user_id = data.get('target_user_id')
        content = data.get('content')
        timestamp = data.get('timestamp')

        if not target_user_id or not content:
            return await self.send_json({
                'type': 'error',
                'message': 'Invalid target user or message content'
            })

        target_user, friendship = await self.target_check(target_user_id)
        if not target_user or target_user == self.User or not friendship:
            return await self.send_json({
                'type': 'error',
                'message': 'Invalid target user or no friendship found'
            })

        message = await self.save_message(content, timestamp)

        if self.TargetGroup:
            if target_user.id not in ChatConsumer.active_users:
                pass
                # notification = await sync_to_async(Notification.objects.create)(
                #     sender=self.User,
                #     receiver=target_user,
                #     type="message",
                #     message=content,
                #     is_read=False,
                #     message_id=message.id
                # )
                # await sync_to_async(notification.save)()
            # await self.send_json({
            #     'type': 'send_message_success',
            # })
            await self.channel_layer.group_send(self.TargetGroup, {
                'type': 'chat_message',
                'message_id': message.id,
                'is_read': message.read,
                'sender_id': self.User.id,
                # 'sender_avatar': get_avatar_url(self.User.avatar),
                'content': content,
                'timestamp': timestamp,
            })

    async def join_chat(self, data):
        target_user_id = data.get('target_user_id')
        if not target_user_id:
            return await self.send_json({
                'type': 'error',
                'message': 'Target user ID is required'
            })

        target_user, friendship = await self.target_check(target_user_id)

        if not target_user or target_user == self.User or not friendship:
            return await self.send_json({
                'type': 'error',
                'message': 'Invalid target user or no friendship found'
            })

        self.TargetUser = target_user
        self.TargetGroup = f"chatuser_{self.TargetUser.id}"

        self.ChatGroup = await self.save_group(self.User, self.TargetUser, friendship)
        await self.send_json({
            'type': 'join_chat_success',
            'target_user_id': self.TargetUser.id,
            'target_status': 'online' if self.TargetUser.id in ChatConsumer.active_users else 'offline',
        })

    @database_sync_to_async
    def save_group(self, user, target_user, friendship):
        group_name = f"group_{min(user.id, target_user.id)}_{max(user.id, target_user.id)}"
        chat_group = PrivateChat.objects.filter(groupName=group_name).first()

        if not chat_group:
            chat_group = PrivateChat.objects.create(
                groupName=group_name,
                user1=user,
                user2=target_user,
                Friendship=friendship
            )

        return chat_group

    @database_sync_to_async
    def target_check(self, target_user_id):
        print(f"Target user ID: {target_user_id}")
        try:
            target_user = ChatUser.objects.get(id=target_user_id)
        except ChatUser.DoesNotExist:
            logger.error(f"Target user with ID {target_user_id} does not exist.")
            return None, None

        # Only check for friendship where the current user is the initiator
        friendship = Friendship.objects.filter(user=self.User, friend=target_user).first()

        if not friendship:
            logger.error(f"No friendship found between {self.User.id} and {target_user.id}.")
            return None, None

        return target_user, friendship

    @database_sync_to_async
    def save_message(self, content, timestamp):
        try:
            message = Message.objects.create(
                chatGroup=self.ChatGroup,
                sender=self.User,
                receiver=self.TargetUser,
                content=content,
                timestamp=timestamp
            )
            return message
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return None
        

    async def chat_message(self, event):
        await self.send_json({
            'type': 'chat_message',
            'message_id': event['message_id'],
            'is_read': event['is_read'],
            'sender_id': event['sender_id'],
            # 'sender_avatar': event['sender_avatar'],
            'content': event['content'],
            'timestamp': event['timestamp'],
        })

    async def chat_status(self, event):
        await self.send_json({
            'type': 'chat_status',
            'id': event['id'],
            'status': event['status'],
        })

    message_handlers = {
        'send_message': send_message,
        'join_chat': join_chat,
    }
