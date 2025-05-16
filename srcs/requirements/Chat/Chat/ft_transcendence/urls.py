from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls', namespace='api')),
    path('api/user/', include('users.urls', namespace='users_auth')),
    path('api/friends/', include('friends.urls', namespace='friends')),
	path('api/userProfile/', include('user_profile.urls', namespace='user_profile')),
    path('chatapi/', include('chat.urls')),    # path('api-auth/token', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('api-auth/token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
]
