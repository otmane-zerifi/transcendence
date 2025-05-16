from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import UserSession

@receiver(pre_delete, sender=get_user_model())
def user_deleted(sender, instance, **kwargs):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "user_status",
        {
            "type": "user_status_change",
            "user_id": instance.id,
            "status": "offline"
        }
    )