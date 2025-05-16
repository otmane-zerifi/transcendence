from django.shortcuts import render
from django.db.models import Q
from django.http import JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import JsonResponse
from users.models import MyUser as User
from friends.models import  Friendship
from chat.models import  PrivateChat, Message 
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
import json
import random
from django.core.mail import send_mail
from rest_framework.views import APIView
from channels.layers import get_channel_layer
from django.core.validators import URLValidator, ValidationError
import logging
from asgiref.sync import async_to_sync
from django.shortcuts import render
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
import logging
from friends.models import Notification
logger = logging.getLogger(__name__)


# Create your views here.
@api_view(['GET'])
@permission_classes([AllowAny])
def get_friends(request):
    print(f"User checking for friends: {request.user.user_name} (ID: {request.user.id})")
    friends = Friendship.objects.filter(Q(user=request.user) | Q(friend=request.user))
    print("Request User:", request.user)
    print(friends)
    friend_ids = set()
    for friend in friends:
        if friend.user != request.user:
            friend_ids.add(friend.user.id)
        if friend.friend != request.user:
            friend_ids.add(friend.friend.id)
    friend_users = User.objects.filter(id__in=friend_ids).values('id', 'user_name', 'avatar')
    friends_data = [
        {
            "id": user['id'],
            "username": user['user_name'],
            "avatar": user['avatar'] or 'https://via.placeholder.com/150'
        }
        for user in friend_users
    ]
    print("Friends data:", friends_data)
    return JsonResponse({"friends": friends_data})

@api_view(['POST'])
@permission_classes([AllowAny])
def block_friend(request, username):
    try:
        user_to_block = get_object_or_404(User, username=username)
        Friendship.objects.filter(
        Q(user=request.user, friend=user_to_block) | Q(user=user_to_block, friend=request.user)
        ).delete()
        BlockedUser.objects.get_or_create(blocker=request.user, blocked=user_to_block)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{request.user.id}",
            {
                "type": "status_update",
                "action": "block",
                "id": user_to_block.id,
                "status": "offline",
                # "avatar": get_avatar_url(user_to_block.avatar),
                "username": user_to_block.username
            },
        )
        async_to_sync(channel_layer.group_send)(
            f"user_{user_to_block.id}",
            {
                "type": "status_update",
                "action": "block",
                "id": request.user.id,
                "status": "offline",
                # "avatar": get_avatar_url(request.user.avatar),
                "username": request.user.username
            },
        )
        return Response({"message": f"{username} has been blocked."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_chats(request):
    chats = PrivateChat.objects.filter(Q(user1=request.user) | Q(user2=request.user))
    chat_data = []
    
    for chat in chats:
        last_message = Message.objects.filter(chatGroup=chat).order_by('-timestamp').first()
        if chat.user1 == request.user:
            other_user = chat.user2
            # other_user_avatar = get_avatar_url(chat.user2.avatar)
        else:
            other_user = chat.user1
            # other_user_avatar = get_avatar_url(chat.user1.avatar)
        unread_messages_count = Message.objects.filter(
            chatGroup=chat,
            read=False,
            receiver=request.user
        ).count()
        chat_data.append({
            "chat_id": chat.id,
            "group_name": chat.groupName,
            "other_user_username": other_user.user_name,
            "other_user_id": other_user.id,
            "other_user_avatar": other_user_avatar,
            "friendship_id": chat.Friendship.id,
            "unread_messages": unread_messages_count,
            "last_message": last_message.content if last_message else None,
            "last_message_timestamp": last_message.timestamp if last_message else None
        })

    return JsonResponse({"chats": chat_data})

@api_view(['POST'])
@permission_classes([AllowAny])
def mark_message_read(request):
    data = json.loads(request.body)
    message_id = data.get('message_id')
    logger.warning(f'---------------------------{message_id}')
    try:
        message = Message.objects.get(id=message_id, receiver=request.user)
        message.read = True
        message.save()
        notification = Notification.objects.get(message_id=message.id)
        notification.is_read = True
        notification.is_treated = True
        notification.save()
        return JsonResponse({'success': True, 'message': 'Message marked as read'})
    except Message.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Message not found'}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_target_discussion(request, user_id):
    try:
        # Fetch the target user
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Fetch the chat between the current user and the target user
    chat = PrivateChat.objects.filter(
        (Q(user1=request.user) & Q(user2=target_user)) | (Q(user1=target_user) & Q(user2=request.user))
    ).first()

    if not chat:
        return Response({'error': 'No chats found for this user'}, status=status.HTTP_404_NOT_FOUND)

    # Fetch messages for the specific chat
    messages = Message.objects.filter(chatGroup=chat).order_by('timestamp')

    response_data = []
    for message in messages:
        response_data.append({
            'message_id': message.id,
            'receiver': message.receiver.user_name,
            'sender': message.sender.user_name,
            'sender_id': message.sender.id,
            'receiver_id': message.receiver.id,
            'content': message.content,
            'timestamp': message.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'is_sent': request.user.id == message.sender.id,  # True if the message was sent by the current user
            'is_read': message.read,
        })

    return JsonResponse({
        "messages": response_data,
        "target_username": target_user.user_name,
        "user_id": request.user.id,
        "user_username": request.user.user_name
    })
@api_view(['GET'])
@permission_classes([AllowAny])
def get_online_friends(request):
    friends = Friend.objects.filter(Q(user=request.user) | Q(friend=request.user))
    friend_ids = set()
    for friend in friends:
        if friend.user != request.user:
            friend_ids.add(friend.user.id)
        if friend.friend != request.user:
            friend_ids.add(friend.friend.id)
    friend_users = User.objects.filter(id__in=friend_ids).values('id', 'username', 'avatar', 'is_online')
    online_friends_data = []
    for user in friend_users:
        online = user['is_online']
        if online:
            online_friends_data.append({
                "id": user['id'],
                "username": user['username'],
                "avatar": user['avatar'] or 'https://via.placeholder.com/150'
            })
    return JsonResponse({"friends": online_friends_data})
@api_view(['POST'])
@permission_classes([AllowAny])
def disconnect_friend(request, username):
    try:
        friend = get_object_or_404(User, username=username)
        Friend.objects.filter(
            Q(user=request.user, friend=friend) | Q(user=friend, friend=request.user)
        ).delete()
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{request.user.id}",
            {
                "type": "status_update",
                "action": "disconnect",
                "id": friend.id,
                "status": "offline",
                # "avatar": get_avatar_url(friend.avatar),
                "username": friend.username
            },
        )
        async_to_sync(channel_layer.group_send)(
            f"user_{friend.id}",
            {
                "type": "status_update",
                "action": "disconnect",
                "id": request.user.id,
                "status": "offline",
                # "avatar": get_avatar_url(request.user.avatar),
                "username": request.user.username
            },
        )
        return Response(
            {"message": f"Successfully disconnected from {username}."},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['POST'])
@permission_classes([AllowAny])
def block_friend(request, username):
    try:
        user_to_block = get_object_or_404(User, username=username)
        Friend.objects.filter(
            Q(user=request.user, friend=user_to_block) | Q(user=user_to_block, friend=request.user)
        ).delete()
        BlockedUser.objects.get_or_create(blocker=request.user, blocked=user_to_block)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{request.user.id}",
            {
                "type": "status_update",
                "action": "block",
                "id": user_to_block.id,
                "status": "offline",
                # "avatar": get_avatar_url(user_to_block.avatar),
                "username": user_to_block.username
            },
        )
        async_to_sync(channel_layer.group_send)(
            f"user_{user_to_block.id}",
            {
                "type": "status_update",
                "action": "block",
                "id": request.user.id,
                "status": "offline",
                # "avatar": get_avatar_url(request.user.avatar),
                "username": request.user.username
            },
        )
        return Response({"message": f"{username} has been blocked."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def unblock_friend(request, username):
    try:
        user_to_unblock = get_object_or_404(User, username=username)
        BlockedUser.objects.filter(blocker=request.user, blocked=user_to_unblock).delete()
        return Response({"message": f"{username} has been unblocked."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def index(request):
    return render(request, 'chat/index.html')