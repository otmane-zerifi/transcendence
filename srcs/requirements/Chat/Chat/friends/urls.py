from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FriendRequestViewSet,
    FriendListView,
	UserSearchView,
    CancelFriendRequest,
)
from . import views

app_name = 'friends' 

router = DefaultRouter()
router.register('friend-requests', FriendRequestViewSet, basename='friend-request')

urlpatterns = [
    path('', include(router.urls)),
	path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/mark-read/', views.mark_notifications_read, name='mark-notifications-read'),
    path('notifications/<int:notification_id>/', views.delete_notification, name='delete-notification'),
    path('friends/', FriendListView.as_view(), name='friend-list'),
	path('unfriend/', views.unfriend_user, name='unfriend-user'),
	path('search/', UserSearchView.as_view(), name='user-search'),
    path('friend-request/cancel/<str:username>', CancelFriendRequest.as_view(), name='cancel-friend-request'),
]
