import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";
import { useTaskOps, fmtDur, isTaskDone, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/taskUtils";

type Task = {
  id: string; title: string; status: string; priority: string;
  isMilestone: boolean; milestoneDate?: string; deadline?: string;
  notes?: string; estimatedMin?: number;
  subtasks?: Task[]; parentId?: string | null;
};
type Phase = "past" | "current" | "future";

function phaseOf(m: Task, currentIdx: number, idx: number): Phase {
  if (isTaskDone(m.status)) return "past";
  if (idx === currentIdx) return "current";
  return "future";
}

function getSubtasks(milestone: Task): Task[] {
  return (milestone as any).subtasks ?? [];
}

function Ring({ value, size = 44, color }: { value: number; size?: number; color: string }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={6} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={6} fill="none"
        strokeDasharray={c} strokeDashoffset={c - (value / 100) * c}
        strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

function SubtaskRow({ task, phase, onToggle, onDelete }: {
  task: Task; phase: Phase; onToggle: () => void; onDelete: () => void;
}) {
  const done = isTaskDone(task.status);
  const locked = phase === "future";
  const pc = PRIORITY_COLORS[task.priority] ?? "#5B8CFF";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", borderRadius: 9,
        background: done ? "rgba(34,197,94,0.04)" : "var(--surface)",
        border: `1px solid ${done ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
        opacity: locked ? 0.5 : 1 }}>
      <button onClick={onToggle} disabled={locked}
        style={{ background: "none", border: "none", cursor: locked ? "not-allowed" : "pointer",
          color: done ? "var(--success)" : "var(--text-3)", padding: 0, marginTop: 1, flexShrink: 0 }}>
        <Icon name={done ? "check-circle" : "check"} size={16} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="fs-12" style={{ fontWeight: 500, textDecoration: done ? "line-through" : "none",
          color: done ? "var(--text-3)" : "var(--text-0)" }}>
          {task.title}
        </span>
        <div className="row gap-6 mt-4" style={{ flexWrap: "wrap" }}>
          {task.priority && task.priority !== "MEDIUM" && (
            <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", padding: "1px 6px",
              borderRadius: 5, background: `${pc}15`, color: pc }}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
          {task.deadline && <span className="mono dim fs-11"><Icon name="clock" size={10} /> {format(new Date(task.deadline), "d MMM")}</span>}
          {task.estimatedMin && <span className="mono dim fs-11">{fmtDur(task.estimatedMin)}</span>}
        </div>
        {task.notes && <p className="muted fs-11 mt-4" style={{ lineHeight: 1.4 }}>{task.notes}</p>}
      </div>
      {!locked && (
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

function MilestoneNode({ milestone, subtasks, phase, position, total, color, ops }: {
  milestone: Task; subtasks: Task[]; phase: Phase;
  position: number; total: number; color: string;
  ops: ReturnType<typeof useTaskOps>;
}) {
  const [expanded, setExpanded] = useState(phase !== "past");
  const [addTitle, setAddTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const done = isTaskDone(milestone.status);
  const completedSubs = subtasks.filter(s => isTaskDone(s.status)).length;
  const totalSubs = subtasks.length;
  const progress = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : (done ? 100 : 0);
  const phaseColor = phase === "past" ? "var(--success)" : phase === "current" ? color : "var(--text-3)";
  const nodeSize = phase === "current" ? 20 : 16;

  function saveSubtask() {
    if (!addTitle.trim()) return;
    ops.createTask({ title: addTitle.trim(), parentId: milestone.id, status: "TODO", priority: "MEDIUM" });
    setAddTitle(""); setAdding(false);
  }

  const inp: React.CSSProperties = {
    flex: 1, padding: "7px 10px", borderRadius: 8, background: "var(--surface)",
    border: "1px solid var(--border-strong)", color: "var(--text-0)",
    fontFamily: "var(--font-body)", fontSize: 12, outline: "none",
  };

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
        <div style={{ width: 2, height: position === 0 ? 16 : 24,
          background: position === 0 ? "transparent" : phase === "past" ? "var(--success)" : "rgba(255,255,255,0.1)",
          borderRadius: 2, marginBottom: 4 }} />
        <div style={{ width: nodeSize, height: nodeSize, borderRadius: "50%",
          background: phase === "past" ? "var(--success)" : phase === "current" ? color : "rgba(255,255,255,0.06)",
          border: `2px solid ${phase === "past" ? "var(--success)" : phase === "current" ? color : "rgba(255,255,255,0.15)"}`,
          boxShadow: phase === "current" ? `0 0 20px ${color}66` : phase === "past" ? "0 0 12px rgba(34,197,94,0.4)" : "none",
          display: "grid", placeItems: "center", flexShrink: 0, zIndex: 1, transition: "all 300ms" }}>
          {phase === "past"
            ? <Icon name="check" size={10} stroke={2.5} />
            : <span style={{ fontSize: 9, fontWeight: 700, color: "white" }}>{position + 1}</span>}
        </div>
        {position < total - 1 && (
          <div style={{ width: 2, flex: 1, minHeight: 24,
            background: phase === "past" ? "var(--success)" : "rgba(255,255,255,0.08)",
            borderRadius: 2, marginTop: 4 }} />
        )}
      </div>

      <div style={{ flex: 1, paddingBottom: position < total - 1 ? 20 : 8 }}>
        <div onClick={() => setExpanded(e => !e)} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 14, cursor: "pointer",
            background: phase === "current" ? `linear-gradient(135deg,${color}12,${color}06)` : phase === "past" ? "rgba(34,197,94,0.05)" : "var(--surface)",
            border: `1px solid ${phase === "current" ? `${color}40` : phase === "past" ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
            boxShadow: phase === "current" ? `0 4px 20px ${color}15` : "none",
            opacity: phase === "future" ? 0.6 : 1, transition: "all 200ms" }}>
          <div style={{ position: "relative", width: phase === "current" ? 48 : 40, height: phase === "current" ? 48 : 40, flexShrink: 0 }}>
            <Ring value={progress} size={phase === "current" ? 48 : 40} color={phaseColor} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="num" style={{ fontSize: phase === "current" ? 12 : 10, color: phaseColor }}>{progress}%</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span className="display" style={{ fontSize: phase === "current" ? 15 : 14, fontWeight: 600,
                letterSpacing: "-0.01em", textDecoration: phase === "past" ? "line-through" : "none",
                color: phase === "past" ? "var(--text-2)" : "var(--text-0)" }}>
                {milestone.title}
              </span>
              {phase === "current" && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10,
                fontFamily: "var(--font-mono)", background: `${color}20`, color, border: `1px solid ${color}40` }}>AKTİF</span>}
              {phase === "past" && <span className="chip up" style={{ fontSize: 10 }}>✓ TAMAM</span>}
              {phase === "future" && <span className="mono dim fs-11" style={{ letterSpacing: "0.1em" }}>BEKLIYOR</span>}
            </div>
            <div className="row gap-10">
              <span className="mono dim fs-11">{completedSubs}/{totalSubs} tamamlandı</span>
              {milestone.milestoneDate && (
                <span className="mono dim fs-11"><Icon name="clock" size={10} /> {format(new Date(milestone.milestoneDate), "d MMM yyyy")}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {phase === "current" && totalSubs > 0 && completedSubs === totalSubs && (
              <button className="btn primary sm" onClick={e => { e.stopPropagation(); ops.updateTask(milestone.id, { status: "DONE" }); }} style={{ fontSize: 11 }}>
                <Icon name="check" size={12} />Tamamla
              </button>
            )}
            <Icon name={expanded ? "arrow-up" : "arrow-down"} size={14} stroke={1.5} />
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop: 8, marginLeft: 8, padding: "12px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
            {milestone.notes && <p className="muted fs-12" style={{ marginBottom: 10, lineHeight: 1.5, fontStyle: "italic" }}>"{milestone.notes}"</p>}
            <div className="col gap-6">
              {subtasks.length === 0 && <div className="muted fs-12" style={{ fontStyle: "italic" }}>Alt görev yok.</div>}
              {subtasks.map(sub => (
                <SubtaskRow key={sub.id} task={sub} phase={phase}
                  onToggle={() => ops.toggleStatus(sub)}
                  onDelete={() => ops.deleteTask(sub.id)} />
              ))}
            </div>
            {phase !== "future" && (
              <div style={{ marginTop: 10 }}>
                {adding ? (
                  <div className="row gap-8">
                    <input autoFocus value={addTitle} onChange={e => setAddTitle(e.target.value)}
                      placeholder="Alt görev başlığı…" style={inp}
                      onKeyDown={e => { if (e.key === "Enter") saveSubtask(); if (e.key === "Escape") { setAdding(false); setAddTitle(""); } }} />
                    <button className="btn primary sm" disabled={!addTitle.trim() || ops.createMut.isPending} onClick={saveSubtask}>Ekle</button>
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

// ── Main export ───────────────────────────────────────────────
export function MilestoneTimeline({ allTasks, categoryColor, categoryId }: {
  allTasks: any[]; categoryColor: string; categoryId: string;
}) {
  const ops = useTaskOps();
  const [addOpen, setAddOpen] = useState(false);
  const [mForm, setMForm] = useState({ title: "", notes: "", milestoneDate: "" });

  const milestones: Task[] = allTasks
    .filter(t => t.isMilestone && !t.parentId)
    .sort((a, b) => {
      if (a.milestoneDate && b.milestoneDate)
        return new Date(a.milestoneDate).getTime() - new Date(b.milestoneDate).getTime();
      return 0;
    });

  const currentIdx = milestones.findIndex(m => !isTaskDone(m.status));
  const doneCnt = milestones.filter(m => isTaskDone(m.status)).length;
  const pct = milestones.length > 0 ? Math.round((doneCnt / milestones.length) * 100) : 0;

  function createMilestone() {
    if (!mForm.title.trim()) return;
    ops.createTask({
      title: mForm.title, notes: mForm.notes || undefined,
      milestoneDate: mForm.milestoneDate ? new Date(mForm.milestoneDate).toISOString() : undefined,
      isMilestone: true, categoryId, status: "TODO", priority: "HIGH",
    });
    setMForm({ title: "", notes: "", milestoneDate: "" });
    setAddOpen(false);
  }

  const inp: React.CSSProperties = {
    padding: "8px 10px", borderRadius: 8, background: "var(--surface)",
    border: "1px solid var(--border)", color: "var(--text-0)",
    fontFamily: "var(--font-body)", fontSize: 12, outline: "none",
  };

  if (milestones.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
        <div className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Timeline boş</div>
        <p className="muted fs-13" style={{ marginBottom: 16 }}>İlk milestone'u ekleyerek yolculuğunu başlat.</p>
        <button className="btn primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={14} />Milestone ekle</button>
        {addOpen && (
          <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 14, background: "var(--surface)", border: "1px dashed rgba(91,140,255,0.35)", textAlign: "left" }}>
            <div className="col gap-10">
              <input autoFocus value={mForm.title} onChange={e => setMForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Milestone adı…" style={{ ...inp, width: "100%" }}
                onKeyDown={e => { if (e.key === "Enter") createMilestone(); }} />
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input style={inp} value={mForm.notes} onChange={e => setMForm(f => ({ ...f, notes: e.target.value }))} placeholder="Açıklama" />
                <input type="date" style={inp} value={mForm.milestoneDate} onChange={e => setMForm(f => ({ ...f, milestoneDate: e.target.value }))} />
              </div>
              <div className="row gap-8">
                <button className="btn primary sm" disabled={!mForm.title.trim() || ops.createMut.isPending} onClick={createMilestone}><Icon name="plus" size={13} />Oluştur</button>
                <button className="btn ghost sm" onClick={() => setAddOpen(false)}>İptal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="col gap-0">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24, padding: "14px 18px", borderRadius: 14,
          background: `linear-gradient(135deg,${categoryColor}10,transparent)`,
          border: `1px solid ${categoryColor}25` }}>
        <div>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: categoryColor }}>{pct}%</div>
          <div className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>{doneCnt}/{milestones.length} MİLESTONE</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 200, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 50, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${categoryColor}88,${categoryColor})`,
              borderRadius: 50, boxShadow: `0 0 8px ${categoryColor}66`, transition: "width 600ms cubic-bezier(.2,.8,.2,1)" }} />
          </div>
          <button className="btn ghost sm" onClick={() => setAddOpen(s => !s)}><Icon name="plus" size={13} />Milestone ekle</button>
        </div>
      </div>

      {addOpen && (
        <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 14, background: "var(--surface)", border: "1px dashed rgba(91,140,255,0.35)" }}>
          <div className="col gap-10">
            <input autoFocus value={mForm.title} onChange={e => setMForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Milestone adı…" style={{ ...inp, width: "100%" }}
              onKeyDown={e => { if (e.key === "Enter") createMilestone(); if (e.key === "Escape") setAddOpen(false); }} />
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input style={inp} value={mForm.notes} onChange={e => setMForm(f => ({ ...f, notes: e.target.value }))} placeholder="Açıklama (opsiyonel)" />
              <input type="date" style={inp} value={mForm.milestoneDate} onChange={e => setMForm(f => ({ ...f, milestoneDate: e.target.value }))} />
            </div>
            <div className="row gap-8">
              <button className="btn primary sm" disabled={!mForm.title.trim() || ops.createMut.isPending} onClick={createMilestone}><Icon name="plus" size={13} />Oluştur</button>
              <button className="btn ghost sm" onClick={() => setAddOpen(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}

      <div>
        {milestones.map((m, i) => (
          <MilestoneNode key={m.id} milestone={m} subtasks={getSubtasks(m)}
            phase={phaseOf(m, currentIdx, i)} position={i} total={milestones.length}
            color={categoryColor} ops={ops} />
        ))}
      </div>
    </div>
  );
}
