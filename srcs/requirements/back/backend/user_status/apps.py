from django.apps import AppConfig

class UserStatusConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user_status'

    def ready(self):
        import user_status.signals