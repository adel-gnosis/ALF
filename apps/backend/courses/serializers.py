from rest_framework import serializers
from .models import Course, Level, Subject, Lesson
from activities.serializers import ActivityPolymorphicSerializer


class CourseSerializer(serializers.ModelSerializer):
    """
    MODIFIED: Added flag_icon, source_flag_icon, target_language, source_language
    for activity wizard support
    """
    class Meta:
        model = Course
        fields = [
            'id', 'code', 'title', 'course_type', 'description', 
            'icon', 'color', 'order',
            # NEW FIELDS for wizard:
            'target_language', 'source_language', 
            'flag_icon', 'source_flag_icon'
        ]


class LevelSerializer(serializers.ModelSerializer):
    """
    MODIFIED: Added course field for wizard context
    """
    course = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Level
        fields = [
            'id', 'title', 'description', 'code', 'order', 'image_url', 
            'course'  # Already existed, just making it explicit
        ]


class SubjectSerializer(serializers.ModelSerializer):
    """
    MODIFIED: Added new fields (kind, is_active, title_key, description_key)
    """
    course = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'title', 'description', 'icon', 'color', 'order', 
            'course',
            # NEW FIELDS:
            'kind', 'is_active', 'title_key', 'description_key'
        ]


class LessonListSerializer(serializers.ModelSerializer):
    """
    UNCHANGED: Keep your existing list serializer
    """
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    activity_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'level', 'subject', 'order', 'activity_count', 'is_published']
    
    def get_activity_count(self, obj):
        return obj.activities.count()


class LessonDetailSerializer(serializers.ModelSerializer):
    """
    UNCHANGED: Keep your existing detail serializer
    """
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    activities = ActivityPolymorphicSerializer(many=True, read_only=True)
    
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'level', 'subject', 'order', 'activities', 'is_published', 'created_at']


# NEW: Lightweight serializer for wizard (doesn't load activities)
class LessonWizardSerializer(serializers.ModelSerializer):
    """
    NEW: Minimal serializer for activity creation wizard
    Avoids loading full activity data for performance
    """
    level = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(
        source='created_by.username', 
        read_only=True, 
        allow_null=True
    )
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'description', 'order',
            'is_published', 'created_at', 'updated_at',
            'level', 'subject', 'created_by_username'
        ]
    
    def get_level(self, obj):
        return {
            'id': obj.level.id,
            'code': obj.level.code,
            'title': obj.level.title,
            'course_id': obj.level.course_id,
            'course_title': obj.level.course.title
        }
    
    def get_subject(self, obj):
        return {
            'id': obj.subject.id,
            'code': obj.subject.code,
            'title': obj.subject.title,
            'icon': obj.subject.icon,
            'color': obj.subject.color
        }