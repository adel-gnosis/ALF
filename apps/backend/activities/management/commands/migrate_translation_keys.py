from django.core.management.base import BaseCommand
from activities.models import (
    FillBlankActivity, MCQActivity, DicteeActivity,
    TextInputActivity, ConjugationActivity
)
import re


class Command(BaseCommand):
    help = 'Migrate existing activities to use translation keys'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually changing data',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))
        
        # Counters
        migrated_count = 0
        
        # ===== FILL BLANK ACTIVITIES =====
        self.stdout.write('\n=== Migrating FillBlankActivity ===')
        
        # Pattern 1: "Complete the phrase: <French text>"
        complete_activities = FillBlankActivity.objects.filter(
            question_text__startswith='Complete the phrase:',
            question_text_key__isnull=True  # Only migrate if not already done
        )
        
        for activity in complete_activities:
            # Extract French phrase
            match = re.search(r'Complete the phrase:\s*(.+)', activity.question_text)
            if match:
                phrase = match.group(1).strip()
                
                activity.question_text_key = 'activity.fill_blank.complete_phrase'
                activity.translation_data = {'phrase': phrase}
                
                if not dry_run:
                    activity.save()
                
                migrated_count += 1
                self.stdout.write(f'  ✓ Migrated: {activity.id} - "{phrase[:30]}..."')
        
        # Pattern 2: "Fill in the blank: <French text>"
        fill_activities = FillBlankActivity.objects.filter(
            question_text__startswith='Fill in the blank:',
            question_text_key__isnull=True
        )
        
        for activity in fill_activities:
            match = re.search(r'Fill in the blank:\s*(.+)', activity.question_text)
            if match:
                phrase = match.group(1).strip()
                
                activity.question_text_key = 'activity.fill_blank.fill_in'
                activity.translation_data = {'phrase': phrase}
                
                if not dry_run:
                    activity.save()
                
                migrated_count += 1
                self.stdout.write(f'  ✓ Migrated: {activity.id}')
        
        # ===== MCQ ACTIVITIES =====
        self.stdout.write('\n=== Migrating MCQActivity ===')
        
        # Pattern: "What is the translation of '<word>'?"
        translation_mcqs = MCQActivity.objects.filter(
            question_text__contains='translation of',
            question_text_key__isnull=True
        )
        
        for activity in translation_mcqs:
            # Extract word from question
            match = re.search(r"translation of ['\"](.+?)['\"]", activity.question_text)
            if match:
                word = match.group(1)
                
                activity.question_text_key = 'activity.mcq.translate_word'
                activity.translation_data = {'word': word}
                activity.choices_are_translatable = True  # Choices need translation!
                
                # Note: choices_keys need to be manually set based on actual choices
                # This requires a lookup table or manual review
                
                if not dry_run:
                    activity.save()
                
                migrated_count += 1
                self.stdout.write(f'  ✓ Migrated translation MCQ: {activity.id} - "{word}"')
        
        # Pattern: "Select the correct answer:"
        select_mcqs = MCQActivity.objects.filter(
            question_text__startswith='Select the correct',
            question_text_key__isnull=True
        )
        
        for activity in select_mcqs:
            # For generic "select" instructions, extract the actual question
            # This might be in explanation or needs custom parsing
            
            activity.question_text_key = 'activity.mcq.select_correct'
            activity.translation_data = {}
            # choices_are_translatable stays False (French choices)
            
            if not dry_run:
                activity.save()
            
            migrated_count += 1
            self.stdout.write(f'  ✓ Migrated select MCQ: {activity.id}')
        
        # ===== DICTEE ACTIVITIES =====
        self.stdout.write('\n=== Migrating DicteeActivity ===')
        
        dictee_activities = DicteeActivity.objects.filter(
            question_text_key__isnull=True
        )
        
        for activity in dictee_activities:
            # Standard dictation instruction
            activity.question_text_key = 'activity.dictee.instruction'
            activity.translation_data = {
                'audio_count': len(activity.audio_urls)
            }
            
            if not dry_run:
                activity.save()
            
            migrated_count += 1
            self.stdout.write(f'  ✓ Migrated dictée: {activity.id}')
        
        # ===== CONJUGATION ACTIVITIES =====
        self.stdout.write('\n=== Migrating ConjugationActivity ===')
        
        conjugation_activities = ConjugationActivity.objects.filter(
            question_text_key__isnull=True
        )
        
        for activity in conjugation_activities:
            activity.question_text_key = 'activity.conjugation.instruction'
            activity.translation_data = {
                'verb': activity.verb_infinitive,
                'tense': activity.tense,
                'pronoun': activity.pronoun
            }
            
            if not dry_run:
                activity.save()
            
            migrated_count += 1
            self.stdout.write(f'  ✓ Migrated conjugation: {activity.id} - {activity.verb_infinitive}')
        
        # ===== SUMMARY =====
        self.stdout.write(f'\n{self.style.SUCCESS("="*50)}')
        self.stdout.write(self.style.SUCCESS(f'Total activities migrated: {migrated_count}'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes were saved'))
            self.stdout.write('Run without --dry-run to apply changes')
        else:
            self.stdout.write(self.style.SUCCESS('Migration complete!'))
