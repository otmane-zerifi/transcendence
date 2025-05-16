import random
import string
from users.models import MyUser as ChatUser
from friends.models import  Friendship
from chat.models import  PrivateChat, Message
from channels.db import database_sync_to_async
from django.db.models import Q
from asgiref.sync import sync_to_async

@database_sync_to_async
def getFriends(user_id):
    return Friend.objects.filter(Q(user=user) | Q(friend=user))
@database_sync_to_async
def get_user_friends(user):
    friendships = Friend.objects.filter(Q(user=user) | Q(friend=user))
    friend_ids = set()
    for friendship in friendships:
        if friendship.user.id != user.id:
            friend_ids.add(friendship.user.id)
        if friendship.friend.id != user.id:
            friend_ids.add(friendship.friend.id)
    
    return friend_ids
