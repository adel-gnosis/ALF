# tts_trigger_views.py
import json
import os
import urllib.request
import urllib.error
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import DicteeActivity

logger = logging.getLogger(__name__)


class DicteeTriggerTTSAPIView(APIView):
    """
    POST /api/dictee/trigger-tts/

    Body JSON:
      {
        "dictee_id": 113,
        "text": "optional (fallback to activity.correct_text)",
        "speeds": ["0.9","1.0"]    # optional override - otherwise each variant uses its default speed
      }

    This dispatches the GitHub Actions workflow and ALWAYS requests the four canonical
    variants: male_default, male_slow, female_default, female_rhythm.
    """
    permission_classes = [IsAuthenticated]

    # canonical set of variants we always generate per dictee
    DEFAULT_VARIANTS = ["male_default", "male_slow", "female_default", "female_rhythm"]
    # safety: maximum generated outputs per dispatch (variants * speeds)
    MAX_OUTPUTS = 8

    def post(self, request):
        logger.info(
            "DicteeTriggerTTSAPIView called by user=%s raw_data=%s",
            getattr(request.user, "id", None),
            request.data,
        )

        # ---- Basic auth hardening: only staff by default ----
        role = (getattr(request.user, "role", "") or "").lower()
        is_admin = bool(getattr(request.user, "is_superuser", False) or getattr(request.user, "is_staff", False) or role == "admin")
        if not is_admin:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        dictee_id = request.data.get("dictee_id")
        if not dictee_id:
            return Response({"detail": "dictee_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            activity = DicteeActivity.objects.get(pk=int(dictee_id))
        except (DicteeActivity.DoesNotExist, ValueError):
            logger.warning("DicteeTriggerTTSAPIView DicteeActivity not found for id=%s", dictee_id)
            return Response({"detail": "DicteeActivity not found"}, status=status.HTTP_404_NOT_FOUND)

        # text can be sent explicitly or use correct_text from DB
        text = (request.data.get("text") or activity.correct_text or "").strip()
        if not text:
            logger.warning(
                "DicteeTriggerTTSAPIView missing text for dictee_id=%s (correct_text empty)",
                activity.pk,
            )
            return Response(
                {"detail": "text is required (or correct_text must be set)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Speeds: optional override (CSV or list). If omitted, workflow will use variant defaults.
        speeds = request.data.get("speeds") or []
        if isinstance(speeds, str):
            speeds_list = [s.strip() for s in speeds.split(",") if s.strip()]
        elif isinstance(speeds, (list, tuple)):
            speeds_list = [str(s).strip() for s in speeds if str(s).strip()]
        else:
            speeds_list = []

        # Use canonical variants (always). We allow an optional 'variants' param but it will be
        # filtered to allowed defaults; if none valid, we fall back to DEFAULT_VARIANTS.
        req_variants = request.data.get("variants")
        if req_variants:
            if isinstance(req_variants, str):
                variants_list = [v.strip() for v in req_variants.split(",") if v.strip()]
            else:
                variants_list = [str(v).strip() for v in req_variants if str(v).strip()]
            # keep only allowed canonical variants
            allowed = set(self.DEFAULT_VARIANTS)
            variants_list = [v for v in variants_list if v in allowed]
            if not variants_list:
                variants_list = self.DEFAULT_VARIANTS
        else:
            variants_list = self.DEFAULT_VARIANTS

        # compute number of outputs and enforce cap
        n_speeds = max(1, len(speeds_list))  # if empty, treated as 1 default per variant
        total_outputs = len(variants_list) * n_speeds
        if total_outputs > self.MAX_OUTPUTS:
            return Response(
                {"detail": f"Too many outputs requested: {total_outputs} (limit {self.MAX_OUTPUTS})"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalize to CSV strings for workflow inputs
        variants_csv = ",".join(variants_list)
        speeds_csv = ",".join(speeds_list) if speeds_list else ""

        logger.info(
            "DicteeTriggerTTSAPIView prepared inputs dictee_id=%s variants=%s speeds=%s (total_outputs=%s)",
            activity.pk,
            variants_csv,
            speeds_csv,
            total_outputs,
        )

        owner = os.environ.get("GITHUB_TTS_OWNER", "").strip()
        repo = os.environ.get("GITHUB_TTS_REPO", "").strip()
        workflow = os.environ.get("GITHUB_TTS_WORKFLOW", "dictee_tts.yml").strip()
        ref = os.environ.get("GITHUB_TTS_REF", "main").strip()
        pat = os.environ.get("GITHUB_TTS_PAT", "").strip()

        if not (owner and repo and workflow and ref and pat):
            logger.error(
                "DicteeTriggerTTSAPIView misconfigured env: owner=%r repo=%r workflow=%r ref=%r pat_present=%r",
                owner, repo, workflow, ref, bool(pat),
            )
            return Response(
                {"detail": "Server misconfigured: missing one of GITHUB_TTS_OWNER/REPO/WORKFLOW/REF/PAT"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        url = f"https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches"

        payload = {
            "ref": ref,
            "inputs": {
                "dictee_id": str(activity.pk),
                "text": text,
                # 'voices' is now the canonical variant labels for the workflow
                "voices": variants_csv,
                # speeds optional (empty means workflow uses each variant's default)
                "speeds": speeds_csv,
            },
        }

        data = json.dumps(payload).encode("utf-8")

        logger.info(
            "DicteeTriggerTTSAPIView dispatching GitHub workflow: url=%s ref=%s dictee_id=%s payload=%s",
            url,
            ref,
            activity.pk,
            payload,
        )

        req = urllib.request.Request(
            url,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {pat}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ALF-Dictee-TTS-Dispatcher",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                # GitHub returns 204 No Content on success
                if resp.status in (204, 201):
                    logger.info("DicteeTriggerTTSAPIView dispatch successful for dictee_id=%s", activity.pk)
                    return Response(status=status.HTTP_204_NO_CONTENT)

                body = resp.read().decode("utf-8", errors="ignore")
                logger.error("Unexpected GitHub response status=%s body=%s", resp.status, body)
                return Response(
                    {"detail": "Unexpected GitHub response", "status": resp.status, "body": body},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            logger.error(
                "DicteeTriggerTTSAPIView GitHub HTTPError status=%s body=%s",
                e.code,
                body,
            )
            return Response(
                {
                    "detail": "GitHub dispatch failed",
                    "status": e.code,
                    "body": body,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            logger.exception(
                "DicteeTriggerTTSAPIView unexpected error during GitHub dispatch: %s",
                e,
            )
            return Response(
                {"detail": "GitHub dispatch failed", "error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
