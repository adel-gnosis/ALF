# tts_views.py
import os
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .models import DicteeActivity


def _is_authorized(request) -> bool:
    expected = os.environ.get("DICTEE_TTS_UPLOAD_TOKEN", "")
    if not expected:
        return False
    auth = request.headers.get("Authorization", "")
    return auth == f"Bearer {expected}"


class DicteeUploadAudioAPIView(APIView):
    """
    POST /api/dictee/upload-audio/
    Headers:
      Authorization: Bearer <DICTEE_TTS_UPLOAD_TOKEN>

    Form-data:
      dictee_id: int
      voice: str (e.g. male_default/male_slow/female_default/female_rhythm)
      speed: str (e.g. 1.0 / 0.9)
      file: mp3/wav

    Saves the file and appends its URL to DicteeActivity.audio_urls
    """
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        expected = os.environ.get("DICTEE_TTS_UPLOAD_TOKEN", "")
        if not expected:
            return Response({"detail": "Server misconfigured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not _is_authorized(request):
            return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


        dictee_id = request.data.get("dictee_id")
        voice = (request.data.get("voice") or "default").strip()
        speed = (request.data.get("speed") or "1.0").strip()
        file = request.FILES.get("file")

        if not dictee_id or not file:
            return Response(
                {"detail": "dictee_id and file are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            activity = DicteeActivity.objects.get(pk=int(dictee_id))
        except (DicteeActivity.DoesNotExist, ValueError):
            return Response({"detail": "DicteeActivity not found"}, status=status.HTTP_404_NOT_FOUND)

        # Save under MEDIA_ROOT/audio/
        ext = os.path.splitext(file.name)[1].lower() or ".mp3"
        safe_name = f"dictee_{activity.pk}_{voice}_x{speed}{ext}"
        rel_path = f"audio/{safe_name}"

        saved_rel_path = default_storage.save(rel_path, file)

        # Build URL using MEDIA_URL
        media_url = settings.MEDIA_URL.rstrip("/")
        url = f"{media_url}/{saved_rel_path.lstrip('/')}"

        audio_urls = list(activity.audio_urls or [])
        if url not in audio_urls:
            audio_urls.append(url)
            activity.audio_urls = audio_urls
            activity.save(update_fields=["audio_urls"])

        return Response(
            {"dictee_id": activity.pk, "url": url, "audio_urls": activity.audio_urls},
            status=status.HTTP_200_OK,
        )
