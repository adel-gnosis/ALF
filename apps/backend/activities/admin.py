from django.contrib import admin
from django.utils.html import format_html
from django import forms
from polymorphic.admin import (
    PolymorphicParentModelAdmin,
    PolymorphicChildModelAdmin,
    PolymorphicChildModelFilter,
)

from .models import (
    Activity, MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity,
    TextInputActivity, DicteeActivity
)


# =========================
# Base Child Admin
# =========================

class ActivityChildAdmin(PolymorphicChildModelAdmin):
    base_model = Activity

    list_display = (
        'id',
        'question_text_key',
        'instruction_key',
        'lesson',
        'points',
        'status',
    )

    list_filter = (
        'difficulty',
        'status',
    )

    search_fields = ('question_text_key', 'instruction_key')


# =========================
# Activity Type Admins
# =========================

@admin.register(MCQActivity)
class MCQActivityAdmin(ActivityChildAdmin):
    base_model = MCQActivity


@admin.register(FillBlankActivity)
class FillBlankActivityAdmin(ActivityChildAdmin):
    base_model = FillBlankActivity


@admin.register(MatchingActivity)
class MatchingActivityAdmin(ActivityChildAdmin):
    base_model = MatchingActivity


@admin.register(DragOrderActivity)
class DragOrderActivityAdmin(ActivityChildAdmin):
    base_model = DragOrderActivity


@admin.register(ConjugationActivity)
class ConjugationActivityAdmin(ActivityChildAdmin):
    base_model = ConjugationActivity


@admin.register(MultipleAnswerActivity)
class MultipleAnswerActivityAdmin(ActivityChildAdmin):
    base_model = MultipleAnswerActivity


@admin.register(TextInputActivity)
class TextInputActivityAdmin(ActivityChildAdmin):
    base_model = TextInputActivity


# =========================
# Dictee Custom Form
# =========================

class DicteeActivityForm(forms.ModelForm):
    class Meta:
        model = DicteeActivity
        fields = '__all__'
        widgets = {
            'audio_file': forms.ClearableFileInput(attrs={'accept': 'audio/*'})
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.instance.pk and self.instance.audio_file:
            file_url = self.instance.audio_file.url
            self.fields['audio_file'].help_text = format_html(
                'Current file: <a href="{}" target="_blank">{}</a><br>'
                '<audio controls style="max-width: 400px; margin-top: 5px;">'
                '<source src="{}" type="audio/mpeg"></audio>',
                file_url,
                self.instance.audio_file.name.split('/')[-1],
                file_url
            )


@admin.register(DicteeActivity)
class DicteeActivityAdmin(ActivityChildAdmin):
    base_model = DicteeActivity
    form = DicteeActivityForm

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        if obj.audio_file:
            file_url = obj.audio_file.url
            current_urls = obj.audio_urls or []

            if file_url not in current_urls:
                current_urls.append(file_url)
                self.model.objects.filter(pk=obj.pk).update(
                    audio_urls=current_urls
                )


# =========================
# Parent Polymorphic Admin
# =========================

@admin.register(Activity)
class ActivityParentAdmin(PolymorphicParentModelAdmin):
    base_model = Activity

    child_models = (
        MCQActivity,
        FillBlankActivity,
        MatchingActivity,
        DragOrderActivity,
        ConjugationActivity,
        MultipleAnswerActivity,
        TextInputActivity,
        DicteeActivity,
    )

    list_display = (
        '__str__',
        'lesson',
        'points',
        'difficulty',
        'status',
        'polymorphic_ctype',
    )

    list_filter = (
        PolymorphicChildModelFilter,
        'lesson',
        'difficulty',
        'status',
    )

    search_fields = ('question_text_key',)
