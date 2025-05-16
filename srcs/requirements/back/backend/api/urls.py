from django.urls import path
from .views import GameList, GameDetail, FriendList#, UserDetail, UserList,
# from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

app_name = 'api'

urlpatterns = [
    # path('auth/login', login.as_view(), name='login'),
    # path('auth/logout', logout.as_view(), name='logout'),
    # path('auth/register', register.as_view(), name='register'),

    # path('auth/token', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('auth/token/refresh', TokenRefreshView.as_view(), name='token_refresh'),

    # path('user/<int:pk>/', UserDetail.as_view(), name='userdetailcreate'),
    # path('users/', UserList.as_view(), name='userlistcreate'),
    path('games/', GameList.as_view(), name='gamedetailview'),
    path('game/<int:pk>/', GameDetail.as_view(), name='gamedetailview'),
    path('friends/<int:pk>/',  FriendList.as_view(), name='friendsdetailsview'),
]
