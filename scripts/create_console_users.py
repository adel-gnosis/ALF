import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '../apps/backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

def create_users():
    print("Creating console users...")
    
    # Teacher
    teacher, created = User.objects.get_or_create(
        username='teacher1',
        defaults={
            'email': 'teacher1@alf.com',
            'role': 'teacher',
            'native_language': 'en',
            'is_staff': False,
            'is_superuser': False,
            'is_teacher_approved': True,
            'teacher_permission_level': 'BASIC'
        }
    )
    if created:
        teacher.set_password('password123')
        teacher.save()
        print("Created Teacher: teacher1 / password123")
    else:
        print("Teacher 'teacher1' already exists.")

    # Admin
    admin_user, created = User.objects.get_or_create(
        username='admin1',
        defaults={
            'email': 'admin1@alf.com',
            'role': 'admin',
            'native_language': 'en',
            'is_staff': True,
            'is_superuser': True,
            'is_teacher_approved': True,
            'teacher_permission_level': 'LEAD'
        }
    )
    if created:
        admin_user.set_password('password123')
        admin_user.save()
        print("Created Admin: admin1 / password123")
    else:
        print("Admin 'admin1' already exists.")


if __name__ == '__main__':
    create_users()
