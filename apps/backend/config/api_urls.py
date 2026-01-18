from django.urls import path, include
from rest_framework.routers import DefaultRouter
from courses.views import (
    CourseViewSet, 
    LevelViewSet, 
    SubjectViewSet, 
    LessonViewSet,
    I18nKeyViewSet  # NEW import
)
from users.views import RegisterView, MeView, select_language, get_current_user, LoginView
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'courses', CourseViewSet)
router.register(r'levels', LevelViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'i18n', I18nKeyViewSet, basename='i18n')  # NEW registration

# Progress routes will be added in Phase 2

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User Language Selection
    path('users/select-language/', select_language, name='select_language'),
    path('users/me/', get_current_user, name='get_current_user'),

    # API Routes
    path('', include(router.urls)),
    path('', include('progress.urls')),  # Progress routes
    path('', include('activities.urls')),  # Teacher/Admin routes
]