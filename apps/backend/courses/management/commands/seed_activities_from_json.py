import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from courses.models import Course, Level, Subject, Lesson
from activities.models import (
    MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity,
    MultipleAnswerActivity, TextInputActivity, DicteeActivity
)

User = get_user_model()

ACTIVITY_MODEL_MAP = {
    "MCQActivity": MCQActivity,
    "FillBlankActivity": FillBlankActivity,
    "MatchingActivity": MatchingActivity,
    "DragOrderActivity": DragOrderActivity,
    "ConjugationActivity": ConjugationActivity,
    "MultipleAnswerActivity": MultipleAnswerActivity,
    "TextInputActivity": TextInputActivity,
    "DicteeActivity": DicteeActivity,
}


class Command(BaseCommand):
    help = "Seed activities from structured JSON files in data/activities/"

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default="data/activities",
            help="Directory containing activity JSON files"
        )

    def handle(self, *args, **options):
        base_path = Path(options["path"])

        teacher = User.objects.filter(is_superuser=True).first()
        course = Course.objects.filter(code="FR").first()

        if not base_path.exists() or not course or not teacher:
            self.stdout.write(self.style.ERROR("Missing path, course FR, or superuser"))
            return

        created_total, skipped_total = {}, {}

        for file_path in sorted(base_path.glob("*.json")):
            self.stdout.write(self.style.NOTICE(f"\nProcessing {file_path.name}"))

            try:
                data = json.loads(file_path.read_text(encoding="utf-8"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Invalid JSON: {e}"))
                continue

            subject = Subject.objects.filter(
                title=data.get("subject"),
                course=course
            ).first()

            if not subject:
                self.stdout.write(self.style.WARNING("Subject not found. File skipped."))
                continue

            lesson_order = data.get("lesson_order", 1)

            for level_block in data.get("levels", []):
                level = Level.objects.filter(
                    code=level_block.get("level_code"),
                    course=course
                ).first()

                if not level:
                    self.stdout.write(
                        self.style.WARNING(f"Level {level_block.get('level_code')} not found")
                    )
                    continue

                lesson = Lesson.objects.filter(
                    level=level,
                    subject=subject,
                    order=lesson_order
                ).first()

                if not lesson:
                    self.stdout.write(
                        self.style.WARNING(f"Lesson missing for {level.code}")
                    )
                    continue

                created, skipped = self._create_activities(
                    lesson,
                    teacher,
                    level_block.get("activities", [])
                )

                self._merge_stats(created_total, created)
                self._merge_stats(skipped_total, skipped)

        self._print_summary(created_total, skipped_total)

    def _create_activities(self, lesson, teacher, activities):
        created, skipped = {}, {}

        for activity in activities:
            activity_type = activity.get("type")
            model = ACTIVITY_MODEL_MAP.get(activity_type)

            if not model or "question_text" not in activity:
                skipped[activity_type or "UNKNOWN"] = skipped.get(activity_type or "UNKNOWN", 0) + 1
                continue

            try:
                payload = activity.copy()
                payload.pop("type")

                model.objects.create(
                    lesson=lesson,
                    created_by=teacher,
                    is_approved=True,
                    **payload
                )

                created[activity_type] = created.get(activity_type, 0) + 1

            except Exception:
                skipped[activity_type] = skipped.get(activity_type, 0) + 1

        return created, skipped

    def _merge_stats(self, base, new):
        for k, v in new.items():
            base[k] = base.get(k, 0) + v

    def _print_summary(self, created, skipped):
        self.stdout.write(self.style.SUCCESS("\n=== SEED SUMMARY ==="))

        for k, v in created.items():
            self.stdout.write(f"✓ {k}: {v} created")

        for k, v in skipped.items():
            self.stdout.write(f"⚠ {k}: {v} skipped")

        self.stdout.write(self.style.SUCCESS("====================\n"))
