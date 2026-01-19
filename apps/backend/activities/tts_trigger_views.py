import json
import os
import urllib.request
import urllib.error

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import DicteeActivity


class DicteeTriggerTTSAPIView(APIView):
    """
    POST /api/dictee/trigger-tts/

    Body JSON:
      {
        "dictee_id": 113,
        "text": "optional (fallback to activity.correct_text)",
        "voices": ["male", "female"],         # optional
        "speeds": ["0.9", "1.0"]              # optional
      }

    Dispatches GitHub Actions workflow_dispatch for dictee_tts.yml
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # ---- Basic auth hardening: only staff by default ----
        # If you have custom teacher/admin roles, replace this check accordingly.
        if not getattr(request.user, "is_staff", False):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        dictee_id = request.data.get("dictee_id")
        if not dictee_id:
            return Response({"detail": "dictee_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            activity = DicteeActivity.objects.get(pk=int(dictee_id))
        except (DicteeActivity.DoesNotExist, ValueError):
            return Response({"detail": "DicteeActivity not found"}, status=status.HTTP_404_NOT_FOUND)

        # text can be sent explicitly or use correct_text from DB
        text = (request.data.get("text") or activity.correct_text or "").strip()
        if not text:
            return Response({"detail": "text is required (or correct_text must be set)"},
                            status=status.HTTP_400_BAD_REQUEST)

        voices = request.data.get("voices") or ["male", "female"]
        speeds = request.data.get("speeds") or ["1.0"]

        # Normalize to CSV strings for workflow inputs
        if isinstance(voices, str):
            voices_csv = voices
        else:
            voices_csv = ",".join([str(v).strip() for v in voices if str(v).strip()]) or "male"

        if isinstance(speeds, str):
            speeds_csv = speeds
        else:
            speeds_csv = ",".join([str(s).strip() for s in speeds if str(s).strip()]) or "1.0"

        owner = os.environ.get("GITHUB_TTS_OWNER", "").strip()
        repo = os.environ.get("GITHUB_TTS_REPO", "").strip()
        workflow = os.environ.get("GITHUB_TTS_WORKFLOW", "dictee_tts.yml").strip()
        ref = os.environ.get("GITHUB_TTS_REF", "main").strip()
        pat = os.environ.get("GITHUB_TTS_PAT", "").strip()

        if not (owner and repo and workflow and ref and pat):
            return Response(
                {"detail": "Server misconfigured: missing one of GITHUB_TTS_OWNER/REPO/WORKFLOW/REF/PAT"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        url = f"https://api.github.com/repos/adel-gnosis/ALF/actions/workflows/{workflow}/dispatches"

        payload = {
            "ref": ref,
            "inputs": {
                "dictee_id": str(activity.pk),
                "text": text,
                "voices": voices_csv,
                "speeds": speeds_csv,
            },
        }

        data = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {pat}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                # Recommended GitHub API versioning header
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ALF-Dictee-TTS-Dispatcher",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                # GitHub returns 204 No Content on success
                if resp.status in (204, 201):
                    return Response(status=status.HTTP_204_NO_CONTENT)

                body = resp.read().decode("utf-8", errors="ignore")
                return Response(
                    {"detail": "Unexpected GitHub response", "status": resp.status, "body": body},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            return Response(
                {
                    "detail": "GitHub dispatch failed",
                    "status": e.code,
                    "body": body,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response(
                {"detail": "GitHub dispatch failed", "error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
