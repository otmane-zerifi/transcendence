from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProfileViewSet
from . import views

app_name = 'user_profile'

router = DefaultRouter()
router.register(r'profile', ProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
	# path('search/', views.search_users, name='search_users'),
]