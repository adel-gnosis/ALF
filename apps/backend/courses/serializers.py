from rest_framework import serializers
from .models import Course, Level, Subject, Lesson
from activities.serializers import ActivityPolymorphicSerializer


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'code', 'title', 'course_type', 'description', 'icon', 'color', 'order']


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ['id', 'title', 'description', 'code', 'order', 'image_url', 'course']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'code', 'title', 'description', 'icon', 'color', 'order', 'course']


class LessonListSerializer(serializers.ModelSerializer):
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    activity_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'level', 'subject', 'order', 'activity_count', 'is_published']
    
    def get_activity_count(self, obj):
        return obj.activities.count()


class LessonDetailSerializer(serializers.ModelSerializer):
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    activities = ActivityPolymorphicSerializer(many=True, read_only=True)
    
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'level', 'subject', 'order', 'activities', 'is_published', 'created_at']
