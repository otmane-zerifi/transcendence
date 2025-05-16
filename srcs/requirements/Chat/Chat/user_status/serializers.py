from rest_framework import serializers
from .models import UserStatus


class UserStatusSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    last_seen = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = UserStatus
        fields = ['id', 'username', 'is_online', 'last_seen', 'status', 'last_activity']
        read_only_fields = ['last_activity', 'is_online']

    def get_last_seen(self, obj):
        if obj.is_online:
            return "Online now"
        return obj.last_activity.strftime("%Y-%m-%d %H:%M:%S")

    def get_status(self, obj):
        print("i am here in checking online -> " + obj.is_online)
        if obj.is_online:
            return "online"

        from django.utils import timezone
        time_diff = timezone.now() - obj.last_activity
        
        if time_diff.days > 7: 
            return "away"
        elif time_diff.days > 0:
            return f"last seen {time_diff.days} days ago"
        elif time_diff.seconds > 3600:
            hours = time_diff.seconds // 3600
            return f"last seen {hours} hours ago"
        elif time_diff.seconds > 60:
            minutes = time_diff.seconds // 60
            return f"last seen {minutes} minutes ago"
        else:
            return "just now"