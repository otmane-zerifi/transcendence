from django.contrib import admin
from .models import MyUser
from django.contrib.auth.admin import UserAdmin
from django.forms import TextInput, Textarea

class UserAdminConfig(UserAdmin):

    ordering = ('-user_name',)
    search_fields = ('email', 'user_name')
    list_display = ('email', 'user_name', 'last_login', 'auth', 'is_active', 'is_staff')
    fieldsets = (
        (None, {
            "fields": (
                'user_name', 'password'
            ),
        }),
        ("Personal info", {
            "fields" : (
                'email', 'first_name', 'last_name', 'joined_at', 'last_login', 'is_online' # , 'avatar'
            )
        }),
        ("Gamer profile", {
            "fields" : (
                'pingpong_games_played', 'pingpong_wins', 'pingpong_losses'
            )
        }),
        ("Authentication Method", {
            "fields" : (
                'auth',
            )
        }),
        ("Permissions", {
            "fields" : (
                'is_staff', 'is_active'
            )
        })
    )
    add_fieldsets = (
        (None, {
            "classes": ('wide',),
            "fields": ('email', 'user_name', 'password1', 'password2', 'is_active', 'is_staff')
        }),
    )

    
admin.site.register(MyUser, UserAdminConfig)
