from rest_framework import viewsets, permissions
from .models import Course, Level, Subject, Lesson
from .serializers import CourseSerializer, LevelSerializer, SubjectSerializer, LessonListSerializer, LessonDetailSerializer


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.all().order_by('order')
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]


class LevelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Level.objects.all().order_by('order')
    serializer_class = LevelSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subject.objects.all().order_by('order')
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.filter(is_published=True).select_related('level', 'subject').prefetch_related('activities')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LessonDetailSerializer
        return LessonListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        level_id = self.request.query_params.get('level')
        subject_id = self.request.query_params.get('subject')
        
        if level_id:
            queryset = queryset.filter(level_id=level_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        return queryset.order_by('level__order', 'subject__order', 'order')
