from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .teacher_views import TeacherActivityViewSet, TeacherStatsView
from .admin_views import AdminReviewViewSet, AdminTeacherManagementViewSet
from .student_views import report_activity
from .tts_views import DicteeUploadAudioAPIView

router = DefaultRouter()
router.register(r'teacher/activities', TeacherActivityViewSet, basename='teacher-activities')
router.register(r'teacher/stats', TeacherStatsView, basename='teacher-stats')
router.register(r'admin/review', AdminReviewViewSet, basename='admin-review')
router.register(r'admin/teachers', AdminTeacherManagementViewSet, basename='admin-teachers')

urlpatterns = [
    path('', include(router.urls)),
    path('activities/<int:activity_id>/report/', report_activity, name='report-activity'),
    path('dictee/upload-audio/', DicteeUploadAudioAPIView.as_view(), name='dictee-upload-audio'),

]