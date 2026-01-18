from django.core.management.base import BaseCommand
from activities.models import (
    MCQActivity, MatchingActivity, FillBlankActivity, 
    DicteeActivity, MultipleAnswerActivity, DragOrderActivity,
    ConjugationActivity, TextInputActivity
)

class Command(BaseCommand):
    help = 'Bulk populate instruction_key for all activity types'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show changes without saving',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # 1. MCQ Activities
        mcqs = MCQActivity.objects.filter(instruction_key__isnull=True) | MCQActivity.objects.filter(instruction_key='')
        self.stdout.write(f"Found {mcqs.count()} MCQ activities without instructions.")
        
        for activity in mcqs:
            # Default for MCQ
            activity.instruction_key = 'activity.mcq.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated MCQ #{activity.id}")

        # 2. Matching Activities
        matchings = MatchingActivity.objects.filter(instruction_key__isnull=True) | MatchingActivity.objects.filter(instruction_key='')
        self.stdout.write(f"\nFound {matchings.count()} Matching activities without instructions.")
        
        for activity in matchings:
            # Default for Matching
            activity.instruction_key = 'activity.matching.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated Matching #{activity.id}")

        # 3. FillBlank Activities
        fillblanks = FillBlankActivity.objects.all()
        self.stdout.write(f"\nUpdating {fillblanks.count()} FillBlank activities.")
        
        for activity in fillblanks:
            # Default for FillBlank
            activity.instruction_key = 'activity.fill_blank.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated FillBlank #{activity.id}")

        # 4. Dictee Activities
        dictees = DicteeActivity.objects.all()
        self.stdout.write(f"\nUpdating {dictees.count()} Dictee activities.")
        
        for activity in dictees:
            # Default for Dictee
            activity.instruction_key = 'activity.dictee.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated Dictee #{activity.id}")

        # 5. MultipleAnswer Activities
        multiple_answers = MultipleAnswerActivity.objects.all()
        self.stdout.write(f"\nUpdating {multiple_answers.count()} MultipleAnswer activities.")
        
        for activity in multiple_answers:
            # Default for MultipleAnswer
            activity.instruction_key = 'activity.multiple_answer.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated MultipleAnswer #{activity.id}")

        # 6. DragOrder Activities
        drag_orders = DragOrderActivity.objects.all()
        self.stdout.write(f"\nUpdating {drag_orders.count()} DragOrder activities.")
        
        for activity in drag_orders:
            # Default for DragOrder
            activity.instruction_key = 'activity.drag_order.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated DragOrder #{activity.id}")

        # 7. Conjugation Activities
        conjugations = ConjugationActivity.objects.all()
        self.stdout.write(f"\nUpdating {conjugations.count()} Conjugation activities.")
        
        for activity in conjugations:
            # Default for Conjugation
            activity.instruction_key = 'activity.conjugation.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated Conjugation #{activity.id}")

        # 8. TextInput Activities
        text_inputs = TextInputActivity.objects.all()
        self.stdout.write(f"\nUpdating {text_inputs.count()} TextInput activities.")
        
        for activity in text_inputs:
            # Default for TextInput
            activity.instruction_key = 'activity.text_input.instruction'
            if not dry_run:
                activity.save()
            self.stdout.write(f"  - Updated TextInput #{activity.id}")

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN: No changes saved.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nSuccessfully populated instruction keys.'))
