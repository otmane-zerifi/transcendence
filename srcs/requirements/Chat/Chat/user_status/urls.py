from django.urls import path
from . import views

app_name = 'user_status'

urlpatterns = [
    path('api/user-status/', views.UserStatusViewSet.as_view({'get': 'list'}), name='user-status-list'),
]