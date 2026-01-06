from django.contrib import admin
from .models import Course, Level, Subject, Lesson


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'code', 'course_type', 'order']
    list_editable = ['order']
    list_filter = ['course_type']
    ordering = ['order']


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ['title', 'code', 'course', 'order']
    list_editable = ['order']
    list_filter = ['course']
    ordering = ['course__order', 'order']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'code', 'course', 'order', 'icon', 'color']
    list_editable = ['order']
    list_filter = ['course']
    ordering = ['course__order', 'order']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'level', 'subject', 'order', 'is_published', 'created_by']
    list_filter = ['level__course', 'level', 'subject', 'is_published']
    list_editable = ['order', 'is_published']
    search_fields = ['title', 'description']
    ordering = ['level__course__order', 'level__order', 'subject__order', 'order']
    
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
