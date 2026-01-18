from django.contrib import admin
from .models import Course, Level, Subject, Lesson


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "order", "title", "code", "course_type",
        "target_language", "source_language",
        "icon", "color",
        "flag_icon", "source_flag_icon",
    )
    list_display_links = ("title",)  # ✅ add this
    list_editable = ("order",)
    list_filter = ("course_type", "target_language", "source_language")
    search_fields = ("title", "code", "description")
    ordering = ("order",)



@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ("order", "title", "code", "course", "image_url")
    list_display_links = ("title",)  # ✅ add this
    list_editable = ("order",)
    list_filter = ("course",)
    search_fields = ("title", "code", "description", "course__title", "course__code")
    ordering = ("course__order", "order")
    autocomplete_fields = ("course",)



@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = (
        "order", "title", "code", "course",
        "kind", "is_active",
        "icon", "color",
        "title_key", "description_key",
    )
    list_display_links = ("title",)  # ✅ add this
    list_editable = ("order", "is_active")
    list_filter = ("course", "kind", "is_active")
    search_fields = ("title", "code", "description", "title_key", "description_key", "course__title", "course__code")
    ordering = ("course__order", "order")
    autocomplete_fields = ("course",)



@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = (
        "order", "title",
        "level", "subject",
        "is_published", "created_by",
        "created_at", "updated_at",
    )
    list_display_links = ("title",)  # ✅ add this
    list_editable = ("order", "is_published")
    list_filter = ("level__course", "level", "subject", "is_published")
    search_fields = (
        "title", "description",
        "level__title", "level__code",
        "subject__title", "subject__code",
        "level__course__title", "level__course__code",
        "created_by__username",
    )
    ordering = ("level__course__order", "level__order", "subject__order", "order")
    autocomplete_fields = ("level", "subject", "created_by")
    date_hierarchy = "created_at"
