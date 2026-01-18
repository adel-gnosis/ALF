import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '../apps/backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

def update_admin():
    try:
        admin = User.objects.get(username='admin1')
        admin.is_teacher_approved = True
        admin.teacher_permission_level = 'LEAD'
        admin.role = 'admin'
        admin.save()
        print(f"✓ Updated admin1: is_teacher_approved={admin.is_teacher_approved}, permission_level={admin.teacher_permission_level}")
    except User.DoesNotExist:
        print("✗ User 'admin1' not found. Run create_console_users.py first.")

if __name__ == '__main__':
    update_admin()
