from django.db import models, transaction
from django.utils import timezone
from datetime import timedelta
from .models import Notification
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from channels.layers import get_channel_layer
from rest_framework.decorators import api_view ,  permission_classes
from asgiref.sync import async_to_sync
from rest_framework.views import APIView
from django.db.models import Q
from .models import MyUser, Friendship, FriendRequest
from .serializers import (
    FriendRequestSerializer,
    FriendListSerializer,
    NotificationSerializer,
)
from users.permissions import CheckBlacklistedRefreshTokenPermission, Check2FAPermission


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    try:
        notifications_updated = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'status': 'notifications marked as read',
            'updated_count': notifications_updated
        })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id)
        
        if notification.recipient != request.user:
            return Response(
                {'error': 'You do not have permission to delete this notification'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
        
    except Notification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unfriend_user(request):
    try:
        friend_id = request.data.get('user_id')
        if not friend_id:
            return Response(
                {"detail": "User ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            deleted_count = Friendship.objects.filter(
                (Q(user=request.user, friend_id=friend_id) |
                 Q(user_id=friend_id, friend=request.user))
            ).delete()[0]

            if deleted_count == 0:
                return Response(
                    {"detail": "Friendship not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            FriendRequest.objects.filter(
                (Q(sender=request.user, receiver_id=friend_id) |
                 Q(sender_id=friend_id, receiver=request.user))
            ).delete()

            Notification.objects.create(
                recipient_id=friend_id,
                notification_type=Notification.NotificationType.UNFRIENDED,
                data={
                    'user_name': request.user.user_name,
                    'user_id': request.user.id
                }
            )

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{friend_id}_notifications",
                {
                    "type": "new_notification"
                }
            )

        return Response({"status": "successfully unfriended user"})

    except Exception as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )



class FriendRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FriendRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FriendRequest.objects.filter(
            Q(sender=self.request.user) | 
            Q(receiver=self.request.user)
        )

    def create(self, request, *args, **kwargs):
        try:
            receiver_id = request.data.get('receiver')
            if not MyUser.objects.filter(id=receiver_id).exists():
                return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            friend_request = serializer.save(sender=request.user)

            Notification.objects.create(
                recipient=friend_request.receiver,
                notification_type=Notification.NotificationType.FRIEND_REQUEST,
                data={
                    'request_id': friend_request.id,
                    'sender_name': request.user.user_name,
                    'sender_id': request.user.id
                }
            )

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{receiver_id}_notifications",
                {
                    "type": "new_notification"
                }
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def accept(self, request):
        try:
            sender_id = request.data.get('user_id')
            if not sender_id:
                return Response({"detail": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

            friend_request = FriendRequest.objects.filter(
                sender_id=sender_id,
                receiver=request.user,
                status=FriendRequest.RequestStatus.PENDING
            ).first()

            if not friend_request:
                return Response(
                    {"detail": "No pending request found from this user"},
                    status=status.HTTP_404_NOT_FOUND
                )

            friend_request.status = FriendRequest.RequestStatus.ACCEPTED
            friend_request.save()

            Friendship.objects.create(user=friend_request.sender, friend=friend_request.receiver)
            Friendship.objects.create(user=friend_request.receiver, friend=friend_request.sender)

            Notification.objects.create(
                recipient=friend_request.sender,
                notification_type=Notification.NotificationType.REQUEST_ACCEPTED,
                data={
                    'accepter_name': request.user.user_name,
                    'accepter_id': request.user.id,
                }
            )

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{sender_id}_notifications",
                {
                    "type": "new_notification"
                }
            )
            
            return Response({"status": "friend request accepted"})

        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def reject(self, request):
        try:
            sender_id = request.data.get('user_id')
            if not sender_id:
                return Response({"detail": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

            friend_request = FriendRequest.objects.filter(
                sender_id=sender_id,
                receiver=request.user,
                status=FriendRequest.RequestStatus.PENDING
            ).first()

            if not friend_request:
                return Response(
                    {"detail": "No pending request found from this user"},
                    status=status.HTTP_404_NOT_FOUND
                )

            friend_request.status = FriendRequest.RequestStatus.REJECTED
            friend_request.save()

            Notification.objects.create(
                recipient=friend_request.sender,
                notification_type=Notification.NotificationType.REQUEST_REJECTED,
                data={
                    'rejecter_name': request.user.user_name,
                    'rejecter_id': request.user.id,
                }
            )

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{sender_id}_notifications",
                {
                    "type": "new_notification"
                }
            )
            friend_request.delete()
            return Response({"status": "friend request rejected"})

        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class FriendListView(generics.ListAPIView):
    serializer_class = FriendListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Friendship.objects.filter(user=self.request.user)

class UserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        if len(query) < 3:
            return Response([])

        users = MyUser.objects.filter(
            Q(user_name__icontains=query) |
            Q(email__icontains=query)
        ).exclude(id=request.user.id)[:10]

        result = []
        for user in users:
            user_data = {
                'id': user.id,
                'user_name': user.user_name,
                'friendship_status': self.get_friendship_status(request.user, user)
            }
            result.append(user_data)

        return Response(result)

    def get_friendship_status(self, current_user, target_user):
        if Friendship.objects.filter(user=current_user, friend=target_user).exists():
            return 'friends'
        
        if FriendRequest.objects.filter(
            sender=current_user,
            receiver=target_user,
            status=FriendRequest.RequestStatus.PENDING
        ).exists():
            return 'pending_sent'
        
        if FriendRequest.objects.filter(
            sender=target_user,
            receiver=current_user,
            status=FriendRequest.RequestStatus.PENDING
        ).exists():
            return 'pending_received'
        
        return 'none'


class CancelFriendRequest(APIView):
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, Check2FAPermission]

    def get(self, request, username):
        try:
            receiver = MyUser.objects.get(user_name=username)
            friendRequest = FriendRequest.objects.get(sender=request.user, receiver=receiver)

            notification = Notification.objects.get(
                recipient = receiver,
                notification_type = Notification.NotificationType.FRIEND_REQUEST,
                data = {
                    'request_id': friendRequest.id,
                    'sender_name': request.user.user_name,
                    'sender_id': request.user.id
                }
            )
            notification.delete()
            friendRequest.delete()

            return Response({"message": "the friend request has been removed"}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "can not remove the friend request"}, status=status.HTTP_403_FORBIDDEN)
