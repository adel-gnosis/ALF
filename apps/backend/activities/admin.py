from django.contrib import admin
from django.utils.html import format_html
from django import forms
from polymorphic.admin import PolymorphicParentModelAdmin, PolymorphicChildModelAdmin, PolymorphicChildModelFilter
from .models import (
    Activity, MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity,
    DicteeActivity
)


class ActivityChildAdmin(PolymorphicChildModelAdmin):
    base_model = Activity
    list_display = ['question_text', 'lesson', 'points', 'difficulty', 'order']
    list_filter = ['difficulty', 'is_approved']
    list_editable = ['order']


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


class DicteeActivityForm(forms.ModelForm):
    """Custom form to handle audio file display properly"""
    
    class Meta:
        model = DicteeActivity
        fields = '__all__'
        widgets = {
            'audio_file': forms.ClearableFileInput(attrs={
                'accept': 'audio/*'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # If editing existing object with audio file, customize the help text
        if self.instance and self.instance.pk and self.instance.audio_file:
            file_url = self.instance.audio_file.url
            self.fields['audio_file'].help_text = format_html(
                'Current file: <a href="{}" target="_blank" rel="noopener noreferrer">{}</a><br>'
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
        # Save first to handle file upload standardly
        super().save_model(request, obj, form, change)
        
        # Then update audio_urls if a new file was uploaded
        if obj.audio_file:
            try:
                # Get the URL from the file field
                file_url = obj.audio_file.url
                
                # Fetch fresh instance from DB
                fresh_obj = self.model.objects.get(pk=obj.pk)
                current_urls = fresh_obj.audio_urls if fresh_obj.audio_urls else []
                
                # Add URL if not already in list
                if file_url not in current_urls:
                    current_urls.append(file_url)
                    # Use update to bypass save() signals/hooks
                    self.model.objects.filter(pk=obj.pk).update(audio_urls=current_urls)
                    
            except Exception as e:
                print(f"Error updating audio_urls: {e}")


@admin.register(Activity)
class ActivityParentAdmin(PolymorphicParentModelAdmin):
    base_model = Activity
    child_models = (
        MCQActivity, FillBlankActivity, MatchingActivity,
        DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity,
        DicteeActivity
    )
    list_filter = (PolymorphicChildModelFilter, 'lesson', 'difficulty', 'is_approved')
    list_display = ('__str__', 'lesson', 'points', 'difficulty', 'polymorphic_ctype')
    search_fields = ['question_text']