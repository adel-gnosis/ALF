from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from activities.i18n_catalog import TEMPLATES

from .models import Course, Level, Subject, Lesson
from .serializers import (
    CourseSerializer, 
    LevelSerializer, 
    SubjectSerializer, 
    LessonListSerializer, 
    LessonDetailSerializer,
    LessonWizardSerializer  # NEW import
)
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.translation import gettext as _
from django.utils.translation import override


SUPPORTED_LANGS = ("en", "fr", "ar")

class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    UNCHANGED: Your existing course viewset
    """
    queryset = Course.objects.all().order_by('order')
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]


class LevelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    MODIFIED: Added select_related for performance optimization
    """
    queryset = Level.objects.select_related('course').order_by('course__order', 'order')
    serializer_class = LevelSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    """
    MODIFIED: Added select_related for performance optimization
    Filter out inactive subjects by default
    """
    queryset = Subject.objects.filter(is_active=True).select_related('course').order_by('course__order', 'order')
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    MODIFIED: Added for_wizard action and course_id filter
    """
    queryset = Lesson.objects.filter(is_published=True).select_related(
        'level', 'level__course', 'subject', 'created_by'
    ).prefetch_related('activities')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LessonDetailSerializer
        return LessonListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Existing filters
        level_id = (
            self.request.query_params.get('level_id')
            or self.request.query_params.get('level')
        )
        subject_id = (
            self.request.query_params.get('subject_id')
            or self.request.query_params.get('subject')
        )

        
        # NEW: Course filter (convenience for wizard)
        course_id = self.request.query_params.get('course_id')
        
        if level_id:
            queryset = queryset.filter(level_id=level_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if course_id:
            queryset = queryset.filter(level__course_id=course_id)
        
        return queryset.order_by('level__order', 'subject__order', 'order')
    
    @action(detail=False, methods=['get'], url_path='for-wizard')
    def for_wizard(self, request):
        """
        NEW: Lightweight endpoint for activity creation wizard
        Returns lessons with minimal data (no activities loaded)
        
        GET /api/lessons/for-wizard/?level_id={id}&subject_id={id}
        """
        queryset = self.get_queryset()
        
        # Use the lightweight serializer (doesn't load activities)
        serializer = LessonWizardSerializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'lessons': serializer.data
        })


class I18nKeyViewSet(viewsets.ViewSet):
    """
    Standard i18n instruction keys for activity creation (new, catalog-driven)

    GET /api/i18n/instruction-keys/
    GET /api/i18n/instruction-keys/?activity_type=FillBlankActivity
    GET /api/i18n/instruction-keys/?activity_type=FillBlankActivity&subject=GRAMMAR
    GET /api/i18n/instruction-keys/?include_all_langs=true
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="instruction-keys")
    def instruction_keys(self, request):
        """
        Legacy-friendly endpoint.
        We'll return the same structure as /templates for consistency.
        """
        return self._templates_impl(request)


    @action(detail=False, methods=["get"], url_path="templates")
    def templates(self, request):
        """
        NEW endpoint expected by frontend:
        GET /api/i18n/templates/?activity_type=FillBlankActivity&subject=GRAMMAR&scope=instruction&include_all_langs=1
        """
        return self._templates_impl(request)


    def _templates_impl(self, request):
        activity_type = request.query_params.get("activity_type")
        subject_code = request.query_params.get("subject")  # Subject.code e.g. GRAMMAR
        scope = request.query_params.get("scope") or "instruction"
        include_all_langs = request.query_params.get("include_all_langs") in ("1", "true", "True")

        # Filter templates
        items = [t for t in TEMPLATES if (t.get("scope") == scope)]

        def is_falsy(val):
            return not val or str(val).lower() in ("null", "undefined", "all", "none")

        if not is_falsy(activity_type):
            items = [t for t in items if t.get("activity_type") and str(t.get("activity_type")).lower() == activity_type.lower()]

        if not is_falsy(subject_code):
            items = [
                t for t in items
                if (t.get("subject_code") and str(t.get("subject_code")).lower() == subject_code.lower()) or (t.get("subject_code") is None)
            ]

        def resolve_label(key: str, lang: str) -> str:
            with override(lang):
                return _(key)

        user_lang = getattr(request.user, 'native_language', 'fr')
        
        results = []
        for t in items:
            key = t["key"]

            row = {
                "key": key,
                "label": resolve_label(key, user_lang), # Default localized label
                "activity_type": t.get("activity_type"),
                "subject_code": t.get("subject_code"),
                "tags": t.get("tags", []),

                # ✅ frontend-friendly fields
                "label_fr": resolve_label(key, "fr"),
                "label_en": resolve_label(key, "en"),
                "label_ar": resolve_label(key, "ar"),
            }

            # Optional: keep the nested dict too (won’t hurt)
            if include_all_langs:
                row["labels"] = {
                    "fr": row["label_fr"],
                    "en": row["label_en"],
                    "ar": row["label_ar"],
                }

            results.append(row)

        return Response({
            "count": len(results),
            "results": results,
        })
