#!/usr/bin/env python
import os
import sys
import django
import json
from collections import defaultdict

# Setup Django
sys.path.insert(0, '/home/iori/Desktop/ALF/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from activities.models import (
    MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity
)
from courses.models import Lesson

# 1. Activity counts
activity_counts = {
    'MCQActivity': MCQActivity.objects.count(),
    'FillBlankActivity': FillBlankActivity.objects.count(),
    'MatchingActivity': MatchingActivity.objects.count(),
    'DragOrderActivity': DragOrderActivity.objects.count(),
    'ConjugationActivity': ConjugationActivity.objects.count(),
    'MultipleAnswerActivity': MultipleAnswerActivity.objects.count(),
    'TextInputActivity': TextInputActivity.objects.count(),
}
activity_counts['TOTAL'] = sum(activity_counts.values())

# 2. Lesson counts
lessons = Lesson.objects.all()
lesson_count = lessons.count()
activity_counts_per_lesson = [lesson.activities.count() for lesson in lessons]
min_activities = min(activity_counts_per_lesson) if activity_counts_per_lesson else 0
max_activities = max(activity_counts_per_lesson) if activity_counts_per_lesson else 0

# 3. Within-model duplicates
def get_duplicates(model_class):
    from django.db.models import Count
    duplicates = model_class.objects.values('question_text').annotate(
        count=Count('id')
    ).filter(count__gt=1).order_by('-count')
    
    examples = []
    for dup in list(duplicates)[:3]:
        examples.append({
            'question_text': dup['question_text'],
            'count': dup['count']
        })
    return {'total': duplicates.count(), 'examples': examples}

within_model_duplicates = {
    'MCQActivity': get_duplicates(MCQActivity),
    'FillBlankActivity': get_duplicates(FillBlankActivity),
    'MatchingActivity': get_duplicates(MatchingActivity),
    'DragOrderActivity': get_duplicates(DragOrderActivity),
    'ConjugationActivity': get_duplicates(ConjugationActivity),
    'MultipleAnswerActivity': get_duplicates(MultipleAnswerActivity),
    'TextInputActivity': get_duplicates(TextInputActivity),
}

# 4. Cross-model duplicates
all_questions = defaultdict(list)
for model_name, model_class in [
    ('MCQActivity', MCQActivity),
    ('FillBlankActivity', FillBlankActivity),
    ('MatchingActivity', MatchingActivity),
    ('DragOrderActivity', DragOrderActivity),
    ('ConjugationActivity', ConjugationActivity),
    ('MultipleAnswerActivity', MultipleAnswerActivity),
    ('TextInputActivity', TextInputActivity),
]:
    for activity in model_class.objects.values('question_text'):
        all_questions[activity['question_text']].append(model_name)

cross_model_duplicates = []
for question, models in all_questions.items():
    if len(set(models)) > 1:
        cross_model_duplicates.append({
            'question_text': question,
            'models': list(set(models))
        })

# 5. Sample activities (3 per model)
def get_samples(model_class, count=3):
    samples = []
    for activity in model_class.objects.select_related('lesson__subject')[:count]:
        sample = {
            'id': activity.id,
            'lesson_id': activity.lesson.id,
            'subject': activity.lesson.subject.title,
            'question_text': activity.question_text[:100],
        }
        
        if isinstance(activity, MCQActivity):
            sample['correct_answer'] = activity.correct_answer_index
        elif isinstance(activity, FillBlankActivity):
            sample['correct_answer'] = activity.correct_answer
        elif isinstance(activity, MatchingActivity):
            sample['correct_answer'] = str(activity.pairs)[:50]
        elif isinstance(activity, DragOrderActivity):
            sample['correct_answer'] = str(activity.correct_order)[:50]
        elif isinstance(activity, ConjugationActivity):
            sample['correct_answer'] = activity.correct_conjugation
        elif isinstance(activity, MultipleAnswerActivity):
            sample['correct_answer'] = activity.correct_indices
        elif isinstance(activity, TextInputActivity):
            sample['correct_answer'] = activity.correct_answers
        
        samples.append(sample)
    return samples

sample_activities = {
    'MCQActivity': get_samples(MCQActivity),
    'FillBlankActivity': get_samples(FillBlankActivity),
    'MatchingActivity': get_samples(MatchingActivity),
    'DragOrderActivity': get_samples(DragOrderActivity),
    'ConjugationActivity': get_samples(ConjugationActivity),
    'MultipleAnswerActivity': get_samples(MultipleAnswerActivity),
    'TextInputActivity': get_samples(TextInputActivity),
}

result = {
    '1_activity_counts': activity_counts,
    '2_lesson_stats': {
        'total_lessons': lesson_count,
        'min_activities_per_lesson': min_activities,
        'max_activities_per_lesson': max_activities
    },
    '3_within_model_duplicates': within_model_duplicates,
    '4_cross_model_duplicates': {
        'total': len(cross_model_duplicates),
        'examples': cross_model_duplicates[:20]
    },
    '5_sample_activities': sample_activities,
    '6_seed_file': {
        'path': '/home/iori/Desktop/ALF/backend/courses/management/commands/seed_data.py',
        'functions': [
            'create_subjects()', 'create_levels()', 'create_users()',
            'create_lessons()', 'create_activities()',
            '_create_mcq()', '_create_fill_blank()', '_create_matching()',
            '_create_drag_order()', '_create_conjugation()',
            '_create_multiple_answer()', '_create_text_input()'
        ]
    },
    '7_rerun_behavior': {
        'deletes_and_recreates': True,
        'delete_logic': 'Lines 23-24: Level.objects.all().delete() and Subject.objects.all().delete() (cascade deletes all lessons and activities)'
    },
    '8_recommendations': [
        'Use unique prompts per activity with lesson/subject context to avoid identical questions',
        'Add variation parameters (difficulty, format, vocabulary) to generation prompts',
        'Implement post-generation deduplication check before saving to database'
    ]
}

print(json.dumps(result, indent=2, ensure_ascii=False))
