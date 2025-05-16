# views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import ProfileSerializer
from .utils import compress_image
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import MyUser, Profile


class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


    def list(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        profile = get_object_or_404(Profile, user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['POST'])
    def upload_picture(self, request):
        profile = self.get_queryset().first()
        if 'profile_picture' in request.FILES:
            image = request.FILES['profile_picture']
            compressed_image = compress_image(image)
            profile.profile_picture = compressed_image
            profile.save()
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)


    