import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.conf import settings
from django.core.files.storage import default_storage
from .permissions import IsTeacher

class TeacherMediaViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    parser_classes = [MultiPartParser, FormParser]
    
    @action(detail=False, methods=['get'], url_path='list')
    def list_media(self, request):
        # ... (keep existing list_media logic)
        media_type = request.query_params.get('type', 'all')
        media_root = settings.MEDIA_ROOT
        
        files = []
        
        # Define search areas
        search_dirs = []
        if media_type in ('audio', 'all'):
            search_dirs.append(('audio', 'audio/'))
        if media_type in ('image', 'all'):
            search_dirs.append(('image', 'images/'))
            search_dirs.append(('image', 'uploads/'))
            
        for mtype, rel_dir in search_dirs:
            full_path = os.path.join(media_root, rel_dir)
            if os.path.exists(full_path):
                for f in os.listdir(full_path):
                    if os.path.isfile(os.path.join(full_path, f)):
                        ext = os.path.splitext(f)[1].lower()
                        item_type = mtype
                        
                        # Validate extensions
                        if mtype == 'image' and ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
                            continue
                        if mtype == 'audio' and ext not in ('.mp3', '.wav', '.ogg', '.m4a', '.mp4'):
                            continue
                        
                        files.append({
                            'name': f,
                            'url': f"{settings.MEDIA_URL}{rel_dir}{f}",
                            'type': item_type,
                            'size': os.path.getsize(os.path.join(full_path, f)),
                            'modified_at': os.path.getmtime(os.path.join(full_path, f))
                        })

        # Sort by most recent
        files.sort(key=lambda x: x['modified_at'], reverse=True)
            
        return Response({'files': files})

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_media(self, request):
        """
        POST /api/teacher/media/upload/
        Form-data:
          file: File
          type: 'image' | 'audio'
        """
        file_obj = request.FILES.get('file')
        media_type = request.data.get('type') # 'image' or 'audio'
        
        if not file_obj:
            return Response({"detail": "File is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if media_type not in ('image', 'audio'):
            return Response({"detail": "Invalid or missing type. Must be 'image' or 'audio'"}, status=status.HTTP_400_BAD_REQUEST)

        # Basic extension validation
        ext = os.path.splitext(file_obj.name)[1].lower()
        if media_type == 'image' and ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
            return Response({"detail": f"Invalid image extension: {ext}"}, status=status.HTTP_400_BAD_REQUEST)
        if media_type == 'audio' and ext not in ('.mp3', '.wav', '.ogg', '.m4a', '.mp4'):
            return Response({"detail": f"Invalid audio extension: {ext}"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine destination
        rel_dir = 'uploads/' if media_type == 'image' else 'audio/'
        safe_name = f"up_{request.user.id}_{int(os.path.getmtime(settings.MEDIA_ROOT) if os.path.exists(settings.MEDIA_ROOT) else 0)}_{file_obj.name}"
        # Make name safer by cleaning special chars if needed, but simple prefix + name usually works for dev
        # Better: use uuid or timestamp
        import time
        safe_name = f"up_{request.user.id}_{int(time.time())}_{file_obj.name.replace(' ', '_')}"
        
        rel_path = f"{rel_dir}{safe_name}"
        saved_rel_path = default_storage.save(rel_path, file_obj)
        
        url = f"{settings.MEDIA_URL}{saved_rel_path}"
        
        return Response({
            "url": url,
            "name": safe_name,
            "type": media_type
        }, status=status.HTTP_201_CREATED)
