from rest_framework import serializers
from rest_framework.exceptions import APIException
from .models import Friendship, FriendRequest
from users.models import MyUser
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'data', 'is_read', 'created_at']



class CustomValidationError(APIException):
    status_code = 400
    default_detail = "Invalid input"

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyUser
        fields = ['id', 'user_name', 'is_online']

class FriendRequestSerializer(serializers.ModelSerializer):
    sender_details = UserMinimalSerializer(source='sender', read_only=True)
    receiver_details = UserMinimalSerializer(source='receiver', read_only=True)
    
    class Meta:
        model = FriendRequest
        fields = [
            'id', 
            'sender',
            'receiver',
            'sender_details',
            'receiver_details',
            'status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['status', 'created_at', 'updated_at', 'sender']

    def validate(self, data):
        sender = self.context['request'].user
        receiver = data.get('receiver')

        if sender == receiver:
            raise CustomValidationError(detail="Cannot send friend request to yourself")

        if Friendship.objects.filter(user=sender, friend=receiver).exists():
            raise CustomValidationError(detail="Users are already friends")

        if FriendRequest.objects.filter(
            sender=sender,
            receiver=receiver,
            status=FriendRequest.RequestStatus.PENDING
        ).exists():
            raise CustomValidationError(detail="Request already sent")

        return data


class FriendListSerializer(serializers.ModelSerializer):
    friend_details = UserMinimalSerializer(source='friend', read_only=True)
    
    class Meta:
        model = Friendship
        fields = ['id', 'friend_details', 'created_at']
        read_only_fields = ['created_at']