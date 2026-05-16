/**
 * taskUtils.ts — Centralised task constants, helpers and operations.
 * Import from here instead of duplicating across Tasks.tsx / MilestoneTimeline.tsx.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasks } from "./api";

// ── Constants ─────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#5b6390",
  MEDIUM: "#5B8CFF",
  HIGH: "#F59E0B",
  URGENT: "#EF4444",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const STATUS_NEXT: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

export const STATUS_LABELS: Record<string, string> = {
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam ediyor",
  DONE: "Tamamlandı",
  CANCELLED: "İptal",
};

export const SPORT_UNITS = ["dk", "km", "kg", "tekrar", "set", "kalori"] as const;

export const TEMPLATE_COLORS = [
  "#5B8CFF", "#F59E0B", "#F472B6", "#A3E635",
  "#8B5CF6", "#22D3EE", "#EF4444", "#22C55E",
];

export const CATEGORY_TEMPLATES = [
  { name: "Okul",      color: "#5B8CFF", icon: "school"   },
  { name: "İş",        color: "#F59E0B", icon: "zap"      },
  { name: "Sosyal",    color: "#F472B6", icon: "users"     },
  { name: "Spor",      color: "#A3E635", icon: "heart"     },
  { name: "Kişisel",   color: "#8B5CF6", icon: "sparkles"  },
  { name: "Sağlık",    color: "#22D3EE", icon: "target"    },
  { name: "Aile",      color: "#F59E0B", icon: "users"     },
  { name: "Alışveriş", color: "#EF4444", icon: "filter"    },
] as const;

// ── Helpers ───────────────────────────────────────────────────

/** Format minutes to "Xdk" or "X.Xs" */
export function fmtDur(min?: number | null): string {
  if (!min) return "";
  if (min < 60) return `${min}dk`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}s ${m}dk` : `${h}s`;
}

/** Is the task finished (done or cancelled)? */
export function isTaskDone(status: string): boolean {
  return status === "DONE" || status === "CANCELLED";
}

/** Next status in the toggle cycle */
export function nextStatus(current: string): string {
  return STATUS_NEXT[current] ?? "TODO";
}

// ── Category-specific form config ─────────────────────────────

export type CatFormConfig = {
  titlePlaceholder: string;
  showPriority: boolean;
  showDeadline: boolean;
  showCourse: boolean;
  showDuration: boolean;
  durationLabel: string;
  showSport: boolean;
  showNotes: boolean;
  notesPlaceholder: string;
};

export function getCatFormConfig(catName: string | null): CatFormConfig {
  const n = (catName ?? "").toLowerCase();
  const isSport  = n === "spor" || n === "sağlık";
  const isSchool = n === "okul";
  const isSocial = n === "sosyal" || n === "aile";

  return {
    titlePlaceholder: isSport  ? "Antrenman (ör: Sabah koşusu)"
                    : isSchool ? "Ödev / sınav hazırlığı"
                    : isSocial ? "Buluşma / etkinlik"
                    : "Görev başlığı…",
    showPriority:  !isSport && !isSocial,
    showDeadline:  !isSport,
    showCourse:    isSchool,
    showDuration:  true,
    durationLabel: isSport ? "Hedef süre (dk)" : "Tahmini süre (dk)",
    showSport:     isSport,
    showNotes:     true,
    notesPlaceholder: isSport  ? "Antrenman türü, hedef mesafe, set/tekrar…"
                    : isSchool ? "Notlar"
                    : isSocial ? "Kişi, yer, notlar"
                    : "Notlar",
  };
}

// ── useTaskOps hook ───────────────────────────────────────────
// Single hook for all task mutations — import once, use everywhere.

type CreatePayload = {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  categoryId?: string | null;
  parentId?: string | null;
  courseId?: string | null;
  goalId?: string | null;
  deadline?: string | null;
  estimatedMin?: number | null;
  notes?: string | null;
  isMilestone?: boolean;
  milestoneDate?: string | null;
  sportUnit?: string | null;
  sportTarget?: number | null;
  dailyRepeat?: boolean;
  repeatDays?: number[];
};

export function useTaskOps() {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const createMut = useMutation({
    mutationFn: (data: CreatePayload) => tasks.create(data),
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePayload> }) =>
      tasks.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: invalidate,
  });

  return {
    // Raw mutators (for imperative usage)
    createMut,
    updateMut,
    deleteMut,

    // Convenience wrappers
    createTask:   (data: CreatePayload)                         => createMut.mutate(data),
    updateTask:   (id: string, data: Partial<CreatePayload>)    => updateMut.mutate({ id, data }),
    deleteTask:   (id: string)                                  => deleteMut.mutate(id),
    toggleStatus: (task: { id: string; status: string })        =>
      updateMut.mutate({ id: task.id, data: { status: nextStatus(task.status) } }),
  };
}
