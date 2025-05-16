from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from users.models import MyUser

class Friendship(models.Model):
    user = models.ForeignKey(
        MyUser,
        related_name='friendships',
        on_delete=models.CASCADE
    )
    friend = models.ForeignKey(
        MyUser,
        related_name='friend_of',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'friend']

    def __str__(self):
        return f"{self.user.user_name} - {self.friend.user_name}"

    def clean(self):
        if self.user == self.friend:
            raise ValidationError({
                "detail": "Cannot be friends with yourself"
            })

class FriendRequest(models.Model):
    class RequestStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        ACCEPTED = 'ACCEPTED', _('Accepted')
        REJECTED = 'REJECTED', _('Rejected')
    
    sender = models.ForeignKey(
        MyUser,
        related_name='sent_friend_requests',
        on_delete=models.CASCADE
    )
    receiver = models.ForeignKey(
        MyUser,
        related_name='received_friend_requests',
        on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['sender', 'receiver']
    
    def clean(self):
        if self.sender == self.receiver:
            raise ValidationError({
                "detail": "Cannot send friend request to yourself"
            })

        if Friendship.objects.filter(user=self.sender, friend=self.receiver).exists():
            raise ValidationError({
                "detail": "Users are already friends"
            })

        existing_request = FriendRequest.objects.filter(
            sender=self.sender,
            receiver=self.receiver,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).exclude(status=self.RequestStatus.REJECTED)
        
        if existing_request.exists():
            raise ValidationError({
                "detail": "Request already sent or in cooldown"
            })

    def __str__(self):
        return f"{self.sender.user_name} -> {self.receiver.user_name} ({self.status})"



class Notification(models.Model):
    class NotificationType(models.TextChoices):
        FRIEND_REQUEST = 'FRIEND_REQUEST', 'Friend Request'
        REQUEST_ACCEPTED = 'REQUEST_ACCEPTED', 'Request Accepted'
        REQUEST_REJECTED = 'REQUEST_REJECTED', 'Request Rejected'
        UNFRIENDED = 'UNFRIENDED', 'Unfriended'

    recipient = models.ForeignKey(
        MyUser,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices
    )
    data = models.JSONField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} for {self.recipient.user_name}"
