from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SessionViewSet, ProgressViewSet, PracticeViewSet,
    SubjectModeViewSet, PlacementTestViewSet
)

router = DefaultRouter()
router.register(r'sessions', SessionViewSet, basename='session')
router.register(r'progress', ProgressViewSet, basename='progress')
router.register(r'practice', PracticeViewSet, basename='practice')
router.register(r'subject', SubjectModeViewSet, basename='subject-mode')
router.register(r'placement', PlacementTestViewSet, basename='placement')

urlpatterns = [
    path('', include(router.urls)),
]
