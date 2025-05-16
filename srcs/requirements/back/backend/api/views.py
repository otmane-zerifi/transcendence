from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from .models import Game, Friend
from .serializers import GameSerializer, FriendSerializer
from django.contrib.auth.models import User
from users.permissions import CheckBlacklistedRefreshTokenPermission

class GameList(generics.ListCreateAPIView):
    # permission_classes = [AllowAny, CheckBlacklistedRefreshTokenPermission]
    queryset = Game.objects.all()
    serializer_class = GameSerializer

class GameDetail(generics.RetrieveAPIView):
    # permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission]
    queryset = Game.objects.all()
    serializer_class = GameSerializer

class FriendListViewPermission(BasePermission):
    message = "Friend lists are private, only a user can only check his friend list."

    def has_object_permission(self, request, view, obj):
        # if request.method in SAFE_METHODS:
        return obj.user == request.user

class FriendList(generics.ListAPIView, FriendListViewPermission):
    permission_classes = [IsAuthenticated, CheckBlacklistedRefreshTokenPermission, FriendListViewPermission]
    serializer_class = FriendSerializer

    def get_queryset(self):
        id_param = self.kwargs['pk']
        filters = Q(user1.id==id_param)
        filters |= Q(user2.id==id_param)
        queryset = Friend.objects.filter(filters)
        return queryset
        