from rest_framework import serializers
from .models import Game, Friend

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'          #('id', 'Winner', 'Loser', 'WinnerScore', 'LoserScore')

class FriendSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friend
        fields = '__all__'
