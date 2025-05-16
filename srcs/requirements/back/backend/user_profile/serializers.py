from rest_framework import serializers
from .models import Profile, MatchHistory


class MatchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchHistory
        fields = ['opponent', 'result', 'date_played']


class ProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.user_name', read_only=True)
    match_history = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    games_played = serializers.IntegerField(source='user.pingpong_games_played', read_only=True)
    wins = serializers.IntegerField(source='user.pingpong_wins', read_only=True)
    losses = serializers.IntegerField(source='user.pingpong_losses', read_only=True)


    class Meta:
        model = Profile
        fields = [
            'user_name', 
            'profile_picture', 
            'level', 
            'rank', 
            'xp',
            'games_played',
            'wins', 
            'losses', 
            'match_history'
        ]

    def get_match_history(self, obj):
        matches = MatchHistory.objects.filter(user=obj.user).order_by('-date_played')[:7]
        return MatchHistorySerializer(matches, many=True).data

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if request:
            if obj.profile_picture:
                return request.build_absolute_uri(obj.profile_picture.url)
            elif obj.oauth_picture_url:
                return obj.oauth_picture_url
        return None