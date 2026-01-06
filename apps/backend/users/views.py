from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserSerializer

User = get_user_model()


class LoginView(TokenObtainPairView):
    """Custom login view to include user data"""
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data[User.USERNAME_FIELD])
            serializer = UserSerializer(user)
            response.data['user'] = serializer.data
        return response


class RegisterView(APIView):
    """User registration endpoint"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'native_language': user.native_language
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """Get current authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# Language Selection Serializer
class LanguageSelectionSerializer(serializers.Serializer):
    """Serializer for language selection"""
    language = serializers.ChoiceField(choices=[('fr', 'Français'), ('en', 'English'), ('ar', 'العربية')])


# Language Selection API
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def select_language(request):
    """
    Update user's preferred UI language
    POST /api/users/select-language/
    Body: { "language": "fr" | "en" | "ar" }
    """
    serializer = LanguageSelectionSerializer(data=request.data)
    if serializer.is_valid():
        request.user.native_language = serializer.validated_data['language']
        request.user.save()
        return Response({
            'message': 'Language updated successfully',
            'language': request.user.native_language
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get current user profile with language preference
    GET /api/users/me/
    """
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'native_language': request.user.native_language,
        'role': request.user.role,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name
    })
