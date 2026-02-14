import os
import sys
import django
from django.db.models import Count, Avg, F, Q, Max, Min
from django.utils import timezone
import datetime

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from progress.models import StudySession, ActivityAttempt
from django.contrib.auth import get_user_model

User = get_user_model()

def analyze():
    print("--- User Behavior Analysis ---\n")

    total_sessions = StudySession.objects.count()
    if total_sessions == 0:
        print("No sessions found in database.")
        return

    print(f"Total Sessions: {total_sessions}")

    # 1. Stop Points (During Session)
    # Look at sessions that are NOT completed
    abandoned = StudySession.objects.filter(outcome='IN_PROGRESS')
    abandoned_count = abandoned.count()
    
    print(f"\n1. Stop Points:")
    print(f"   - Abandoned (IN_PROGRESS): {abandoned_count} ({abandoned_count/total_sessions*100:.1f}%)")
    
    if abandoned_count > 0:
        avg_done_before_quit = abandoned.aggregate(avg=Avg('activities_completed'))['avg']
        print(f"   - Avg activities completed before quitting: {avg_done_before_quit:.1f} (Target usually 30/12)")
        
        # Distribution of stop points
        stop_dist = abandoned.values('activities_completed').annotate(count=Count('id')).order_by('activities_completed')
        print("   - Stop point distribution (Activity Count):")
        for entry in stop_dist[:5]: # Show top 5
             print(f"     * After {entry['activities_completed']} activities: {entry['count']} sessions")

    # 2. Completion Patterns
    completed = StudySession.objects.filter(outcome='COMPLETED')
    completed_count = completed.count()
    
    print(f"\n2. Completion Patterns:")
    print(f"   - Completed: {completed_count} ({completed_count/total_sessions*100:.1f}%)")
    
    if completed_count > 0:
        duration_data = completed.aggregate(avg_dur=Avg('duration_seconds'))
        print(f"   - Avg Duration: {duration_data['avg_dur']/60:.1f} minutes")
        
        # Retention: Do they start another one?
        # Check sessions per user
        sessions_per_user = StudySession.objects.values('user').annotate(count=Count('id')).aggregate(avg=Avg('count'))
        print(f"   - Avg Sessions per User: {sessions_per_user['avg']:.1f}")

    # 3. Retries & Motivation
    attempts = ActivityAttempt.objects.all()
    total_attempts = attempts.count()
    retries = attempts.filter(attempt_number__gt=1).count()
    
    print(f"\n3. Motivation Metrics:")
    if total_attempts > 0:
        print(f"   - Global Retry Rate: {retries/total_attempts*100:.1f}% of attempts are retries")
    
    # Check for immediate re-engagement (approximate)
    # This is harder in aggregation, doing a simple check on 'last_activity_at' vs 'completed_at' gaps would be expensive in SQL loop
    # We'll infer from streaks if available or just raw session volume
    
    # 4. Success Rates
    passed = StudySession.objects.filter(outcome='PASSED').count()
    print(f"   - Passed (>=80%): {passed}")
    retry_needed = StudySession.objects.filter(outcome='RETRY').count()
    print(f"   - Failed/Retry Needed (<80%): {retry_needed}")
    
    # Biggest Drop-off Inference
    print(f"\n--- INFERENCE ---")
    if abandoned_count > completed_count:
        print("BIGGEST DROP-OFF: During the session (Completion Rate < 50%)")
    else:
        print("BIGGEST DROP-OFF: Between sessions (retention issue)")

if __name__ == "__main__":
    analyze()
