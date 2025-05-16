from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import UserStatus
from .serializers import UserStatusSerializer

class UserStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserStatusSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = UserStatus.objects.all()
        return queryset