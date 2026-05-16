import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { categories, courses } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import {
  PRIORITY_COLORS, PRIORITY_LABELS, STATUS_NEXT, SPORT_UNITS,
  TEMPLATE_COLORS, CATEGORY_TEMPLATES, getCatFormConfig, isTaskDone,
  useTaskOps,
} from "@/lib/taskUtils";
import { tasks } from "@/lib/api";

// Local alias so existing code doesn't break
const COLOR_PALETTE = TEMPLATE_COLORS;
const TEMPLATES = CATEGORY_TEMPLATES;

// ── Shared helpers ────────────────────────────────────────────
function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "7px 10px", borderRadius: 8, background: "var(--surface)",
    border: "1px solid var(--border)", color: "var(--text-0)",
    fontFamily: "var(--font-body)", fontSize: 12, outline: "none", ...extra,
  };
}

function PriorityBadge({ p }: { p: string }) {
  const c = PRIORITY_COLORS[p] ?? "#5B8CFF";
  return (
    <span style={{
      padding: "2px 7px", borderRadius: 6, fontSize: 9.5,
      fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
      background: `${c}18`, color: c, border: `1px solid ${c}30`,
    }}>{PRIORITY_LABELS[p]}</span>
  );
}

// ── Category-specific form config ─────────────────────────────
// getCatConfig re-exported from taskUtils as getCatFormConfig — alias for backwards compat
const getCatConfig = getCatFormConfig;

// ── Add Category Modal ────────────────────────────────────────
function AddCategoryModal({ existingNames, onClose, onCreated }: {
  existingNames: string[]; onClose: () => void; onCreated: (c: any) => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"pick" | "custom">("pick");
  const [custom, setCustom] = useState({ name: "", color: COLOR_PALETTE[0] });
  const [error, setError] = useState("");

  const createMut = useMutation({
    mutationFn: (d: any) => categories.create(d),
    onSuccess: (cat) => { qc.invalidateQueries({ queryKey: ["categories"] }); onCreated(cat); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  function pick(t: typeof TEMPLATES[0]) {
    if (existingNames.includes(t.name)) { setError(`"${t.name}" zaten mevcut`); return; }
    createMut.mutate(t);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,10,22,0.85)", zIndex: 100, display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ width: "min(500px, 92vw)", borderRadius: 20, background: "linear-gradient(180deg,#0f1530,#0a0e22)", border: "1px solid var(--border-strong)", padding: 28, boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 20 }}>
          <h2 className="display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{step === "pick" ? "Kategori şablonu" : "Özel kategori"}</h2>
          <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        {error && <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--danger)", fontSize: 12 }}>{error}</div>}

        {step === "pick" && (
          <>
            <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
              {TEMPLATES.map(t => {
                const exists = existingNames.includes(t.name);
                return (
                  <button key={t.name} onClick={() => pick(t)} disabled={exists || createMut.isPending}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 8px", borderRadius: 12, background: exists ? "var(--surface)" : `${t.color}12`, border: `1px solid ${exists ? "var(--border)" : `${t.color}44`}`, color: exists ? "var(--text-3)" : "var(--text-0)", cursor: exists ? "not-allowed" : "pointer", opacity: exists ? 0.5 : 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.color}20`, display: "grid", placeItems: "center", color: t.color, border: `1px solid ${t.color}33` }}>
                      <Icon name={t.icon as any} size={18} />
                    </div>
                    <span className="fs-12" style={{ fontWeight: 500, textAlign: "center" }}>{t.name}</span>
                    {exists && <span className="mono dim" style={{ fontSize: 9 }}>MEVCUT</span>}
                  </button>
                );
              })}
            </div>
            <div className="divider" />
            <button className="btn ghost" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setStep("custom")}>
              <Icon name="plus" size={14} />Özel kategori oluştur
            </button>
          </>
        )}

        {step === "custom" && (
          <div className="col gap-14">
            <div className="col gap-6">
              <label className="mono dim fs-11">KATEGORİ ADI</label>
              <input style={{ ...inp(), fontSize: 14 }} value={custom.name} onChange={e => setCustom(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Proje X, Bütçe…" autoFocus />
            </div>
            <div className="col gap-6">
              <label className="mono dim fs-11">RENK</label>
              <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                {COLOR_PALETTE.map(c => (
                  <button key={c} onClick={() => setCustom(f => ({ ...f, color: c }))}
                    style={{ width: 30, height: 30, borderRadius: 50, background: c, border: `3px solid ${custom.color === c ? "white" : "transparent"}`, cursor: "pointer", boxShadow: custom.color === c ? `0 0 12px ${c}` : "none" }} />
                ))}
              </div>
            </div>
            <div className="row gap-8" style={{ marginTop: 4 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep("pick")}>Geri</button>
              <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
                onClick={() => { setError(""); createMut.mutate(custom); }}
                disabled={!custom.name.trim() || createMut.isPending}>
                <Icon name="plus" size={14} />Oluştur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Task Form ─────────────────────────────────────────────
function AddTaskForm({ categoryId, categoryName, parentId, courseList, onSave, onCancel }: {
  categoryId: string | null; categoryName: string | null;
  parentId?: string | null; courseList: any[];
  onSave: (d: any) => void; onCancel: () => void;
}) {
  const cfg = getCatConfig(categoryName);
  const [form, setForm] = useState({
    title: "", description: "", priority: "MEDIUM", deadline: "",
    courseId: "", estimatedMin: "", notes: "",
    isMilestone: false, milestoneDate: "",
    sportUnit: "dk", sportTarget: "", dailyRepeat: false,
  });

  function save() {
    if (!form.title.trim()) return;
    onSave({
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline + (form.deadline.includes("T") ? "" : "T00:00:00")).toISOString() : undefined,
      courseId: form.courseId || undefined,
      categoryId: categoryId || undefined,
      parentId: parentId || undefined,
      estimatedMin: form.estimatedMin ? parseInt(form.estimatedMin) : undefined,
      notes: form.notes || undefined,
      isMilestone: form.isMilestone,
      milestoneDate: form.isMilestone && form.milestoneDate ? new Date(form.milestoneDate).toISOString() : undefined,
      sportUnit: cfg.showSport && form.sportUnit ? form.sportUnit : undefined,
      sportTarget: cfg.showSport && form.sportTarget ? parseFloat(form.sportTarget) : undefined,
      dailyRepeat: cfg.showSport ? form.dailyRepeat : false,
    });
  }

  return (
    <div style={{ padding: 14, borderRadius: 12, border: "1px dashed rgba(91,140,255,0.35)", background: "rgba(91,140,255,0.04)", marginBottom: 8 }}>
      <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder={cfg.titlePlaceholder}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }}
        style={{ width: "100%", padding: "7px 0", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 14, outline: "none", marginBottom: 10 }} />

      {/* Milestone toggle (non-sport) */}
      {!cfg.showSport && !parentId && (
        <label className="row gap-8" style={{ marginBottom: 8, cursor: "pointer", fontSize: 12, color: "var(--text-2)" }}>
          <input type="checkbox" checked={form.isMilestone} onChange={e => setForm(f => ({ ...f, isMilestone: e.target.checked }))} style={{ accentColor: "var(--amber)" }} />
          🎯 Milestone olarak işaretle
          {form.isMilestone && (
            <input type="date" value={form.milestoneDate} onChange={e => setForm(f => ({ ...f, milestoneDate: e.target.value }))}
              style={{ ...inp(), marginLeft: 8, width: "auto" }} />
          )}
        </label>
      )}

      {/* Sports-specific fields */}
      {cfg.showSport && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <select value={form.sportUnit} onChange={e => setForm(f => ({ ...f, sportUnit: e.target.value }))} style={inp()}>
            {SPORT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input type="number" placeholder="Hedef miktar" value={form.sportTarget} onChange={e => setForm(f => ({ ...f, sportTarget: e.target.value }))} style={inp()} />
          <label className="row gap-6" style={{ cursor: "pointer", fontSize: 12, color: "var(--text-2)" }}>
            <input type="checkbox" checked={form.dailyRepeat} onChange={e => setForm(f => ({ ...f, dailyRepeat: e.target.checked }))} style={{ accentColor: "var(--lime)" }} />
            Günlük tekrar
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {cfg.showPriority && (
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inp()}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        {cfg.showDeadline && (
          <input type={form.isMilestone ? "datetime-local" : "date"} value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            style={inp()} />
        )}
        {cfg.showDuration && (
          <input type="number" placeholder={cfg.durationLabel} value={form.estimatedMin}
            onChange={e => setForm(f => ({ ...f, estimatedMin: e.target.value }))}
            style={{ ...inp(), maxWidth: 160 }} />
        )}
        {cfg.showCourse && courseList.length > 0 && (
          <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} style={inp()}>
            <option value="">Ders (opsiyonel)</option>
            {courseList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {cfg.showNotes && (
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder={cfg.notesPlaceholder} rows={2}
          style={{ ...inp(), resize: "none", display: "block", width: "100%", lineHeight: 1.4, marginBottom: 8 }} />
      )}

      <div className="row gap-8">
        <button className="btn primary sm" disabled={!form.title.trim()} onClick={save}>
          <Icon name="plus" size={12} />Ekle
        </button>
        <button className="btn ghost sm" onClick={onCancel}>İptal <span className="mono dim" style={{ fontSize: 10 }}>ESC</span></button>
      </div>
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────
function TaskRow({ task, depth, catName, courseList, onToggle, onDelete }: {
  task: any; depth: number; catName: string | null;
  courseList: any[]; onToggle: () => void; onDelete: () => void;
}) {
  const [addingSub, setAddingSub] = useState(false);
  const ops = useTaskOps();
  const isDone = isTaskDone(task.status);
  const pColor = PRIORITY_COLORS[task.priority] ?? "#5B8CFF";
  const indent = depth * 24;

  return (
    <div style={{ marginLeft: indent }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10,
        background: isDone ? "rgba(255,255,255,0.02)" : task.isMilestone ? "rgba(245,158,11,0.05)" : "var(--surface)",
        border: `1px solid ${task.isMilestone ? "rgba(245,158,11,0.3)" : isDone ? "var(--border)" : "var(--border-strong)"}`,
        opacity: isDone ? 0.6 : 1, marginBottom: 5,
      }}>
        <button onClick={onToggle}
          style={{ marginTop: 1, background: "transparent", border: "none", cursor: "pointer", color: isDone ? "var(--success)" : "var(--text-3)", flexShrink: 0 }}>
          <Icon name={isDone ? "check-circle" : task.isMilestone ? "target" : "check"} size={17} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
            {task.isMilestone && <span style={{ fontSize: 14 }}>🎯</span>}
            <span className="fs-13" style={{ fontWeight: 600, textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-3)" : "var(--text-0)" }}>
              {task.title}
            </span>
            {!task.isMilestone && <PriorityBadge p={task.priority} />}
            {task.status === "IN_PROGRESS" && <span className="chip info" style={{ fontSize: 9.5 }}>DEVAM</span>}
            {task.sportUnit && task.sportTarget && (
              <span className="chip up" style={{ fontSize: 9.5 }}>🎯 {task.sportTarget}{task.sportUnit}</span>
            )}
            {task.dailyRepeat && <span className="chip info" style={{ fontSize: 9.5 }}>↻ Günlük</span>}
          </div>

          <div className="row gap-6" style={{ flexWrap: "wrap" }}>
            {task.course && <span className="chip" style={{ fontSize: 10 }}>{task.course.name}</span>}
            {task.deadline && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-mono)", background: "rgba(245,158,11,0.08)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Icon name="clock" size={10} />{format(new Date(task.deadline), "d MMM")}
              </span>
            )}
            {task.estimatedMin && <span className="chip" style={{ fontSize: 10 }}>{task.estimatedMin}dk</span>}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="mono dim fs-11">{task.subtasks.filter((s: any) => s.status === "DONE").length}/{task.subtasks.length} subtask</span>
            )}
          </div>

          {task.notes && <p className="muted fs-11" style={{ marginTop: 4, lineHeight: 1.4 }}>{task.notes}</p>}
        </div>

        <div className="row gap-4" style={{ flexShrink: 0 }}>
          {depth < 2 && (
            <button title="Alt görev ekle" onClick={() => setAddingSub(s => !s)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 3, borderRadius: 5 }}
              onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--primary)"; }}
              onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}>
              <Icon name="plus" size={13} />
            </button>
          )}
          <button onClick={onDelete}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 3, borderRadius: 5 }}
            onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--danger)"; }}
            onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>

      {/* Add subtask form */}
      {addingSub && (
        <div style={{ marginLeft: 24 }}>
          <AddTaskForm
            categoryId={task.categoryId}
            categoryName={catName}
            parentId={task.id}
            courseList={courseList}
            onSave={d => { ops.createTask(d); setAddingSub(false); }}
            onCancel={() => setAddingSub(false)}
          />
        </div>
      )}

      {/* Render subtasks recursively */}
      {task.subtasks && task.subtasks.map((sub: any) => (
        <TaskRow key={sub.id} task={sub} depth={depth + 1} catName={catName}
          courseList={courseList}
          onToggle={() => ops.toggleStatus(sub)}
          onDelete={() => ops.deleteTask(sub.id)}
        />
      ))}
    </div>
  );
}

// ── Category Section ──────────────────────────────────────────
function CategorySection({ cat, taskList, courseList, showDone }: {
  cat: { id: string; name: string; color: string; icon: string } | null;
  taskList: any[]; courseList: any[]; showDone: boolean;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const active = taskList.filter(t => !["DONE", "CANCELLED"].includes(t.status));
  const done = taskList.filter(t => ["DONE", "CANCELLED"].includes(t.status));
  const shown = showDone ? [...active, ...done] : active;
  const color = cat?.color ?? "var(--text-3)";

  // If category has milestones → always use timeline view, no toggle
  const hasMilestones = taskList.some(t => t.isMilestone && !t.parentId);
  const timelineView = hasMilestones && cat !== null;

  // All task mutations from centralised hook
  const ops = useTaskOps();

  // Separate milestones from regular tasks
  const milestones = shown.filter(t => t.isMilestone && !t.parentId);
  const regular = shown.filter(t => !t.isMilestone && !t.parentId);

  return (
    <div>
      {/* Category header */}
      <div className="row gap-10" style={{ marginBottom: collapsed ? 0 : 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer", userSelect: "none" as any }} onClick={() => setCollapsed(c => !c)}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: "grid", placeItems: "center", color, border: `1px solid ${color}33`, flexShrink: 0 }}>
            <Icon name={cat?.icon as any ?? "tasks"} size={14} />
          </div>
          <span className="display" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{cat?.name ?? "Kategorisiz"}</span>
          <span className="mono dim fs-11" style={{ letterSpacing: "0.1em" }}>
            {active.length} aktif{done.length > 0 ? ` · ${done.length} tamam` : ""}
            {hasMilestones ? ` · ${taskList.filter(t => t.isMilestone && !t.parentId).length} milestone` : ""}
          </span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}30, transparent)` }} />
          <Icon name={collapsed ? "arrow-down" : "arrow-up"} size={14} stroke={1.5} />
        </div>
        {/* Timeline indicator */}
        {hasMilestones && !collapsed && (
          <span className="chip purple" style={{ fontSize: 10, flexShrink: 0 }}>
            <Icon name="target" size={10} />Timeline modu
          </span>
        )}
      </div>

      {!collapsed && (
        <div style={{ marginLeft: 38 }}>
          {/* ── Timeline view (milestones) ── */}
          {timelineView && cat && (
            <MilestoneTimeline
              allTasks={taskList}
              categoryColor={cat.color}
              categoryId={cat.id}
              categoryName={cat.name}
            />
          )}

          {/* ── Regular (non-milestone) tasks — always visible ── */}
          {(timelineView ? regular.length > 0 || adding : true) && (
            <div style={{ marginTop: timelineView && (regular.length > 0 || adding) ? 16 : 0 }}>
              {timelineView && regular.length > 0 && (
                <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 8, paddingTop: 4 }}>DİĞER GÖREVLER</div>
              )}
              {/* Milestones as list items (only in non-timeline mode) */}
              {!timelineView && milestones.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 6 }}>MILESTONES</div>
                  {milestones.map(t => (
                    <TaskRow key={t.id} task={t} depth={0} catName={cat?.name ?? null} courseList={courseList}
                      onToggle={() => ops.toggleStatus(t)}
                      onDelete={() => ops.deleteTask(t.id)} />
                  ))}
                </div>
              )}
              {adding && (
                <AddTaskForm categoryId={cat?.id ?? null} categoryName={cat?.name ?? null} courseList={courseList}
                  onSave={d => { ops.createTask(d); setAdding(false); }} onCancel={() => setAdding(false)} />
              )}
              {regular.map(t => (
                <TaskRow key={t.id} task={t} depth={0} catName={cat?.name ?? null} courseList={courseList}
                  onToggle={() => ops.toggleStatus(t)}
                  onDelete={() => ops.deleteTask(t.id)} />
              ))}
              {shown.length === 0 && !adding && !timelineView && (
                <p className="muted fs-12" style={{ padding: "6px 0", fontStyle: "italic" }}>Henüz görev yok.</p>
              )}
              <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>
                <Icon name="plus" size={13} />Görev ekle
              </button>
            </div>
          )}
          {/* Empty state in timeline mode with no regular tasks */}
          {timelineView && regular.length === 0 && !adding && (
            <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
              <Icon name="plus" size={13} />Normal görev ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function Tasks() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | string>("all");
  const [showDone, setShowDone] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const { data: taskList = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasks.list({ topLevel: true } as any) });
  const { data: catData } = useQuery({ queryKey: ["categories"], queryFn: categories.list });
  const { data: courseList = [] } = useQuery({ queryKey: ["courses"], queryFn: () => courses.list() });

  const userCats = catData?.categories ?? [];
  const all = taskList as any[];

  const [deleteConfirmTab, setDeleteConfirmTab] = useState<string | null>(null);
  const deleteCatMut = useMutation({
    mutationFn: (id: string) => categories.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setActiveTab("all");
      setDeleteConfirmTab(null);
    },
    onError: (e: any) => { alert(e.message ?? "Silme başarısız"); setDeleteConfirmTab(null); },
  });

  // Group tasks by category
  const byCategory: Record<string, any[]> = { uncategorized: [] };
  userCats.forEach(c => { byCategory[c.id] = []; });
  all.forEach(t => {
    const key = t.categoryId && byCategory[t.categoryId] !== undefined ? t.categoryId : "uncategorized";
    byCategory[key].push(t);
  });

  const tabs = [
    { id: "all", name: "Tümü", color: "var(--text-2)", icon: "tasks" },
    ...userCats.map(c => ({ id: c.id, name: c.name, color: c.color, icon: c.icon ?? "sparkles" })),
    ...(byCategory.uncategorized.length > 0 ? [{ id: "uncategorized", name: "Kategorisiz", color: "var(--text-3)", icon: "menu" }] : []),
  ];

  const sections = activeTab === "all"
    ? [...userCats.map(c => ({ cat: c, tasks: byCategory[c.id] ?? [] })), ...(byCategory.uncategorized.length > 0 ? [{ cat: null as any, tasks: byCategory.uncategorized }] : [])]
    : activeTab === "uncategorized"
    ? [{ cat: null as any, tasks: byCategory.uncategorized ?? [] }]
    : [{ cat: userCats.find(c => c.id === activeTab) ?? null, tasks: byCategory[activeTab] ?? [] }];

  const totalActive = all.filter(t => !["DONE", "CANCELLED"].includes(t.status)).length;
  const totalDone = all.filter(t => t.status === "DONE").length;

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Görev yönetimi · kategorili · subtask destekli</span>
          <h1 className="topbar-title">Görevler.</h1>
          <span className="muted fs-13">{totalActive} aktif · {totalDone} tamamlandı · {userCats.length} kategori</span>
        </div>
        <div className="topbar-right">
          <label className="row gap-8" style={{ cursor: "pointer", fontSize: 12.5, color: "var(--text-2)" }}>
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
            Tamamlananları göster
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(t => {
          const count = t.id === "all" ? all.filter(x => !["DONE", "CANCELLED"].includes(x.status)).length : (byCategory[t.id] ?? []).filter(x => !["DONE", "CANCELLED"].includes(x.status)).length;
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 10, background: isActive ? `${t.color}15` : "var(--surface)", border: `1px solid ${isActive ? `${t.color}55` : "var(--border)"}`, color: isActive ? "var(--text-0)" : "var(--text-2)", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
              <Icon name={t.icon as any} size={13} />
              {t.name}
              {count > 0 && <span style={{ padding: "1px 6px", borderRadius: 10, background: isActive ? `${t.color}25` : "var(--surface-2)", fontSize: 10, fontFamily: "var(--font-mono)", color: isActive ? t.color : "var(--text-3)" }}>{count}</span>}
            </button>
          );
        })}

        <button onClick={() => setShowCatModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, background: "transparent", border: "1px dashed var(--border)", color: "var(--text-3)", cursor: "pointer", fontSize: 12.5, whiteSpace: "nowrap", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as any).style.borderColor = "rgba(91,140,255,0.4)"; (e.currentTarget as any).style.color = "var(--primary)"; }}
          onMouseLeave={e => { (e.currentTarget as any).style.borderColor = "var(--border)"; (e.currentTarget as any).style.color = "var(--text-3)"; }}>
          <Icon name="plus" size={13} />Kategori ekle
        </button>

        {activeTab !== "all" && activeTab !== "uncategorized" && (
          deleteConfirmTab === activeTab ? (
            <div className="row gap-6" style={{ flexShrink: 0 }}>
              <span className="mono dim fs-11">Emin misin?</span>
              <button className="btn sm" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "var(--danger)", padding: "4px 10px" }}
                onClick={() => deleteCatMut.mutate(activeTab)} disabled={deleteCatMut.isPending}>
                {deleteCatMut.isPending ? "Siliniyor..." : "Evet, sil"}
              </button>
              <button className="btn ghost sm" onClick={() => setDeleteConfirmTab(null)}>İptal</button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirmTab(activeTab)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, background: "transparent", border: "1px solid transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 12.5, flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--danger)"; }}
              onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}>
              <Icon name="trash" size={13} />Sil
            </button>
          )
        )}
      </div>

      {/* Empty state */}
      {userCats.length === 0 && all.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "52px 24px", background: "linear-gradient(180deg,rgba(91,140,255,0.04),transparent)", borderColor: "rgba(91,140,255,0.2)" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(91,140,255,0.1)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--primary)" }}>
            <Icon name="tasks" size={26} />
          </div>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Henüz kategori veya görev yok</div>
          <p className="muted fs-13" style={{ marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>
            Önce bir kategori oluştur, sonra o kategoriye görevler ekle. Subtask ve milestone desteği var.
          </p>
          <button className="btn primary" style={{ margin: "0 auto" }} onClick={() => setShowCatModal(true)}>
            <Icon name="plus" size={14} />İlk kategoriyi oluştur
          </button>
        </div>
      )}

      {/* Sections */}
      <div className="col gap-24">
        {sections.map(({ cat, tasks: catTasks }) => (
          <CategorySection key={cat?.id ?? "uncategorized"} cat={cat}
            taskList={catTasks} courseList={courseList as any[]} showDone={showDone} />
        ))}
      </div>

      {showCatModal && (
        <AddCategoryModal
          existingNames={userCats.map(c => c.name)}
          onClose={() => setShowCatModal(false)}
          onCreated={cat => setActiveTab(cat.id)}
        />
      )}
    </div>
  );
}
