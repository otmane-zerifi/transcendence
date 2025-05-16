from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import UserStatus
from .serializers import UserStatusSerializer
from users.permissions import CheckBlacklistedRefreshTokenPermission, Check2FAPermission

class UserStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserStatusSerializer
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, Check2FAPermission]
    
    def get_queryset(self):
        queryset = UserStatus.objects.all()
        return queryset