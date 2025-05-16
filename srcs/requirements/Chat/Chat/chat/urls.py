from django.urls import path
from django.urls import path, include
from .views import index, get_friends, get_chats, get_online_friends, disconnect_friend, block_friend, unblock_friend, get_target_discussion, mark_message_read
urlpatterns = [
    # path('', index, name='chat_index'),
    path('friends/', include('friends.urls')),
    path("get-friends/", get_friends, name="get_friends"),
    path("get-chats/", get_chats, name="get_chats"),
    path("get-online-friends/", get_online_friends, name="get_online_friends"),
    path('disconnect-friend/<str:username>/', disconnect_friend, name='disconnect_friend'),
    path('block-friend/<str:username>/', block_friend, name='block_friend'),
    path('unblock-friend/<str:username>/', unblock_friend, name='unblock_friend'),
    path('targetuser/<int:user_id>/discussion/', get_target_discussion, name='get_target_discussion'),
    path('mark-message-read/', mark_message_read, name='mark_message_read'),
]