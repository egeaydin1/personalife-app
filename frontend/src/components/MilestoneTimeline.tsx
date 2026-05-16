import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasks } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────
type Task = {
  id: string; title: string; status: string; priority: string;
  isMilestone: boolean; milestoneDate?: string; deadline?: string;
  notes?: string; estimatedMin?: number; description?: string;
  subtasks?: Task[]; parentId?: string;
  category?: { name: string; color: string };
};

type MilestonePhase = "past" | "current" | "future";

// ── Helpers ───────────────────────────────────────────────────
function isDone(t: Task) { return t.status === "DONE" || t.status === "CANCELLED"; }

function phaseOf(m: Task, currentIdx: number, idx: number): MilestonePhase {
  if (isDone(m)) return "past";
  if (idx === currentIdx) return "current";
  return "future";
}

function fmtDur(min?: number | null) {
  if (!min) return "";
  return min < 60 ? `${min}dk` : `${(min / 60).toFixed(1)}s`;
}

// ── Progress ring (SVG) ───────────────────────────────────────
function Ring({ value, size = 44, color }: { value: number; size?: number; color: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={6} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6} fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

// ── Single subtask row ────────────────────────────────────────
function SubtaskRow({ task, phase, onToggle, onDelete }: {
  task: Task; phase: MilestonePhase;
  onToggle: () => void; onDelete: () => void;
}) {
  const done = isDone(task);
  const muted = phase === "future";
  const pColors: Record<string, string> = { LOW: "#5b6390", MEDIUM: "#5B8CFF", HIGH: "#F59E0B", URGENT: "#EF4444" };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "9px 12px", borderRadius: 9,
      background: done ? "rgba(34,197,94,0.04)" : "var(--surface)",
      border: `1px solid ${done ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
      opacity: muted ? 0.55 : 1,
    }}>
      <button onClick={onToggle} disabled={phase === "future"}
        style={{ background: "none", border: "none", cursor: phase === "future" ? "not-allowed" : "pointer", color: done ? "var(--success)" : "var(--text-3)", padding: 0, marginTop: 1, flexShrink: 0 }}>
        <Icon name={done ? "check-circle" : "check"} size={16} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="fs-12" style={{ fontWeight: 500, textDecoration: done ? "line-through" : "none", color: done ? "var(--text-3)" : "var(--text-0)" }}>
          {task.title}
        </span>
        <div className="row gap-6 mt-4" style={{ flexWrap: "wrap" }}>
          {task.priority && task.priority !== "MEDIUM" && (
            <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: 5, background: `${pColors[task.priority]}15`, color: pColors[task.priority] }}>
              {task.priority}
            </span>
          )}
          {task.deadline && <span className="mono dim fs-11"><Icon name="clock" size={10} /> {format(new Date(task.deadline), "d MMM")}</span>}
          {task.estimatedMin && <span className="mono dim fs-11">{fmtDur(task.estimatedMin)}</span>}
        </div>
        {task.notes && <p className="muted fs-11" style={{ marginTop: 4, lineHeight: 1.4 }}>{task.notes}</p>}
      </div>
      {!muted && (
        <button onClick={onDelete}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2, borderRadius: 4 }}
          onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--danger)"; }}
          onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}>
          <Icon name="trash" size={12} />
        </button>
      )}
    </div>
  );
}

// ── Milestone node ────────────────────────────────────────────
function MilestoneNode({
  milestone, subtasks, phase, position, total, color,
  onToggleMilestone, onToggleSubtask, onDeleteSubtask, onAddSubtask,
}: {
  milestone: Task; subtasks: Task[]; phase: MilestonePhase;
  position: number; total: number; color: string;
  onToggleMilestone: () => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onAddSubtask: (milestoneId: string) => void;
}) {
  const [expanded, setExpanded] = useState(phase !== "past");
  const [addTitle, setAddTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const done = isDone(milestone);
  const completedSubs = subtasks.filter(isDone).length;
  const totalSubs = subtasks.length;
  const progress = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : (done ? 100 : 0);

  const isPast = phase === "past";
  const isCurrent = phase === "current";
  const isFuture = phase === "future";

  // Phase colors
  const phaseColor = isPast ? "var(--success)" : isCurrent ? color : "var(--text-3)";
  const nodeSize = isCurrent ? 20 : 16;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Timeline spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
        {/* Connector above */}
        <div style={{
          width: 2, height: position === 0 ? 16 : 24,
          background: position === 0 ? "transparent" : (isPast ? "var(--success)" : "rgba(255,255,255,0.1)"),
          borderRadius: 2, marginBottom: 4,
        }} />
        {/* Node dot */}
        <div style={{
          width: nodeSize, height: nodeSize, borderRadius: "50%",
          background: isPast ? "var(--success)" : isCurrent ? color : "rgba(255,255,255,0.06)",
          border: `2px solid ${isPast ? "var(--success)" : isCurrent ? color : "rgba(255,255,255,0.15)"}`,
          boxShadow: isCurrent ? `0 0 20px ${color}66` : isPast ? "0 0 12px rgba(34,197,94,0.4)" : "none",
          display: "grid", placeItems: "center",
          fontSize: 10, color: "white", fontWeight: 700,
          flexShrink: 0, zIndex: 1,
          transition: "all 300ms",
        }}>
          {isPast ? <Icon name="check" size={10} stroke={2.5} /> : <span style={{ fontSize: 9, fontWeight: 700 }}>{position + 1}</span>}
        </div>
        {/* Connector below */}
        {position < total - 1 && (
          <div style={{
            width: 2, flex: 1, minHeight: 24,
            background: isPast ? "var(--success)" : "rgba(255,255,255,0.08)",
            borderRadius: 2, marginTop: 4,
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: position < total - 1 ? 20 : 8 }}>
        {/* Milestone header */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 14, cursor: "pointer",
            background: isCurrent
              ? `linear-gradient(135deg, ${color}12, ${color}06)`
              : isPast ? "rgba(34,197,94,0.05)" : "var(--surface)",
            border: `1px solid ${isCurrent ? `${color}40` : isPast ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
            boxShadow: isCurrent ? `0 4px 20px ${color}15` : "none",
            opacity: isFuture ? 0.6 : 1,
            transition: "all 200ms",
          }}>

          {/* Progress ring */}
          <Ring value={progress} size={isCurrent ? 48 : 40} color={phaseColor} />
          <div style={{ position: "relative", marginLeft: isCurrent ? -48 : -40, width: isCurrent ? 48 : 40, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span className="num" style={{ fontSize: isCurrent ? 12 : 10, color: phaseColor }}>{progress}%</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span className="display" style={{ fontSize: isCurrent ? 15 : 14, fontWeight: 600, letterSpacing: "-0.01em", textDecoration: isPast ? "line-through" : "none", color: isPast ? "var(--text-2)" : "var(--text-0)" }}>
                {milestone.title}
              </span>
              {isCurrent && (
                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-mono)", background: `${color}20`, color, border: `1px solid ${color}40`, letterSpacing: "0.08em" }}>
                  AKTİF
                </span>
              )}
              {isPast && <span className="chip up" style={{ fontSize: 10 }}>✓ TAMAM</span>}
              {isFuture && <span className="mono dim fs-11" style={{ letterSpacing: "0.1em" }}>BEKLIYOR</span>}
            </div>
            <div className="row gap-10">
              <span className="mono dim fs-11">{completedSubs}/{totalSubs} görev tamamlandı</span>
              {milestone.milestoneDate && (
                <span className="mono dim fs-11"><Icon name="clock" size={10} /> {format(new Date(milestone.milestoneDate), "d MMM yyyy")}</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {isCurrent && totalSubs > 0 && completedSubs === totalSubs && (
              <button className="btn primary sm"
                onClick={e => { e.stopPropagation(); onToggleMilestone(); }}
                style={{ fontSize: 11 }}>
                <Icon name="check" size={12} />Milestone tamamla
              </button>
            )}
            <Icon name={expanded ? "arrow-up" : "arrow-down"} size={14} stroke={1.5} />
          </div>
        </div>

        {/* Accordion content */}
        {expanded && (
          <div style={{ marginTop: 8, marginLeft: 8, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
            {milestone.notes && (
              <p className="muted fs-12" style={{ marginBottom: 10, lineHeight: 1.5, fontStyle: "italic" }}>"{milestone.notes}"</p>
            )}

            <div className="col gap-6">
              {subtasks.length === 0 && !isFuture && (
                <div className="muted fs-12" style={{ fontStyle: "italic", padding: "4px 0" }}>Alt görev yok.</div>
              )}
              {subtasks.map(sub => (
                <SubtaskRow key={sub.id} task={sub} phase={phase}
                  onToggle={() => onToggleSubtask(sub.id)}
                  onDelete={() => onDeleteSubtask(sub.id)} />
              ))}
              {subtasks.map(sub =>
                (sub.subtasks ?? []).map(nested => (
                  <div key={nested.id} style={{ marginLeft: 24 }}>
                    <SubtaskRow task={nested} phase={phase}
                      onToggle={() => onToggleSubtask(nested.id)}
                      onDelete={() => onDeleteSubtask(nested.id)} />
                  </div>
                ))
              )}
            </div>

            {/* Add subtask inline */}
            {!isFuture && (
              <div style={{ marginTop: 10 }}>
                {adding ? (
                  <div className="row gap-8">
                    <input autoFocus value={addTitle} onChange={e => setAddTitle(e.target.value)}
                      placeholder="Görev başlığı…"
                      onKeyDown={e => { if (e.key === "Enter" && addTitle.trim()) { onAddSubtask(milestone.id); setAddTitle(""); setAdding(false); } if (e.key === "Escape") { setAdding(false); setAddTitle(""); } }}
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 12, outline: "none" }} />
                    <button className="btn primary sm" disabled={!addTitle.trim()}
                      onClick={() => { if (addTitle.trim()) { onAddSubtask(milestone.id); setAddTitle(""); setAdding(false); } }}>
                      Ekle
                    </button>
                    <button className="btn ghost sm" onClick={() => { setAdding(false); setAddTitle(""); }}>İptal</button>
                  </div>
                ) : (
                  <button className="btn ghost sm" onClick={() => setAdding(true)} style={{ marginTop: 4 }}>
                    <Icon name="plus" size={12} />Alt görev ekle
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Timeline component ───────────────────────────────────
export function MilestoneTimeline({ allTasks, categoryColor, categoryId, categoryName }: {
  allTasks: Task[]; categoryColor: string; categoryId: string; categoryName: string;
}) {
  const qc = useQueryClient();
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: "", notes: "", milestoneDate: "" });

  // Split tasks
  const milestones = allTasks
    .filter(t => t.isMilestone && !t.parentId)
    .sort((a, b) => {
      if (a.milestoneDate && b.milestoneDate) return new Date(a.milestoneDate).getTime() - new Date(b.milestoneDate).getTime();
      return 0;
    });

  const getSubtasks = (milestoneId: string): Task[] =>
    allTasks.filter(t => t.parentId === milestoneId);

  // Current milestone = first non-done milestone
  const currentIdx = milestones.findIndex(m => !isDone(m));

  // Progress stats
  const totalMilestones = milestones.length;
  const doneMilestones = milestones.filter(isDone).length;
  const overallPct = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

  const createMut = useMutation({
    mutationFn: (d: any) => tasks.create(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function toggleTask(id: string) {
    const t = allTasks.find(x => x.id === id);
    if (!t) return;
    const next = { TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO" } as any;
    updateMut.mutate({ id, data: { status: next[t.status] ?? "TODO" } });
  }

  function completeMilestone(id: string) {
    updateMut.mutate({ id, data: { status: "DONE" } });
  }

  function addSubtask(milestoneId: string, title: string) {
    createMut.mutate({ title, parentId: milestoneId, categoryId, status: "TODO", priority: "MEDIUM" });
  }

  function createMilestone() {
    if (!milestoneForm.title.trim()) return;
    createMut.mutate({
      title: milestoneForm.title,
      notes: milestoneForm.notes || undefined,
      milestoneDate: milestoneForm.milestoneDate ? new Date(milestoneForm.milestoneDate).toISOString() : undefined,
      isMilestone: true, categoryId, status: "TODO", priority: "HIGH",
    });
    setMilestoneForm({ title: "", notes: "", milestoneDate: "" });
    setAddMilestoneOpen(false);
  }

  if (milestones.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
        <div className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Timeline boş</div>
        <p className="muted fs-13" style={{ marginBottom: 16 }}>Bu kategoride henüz milestone yok. Ekle butonuyla ilk adımı oluştur.</p>
        <button className="btn primary" onClick={() => setAddMilestoneOpen(true)}>
          <Icon name="plus" size={14} />İlk milestone'u ekle
        </button>
      </div>
    );
  }

  return (
    <div className="col gap-0">
      {/* Header progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "14px 18px", borderRadius: 14, background: `linear-gradient(135deg, ${categoryColor}10, transparent)`, border: `1px solid ${categoryColor}25` }}>
        <div>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: categoryColor }}>
            {overallPct}%
          </div>
          <div className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>
            {doneMilestones}/{totalMilestones} MILESTONE TAMAMLANDI
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Overall progress bar */}
          <div style={{ width: 200, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 50, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${overallPct}%`, background: `linear-gradient(90deg, ${categoryColor}88, ${categoryColor})`, borderRadius: 50, boxShadow: `0 0 8px ${categoryColor}66`, transition: "width 600ms cubic-bezier(.2,.8,.2,1)" }} />
          </div>
          <button className="btn ghost sm" onClick={() => setAddMilestoneOpen(s => !s)}>
            <Icon name="plus" size={13} />Milestone ekle
          </button>
        </div>
      </div>

      {/* Add milestone form */}
      {addMilestoneOpen && (
        <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 14, background: "var(--surface)", border: "1px dashed rgba(91,140,255,0.35)" }}>
          <div className="col gap-10">
            <input autoFocus value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Milestone adı… (ör: Exam Rank 3 tamamla)"
              style={{ padding: "9px 12px", borderRadius: 10, background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 14, outline: "none", width: "100%" }} />
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input value={milestoneForm.notes} onChange={e => setMilestoneForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Açıklama (opsiyonel)"
                style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 12, outline: "none" }} />
              <input type="date" value={milestoneForm.milestoneDate} onChange={e => setMilestoneForm(f => ({ ...f, milestoneDate: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 12, outline: "none" }} />
            </div>
            <div className="row gap-8">
              <button className="btn primary sm" disabled={!milestoneForm.title.trim() || createMut.isPending} onClick={createMilestone}>
                <Icon name="plus" size={13} />Milestone oluştur
              </button>
              <button className="btn ghost sm" onClick={() => setAddMilestoneOpen(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        {milestones.map((m, i) => (
          <MilestoneNode key={m.id}
            milestone={m}
            subtasks={getSubtasks(m.id)}
            phase={phaseOf(m, currentIdx, i)}
            position={i}
            total={milestones.length}
            color={categoryColor}
            onToggleMilestone={() => completeMilestone(m.id)}
            onToggleSubtask={toggleTask}
            onDeleteSubtask={id => deleteMut.mutate(id)}
            onAddSubtask={(milestoneId) => {
              const title = prompt("Alt görev adı:");
              if (title?.trim()) addSubtask(milestoneId, title.trim());
            }}
          />
        ))}
      </div>
    </div>
  );
}
