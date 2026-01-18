import React from "react";
import {
  BookOpen,
  Layers,
  Headphones,
  FileText,
  MessageCircle,
  Pencil,
  AudioLines,
  Users,
  RotateCw,
  Mic,
  Sparkles,
} from "lucide-react";

type IconProps = {
  name?: string | null;
  className?: string;
};

const SUBJECT_ICON_MAP: Record<string, React.ComponentType<any>> = {
  "book-open": BookOpen,
  "layers": Layers,
  "headphones": Headphones,
  "file-text": FileText,
  "message-circle": MessageCircle,
  "pencil": Pencil,
  "waveform": AudioLines,
  "audio-lines": AudioLines,
  "users": Users,
  "rotate-cw": RotateCw,
  "mic": Mic,
};

function normalizeIconName(raw?: string | null) {
  if (!raw) return "";
  return raw.trim().toLowerCase().replaceAll("_", "-");
}

export default function SubjectIcon({ name, className }: IconProps) {
  const key = normalizeIconName(name);
  const Icon = SUBJECT_ICON_MAP[key] || Sparkles;

  return <Icon className={className ?? "h-5 w-5"} />;
}
