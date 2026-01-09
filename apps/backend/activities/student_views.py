"""
Student activity feedback endpoints
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Activity, ActivityFeedback


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_activity(request, activity_id):
    """
    POST /api/activities/{id}/report/
    
    Report issue with an activity
    
    Body: {
      "feedback_type": "INCORRECT" | "UNCLEAR" | "TYPO" | "TOO_HARD" | "TOO_EASY" | "OTHER",
      "description": "Explanation of the issue",
      "user_answer": {...}  // Optional: what they submitted
    }
    """
    activity = get_object_or_404(Activity, id=activity_id)
    
    feedback_type = request.data.get('feedback_type')
    description = request.data.get('description', '')
    user_answer = request.data.get('user_answer')
    
    valid_types = ['INCORRECT', 'UNCLEAR', 'TYPO', 'TOO_HARD', 'TOO_EASY', 'OTHER']
    if feedback_type not in valid_types:
        return Response({
            'error': f'Invalid feedback_type. Mustbe one of: {", ".join(valid_types)}'
    }, status=status.HTTP_400_BAD_REQUEST)
    # Create or update feedback (unique together on activity, user, feedback_type)
    feedback, created = ActivityFeedback.objects.update_or_create(
        activity=activity,
        user=request.user,
        feedback_type=feedback_type,
        defaults={
            'description': description,
            'user_answer': user_answer
        }
    )

    return Response({
        'message': 'Thank you for your feedback!' if created else 'Feedback updated',
        'feedback_id': feedback.id,
        'created': created
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)