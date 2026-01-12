from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    level_info = serializers.SerializerMethodField()
    placement_completed = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'native_language', 'password', 'total_xp', 'current_streak', 'level_info', 'placement_completed')
        extra_kwargs = {'password': {'write_only': True}}

    def get_placement_completed(self, obj):
        # Determine if placement is "done"
        # Logic: 
        # 1. If they have ANY UserProgress with status != LOCKED, they have started.
        # 2. But specifically for "Placement Test", we usually want to know if they established a baseline.
        #    If they have a level > 1 active/completed, OR if level 1 is active with some progress > 0.
        #    OR simpler: if they have at least one UserProgress record.
        try:
            from progress.models import UserProgress
            # Simplest robust check: Does the user have any progress record?
            # If they just registered, they have 0 UserProgress rows.
            # If they took placement test, they have at least 1 row (the level assigned).
            # If they started manually, they have 1 row (Level 1).
            return UserProgress.objects.filter(user=obj).exists()
        except Exception:
            return False

    def get_level_info(self, obj):
        # Return summary of user's level status
        # This is a lightweight check, detailed progress is in /progress/
        # We need to import safely to avoid circular deps
        try:
            from progress.models import UserProgress
            progress, _ = UserProgress.objects.get_or_create(user=obj)
            return {
                'current_level': progress.current_level.level.order if progress.current_level else 1,
                'level_id': progress.current_level.level.id if progress.current_level else None
            }
        except Exception:
            return None

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
