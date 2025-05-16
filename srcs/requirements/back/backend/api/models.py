from django.db import models
# from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator

class Game(models.Model):
    winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, default=None, related_name='winner')
    loser = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, default=None, related_name='loser')
    winner_score = models.IntegerField(validators=[MinValueValidator(0)])
    loser_score = models.IntegerField(validators=[MinValueValidator(0)])
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Game {self.id}: Winner Score = {self.WinnerScore}, Loser Score = {self.LoserScore}"
    
class Friend(models.Model):
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user1')
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user2')

    class Meta:
        unique_together = ('user1', 'user2')
    
    def save(self, *args, **kwargs):
        if self.user1.id > self.user2.id:
            self.user1, self.user2 = self.user2, self.user1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user1.username} <==> {self.user2.username}"
