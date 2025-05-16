from django.db import models
from users.models import MyUser as User
from friends.models import  Friendship
# Create your models here.
class PrivateChat(models.Model):
    groupName = models.CharField(max_length=50, unique=True)
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_user2')
    Friendship = models.ForeignKey(Friendship, on_delete=models.CASCADE)

    def __str__(self):
        return f'Chat between {self.user1.username} and {self.user2.username}'

class Message(models.Model):
    chatGroup = models.ForeignKey(PrivateChat, on_delete=models.CASCADE)
    sender = models.ForeignKey(User, related_name='sends_message', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='receives_message', on_delete=models.CASCADE)
    content = models.CharField(max_length=1000)
    timestamp = models.DateTimeField(auto_now_add=False)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.sender.name}: {self.content[:30]}'