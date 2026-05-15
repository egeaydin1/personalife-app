import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasks, categories, courses } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";

// ── Constants ─────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#5b6390", MEDIUM: "#5B8CFF", HIGH: "#F59E0B", URGENT: "#EF4444",
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil",
};
const STATUS_NEXT: Record<string, string> = {
  TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO",
};
const STATUS_LABEL: Record<string, string> = {
  TODO: "Yapılacak", IN_PROGRESS: "Devam ediyor", DONE: "Tamamlandı", CANCELLED: "İptal",
};

// Template catalog shown in the "add category" modal
const TEMPLATES = [
  { name: "Okul",      color: "#5B8CFF", icon: "school"   },
  { name: "İş",        color: "#F59E0B", icon: "zap"      },
  { name: "Sosyal",    color: "#F472B6", icon: "users"     },
  { name: "Spor",      color: "#A3E635", icon: "heart"     },
  { name: "Kişisel",   color: "#8B5CF6", icon: "sparkles"  },
  { name: "Sağlık",    color: "#22D3EE", icon: "target"    },
  { name: "Aile",      color: "#F59E0B", icon: "users"     },
  { name: "Alışveriş", color: "#EF4444", icon: "filter"    },
];

const COLOR_PALETTE = [
  "#5B8CFF", "#F59E0B", "#F472B6", "#A3E635",
  "#8B5CF6", "#22D3EE", "#EF4444", "#22C55E",
];

// ── Add Category Modal ────────────────────────────────────────
function AddCategoryModal({ existingNames, onClose, onCreated }: {
  existingNames: string[];
  onClose: () => void;
  onCreated: (cat: any) => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"pick" | "custom">("pick");
  const [custom, setCustom] = useState({ name: "", color: COLOR_PALETTE[0], icon: "sparkles" });
  const [error, setError] = useState("");

  const createMut = useMutation({
    mutationFn: (data: any) => categories.create(data),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      onCreated(cat);
      onClose();
    },
    onError: (e: any) => setError(e.message ?? "Kategori oluşturulamadı"),
  });

  function pickTemplate(t: typeof TEMPLATES[0]) {
    if (existingNames.includes(t.name)) {
      setError(`"${t.name}" kategorisi zaten mevcut`);
      return;
    }
    createMut.mutate(t);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,10,22,0.85)", zIndex: 100, display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ width: "min(520px, 92vw)", borderRadius: 20, background: "linear-gradient(180deg, #0f1530, #0a0e22)", border: "1px solid var(--border-strong)", padding: 28, boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 20 }}>
          <h2 className="display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {step === "pick" ? "Kategori seç" : "Özel kategori"}
          </h2>
          <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--danger)", fontSize: 12, marginBottom: 14 }}>{error}</div>}

        {step === "pick" && (
          <>
            <p className="muted fs-12" style={{ marginBottom: 16, lineHeight: 1.5 }}>Bir şablonu seç veya özel kategori oluştur.</p>
            <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {TEMPLATES.map(t => {
                const exists = existingNames.includes(t.name);
                return (
                  <button key={t.name} onClick={() => pickTemplate(t)} disabled={exists || createMut.isPending}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 8px", borderRadius: 12, background: exists ? "var(--surface)" : `${t.color}12`, border: `1px solid ${exists ? "var(--border)" : `${t.color}44`}`, color: exists ? "var(--text-3)" : "var(--text-0)", cursor: exists ? "not-allowed" : "pointer", transition: "all 160ms", opacity: exists ? 0.5 : 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.color}20`, display: "grid", placeItems: "center", color: t.color, border: `1px solid ${t.color}33` }}>
                      <Icon name={t.icon} size={18} />
                    </div>
                    <span className="fs-12" style={{ fontWeight: 500, textAlign: "center" }}>{t.name}</span>
                    {exists && <span className="mono dim" style={{ fontSize: 9, letterSpacing: "0.1em" }}>MEVCUT</span>}
                  </button>
                );
              })}
            </div>
            <div className="divider" />
            <button className="btn ghost" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStep("custom")}>
              <Icon name="plus" size={14} />Özel kategori oluştur
            </button>
          </>
        )}

        {step === "custom" && (
          <div className="col gap-16">
            <div className="col gap-6">
              <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>KATEGORİ ADI</label>
              <input value={custom.name} onChange={e => setCustom(f => ({ ...f, name: e.target.value }))}
                placeholder="Örn: Proje X, Bütçe..."
                style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 14, outline: "none" }} />
            </div>
            <div className="col gap-6">
              <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>RENK</label>
              <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                {COLOR_PALETTE.map(c => (
                  <button key={c} onClick={() => setCustom(f => ({ ...f, color: c }))}
                    style={{ width: 32, height: 32, borderRadius: 50, background: c, border: `3px solid ${custom.color === c ? "white" : "transparent"}`, cursor: "pointer", boxShadow: custom.color === c ? `0 0 12px ${c}` : "none", transition: "all 160ms" }} />
                ))}
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: `${custom.color}12`, border: `1px solid ${custom.color}33`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${custom.color}20`, display: "grid", placeItems: "center", color: custom.color }}>
                <Icon name="sparkles" size={16} />
              </div>
              <span className="fs-13" style={{ fontWeight: 500 }}>{custom.name || "Kategori adı"}</span>
            </div>
            <div className="row gap-8">
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep("pick")}>Geri</button>
              <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
                onClick={() => { setError(""); createMut.mutate(custom); }}
                disabled={!custom.name.trim() || createMut.isPending}>
                <Icon name="plus" size={14} />Kategori oluştur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete }: { task: any; onToggle: () => void; onDelete: () => void }) {
  const isDone = task.status === "DONE" || task.status === "CANCELLED";
  const pColor = PRIORITY_COLORS[task.priority] ?? "#5B8CFF";

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px", borderRadius: 12,
      background: isDone ? "rgba(255,255,255,0.02)" : "var(--surface)",
      border: `1px solid ${isDone ? "var(--border)" : "var(--border-strong)"}`,
      opacity: isDone ? 0.6 : 1, transition: "opacity 200ms",
    }}>
      <button onClick={onToggle}
        style={{ marginTop: 2, background: "transparent", border: "none", cursor: "pointer", color: isDone ? "var(--success)" : "var(--text-3)", flexShrink: 0 }}>
        <Icon name={isDone ? "check-circle" : "check"} size={18} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span className="fs-13" style={{ fontWeight: 600, textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-3)" : "var(--text-0)" }}>{task.title}</span>
          <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9.5, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", background: `${pColor}18`, color: pColor, border: `1px solid ${pColor}30` }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.status === "IN_PROGRESS" && <span className="chip info" style={{ fontSize: 9.5 }}>DEVAM</span>}
        </div>
        {task.description && <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.4, marginBottom: 6 }}>{task.description}</p>}
        <div className="row gap-6" style={{ flexWrap: "wrap" }}>
          {task.course && <span className="chip" style={{ fontSize: 10 }}>{task.course.name}</span>}
          {task.deadline && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-mono)", background: "rgba(245,158,11,0.1)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Icon name="clock" size={10} />{format(new Date(task.deadline), "d MMM")}
            </span>
          )}
          {task.estimatedMin && <span className="chip" style={{ fontSize: 10 }}>{task.estimatedMin}dk</span>}
        </div>
      </div>
      <button onClick={onDelete}
        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", flexShrink: 0, padding: 4 }}
        onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--danger)"; }}
        onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}>
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

// ── Category-specific form config ────────────────────────────
function getCategoryConfig(catName: string | null) {
  const n = (catName ?? "").toLowerCase();
  if (n === "spor" || n === "sağlık") return {
    titlePlaceholder: "Antrenman / aktivite (ör: Sabah koşusu)",
    showPriority: false,
    showDeadline: false,
    showCourse: false,
    showDuration: true,
    durationLabel: "Hedef süre (dk)",
    showNotes: true,
    notesPlaceholder: "Antrenman türü, hedef mesafe, set/tekrar sayısı…",
    extraFields: [
      { key: "description", label: "Antrenman türü", placeholder: "Kardio / Ağırlık / Yüzme / Futbol…" },
    ],
  };
  if (n === "okul") return {
    titlePlaceholder: "Ödev / çalışma / sınav hazırlığı",
    showPriority: true,
    showDeadline: true,
    showCourse: true,
    showDuration: true,
    durationLabel: "Tahmini süre (dk)",
    showNotes: false,
    notesPlaceholder: "",
    extraFields: [],
  };
  if (n === "iş" || n === "proje") return {
    titlePlaceholder: "Görev / deliverable",
    showPriority: true,
    showDeadline: true,
    showCourse: false,
    showDuration: true,
    durationLabel: "Tahmini süre (dk)",
    showNotes: true,
    notesPlaceholder: "Proje bağlamı, notlar…",
    extraFields: [],
  };
  if (n === "sosyal" || n === "aile") return {
    titlePlaceholder: "Buluşma / etkinlik (ör: Kahve with Ali)",
    showPriority: false,
    showDeadline: true,
    showCourse: false,
    showDuration: false,
    durationLabel: "",
    showNotes: true,
    notesPlaceholder: "Kişi, yer, notlar…",
    extraFields: [],
  };
  // Default
  return {
    titlePlaceholder: "Görev başlığı…",
    showPriority: true,
    showDeadline: true,
    showCourse: false,
    showDuration: true,
    durationLabel: "Tahmini süre (dk)",
    showNotes: false,
    notesPlaceholder: "",
    extraFields: [],
  };
}

// ── Add Task inline form ───────────────────────────────────────
function AddTaskForm({ categoryId, categoryName, courseList, onSave, onCancel }: {
  categoryId: string | null;
  categoryName: string | null;
  courseList: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const cfg = getCategoryConfig(categoryName);
  const [form, setForm] = useState({
    title: "", description: "", priority: "MEDIUM", deadline: "", courseId: "", estimatedMin: "", notes: "",
  });

  function inputStyle(): React.CSSProperties {
    return { padding: "7px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 12, outline: "none", width: "100%" };
  }

  function save() {
    if (!form.title.trim()) return;
    onSave({
      ...form,
      categoryId,
      deadline: form.deadline ? new Date(form.deadline + "T00:00:00").toISOString() : undefined,
      courseId: form.courseId || undefined,
      estimatedMin: form.estimatedMin ? parseInt(form.estimatedMin) : undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <div style={{ padding: "16px", borderRadius: 12, border: "1px dashed rgba(91,140,255,0.35)", background: "rgba(91,140,255,0.04)", marginBottom: 8 }}>
      <input
        autoFocus
        value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        placeholder={cfg.titlePlaceholder}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }}
        style={{ width: "100%", padding: "8px 0", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 14, outline: "none", marginBottom: 12 }}
      />

      {/* Extra category-specific description fields */}
      {cfg.extraFields.map(f => (
        <input key={f.key} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
          placeholder={f.placeholder}
          style={{ ...inputStyle(), marginBottom: 8, display: "block" }} />
      ))}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {cfg.showPriority && (
          <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={inputStyle()}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        {cfg.showDeadline && (
          <input type="date" value={form.deadline}
            onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
            style={inputStyle()} />
        )}
        {cfg.showDuration && (
          <input type="number" placeholder={cfg.durationLabel} value={form.estimatedMin}
            onChange={e => setForm(p => ({ ...p, estimatedMin: e.target.value }))}
            style={{ ...inputStyle(), maxWidth: 160 }} />
        )}
        {cfg.showCourse && courseList.length > 0 && (
          <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} style={inputStyle()}>
            <option value="">Ders (opsiyonel)</option>
            {courseList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {cfg.showNotes && (
        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder={cfg.notesPlaceholder} rows={2}
          style={{ ...inputStyle(), resize: "none", display: "block", lineHeight: 1.4, marginBottom: 10 }} />
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

// ── Category section ──────────────────────────────────────────
function CategorySection({ cat, taskList, courseList, showDone }: {
  cat: { id: string; name: string; color: string; icon: string } | null;
  taskList: any[];  courseList: any[];
  showDone: boolean;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const active = taskList.filter(t => t.status !== "DONE" && t.status !== "CANCELLED");
  const done = taskList.filter(t => t.status === "DONE" || t.status === "CANCELLED");
  const shown = showDone ? [...active, ...done] : active;
  const color = cat?.color ?? "var(--text-3)";

  const createMut = useMutation({
    mutationFn: (data: any) => tasks.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setAdding(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div>
      {/* Category header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: collapsed ? 0 : 10, cursor: "pointer", userSelect: "none" }} onClick={() => setCollapsed(c => !c)}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: "grid", placeItems: "center", color, border: `1px solid ${color}33`, flexShrink: 0 }}>
          <Icon name={cat?.icon ?? "tasks"} size={14} />
        </div>
        <span className="display" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {cat?.name ?? "Kategorisiz"}
        </span>
        <span className="mono dim fs-11" style={{ letterSpacing: "0.1em" }}>{active.length} aktif{done.length > 0 ? ` · ${done.length} tamamlandı` : ""}</span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}30, transparent)` }} />
        <Icon name={collapsed ? "arrow-down" : "arrow-up"} size={14} stroke={1.5} />
      </div>

      {!collapsed && (
        <div style={{ marginLeft: 38 }}>
          {adding && (
            <AddTaskForm
              categoryId={cat?.id ?? null}
              categoryName={cat?.name ?? null}
              courseList={courseList}
              onSave={data => createMut.mutate(data)}
              onCancel={() => setAdding(false)}
            />
          )}
          {shown.map(task => (
            <div key={task.id} style={{ marginBottom: 6 }}>
              <TaskRow
                task={task}
                onToggle={() => updateMut.mutate({ id: task.id, data: { status: STATUS_NEXT[task.status] ?? "TODO" } })}
                onDelete={() => deleteMut.mutate(task.id)}
              />
            </div>
          ))}
          {shown.length === 0 && !adding && (
            <p className="muted fs-12" style={{ padding: "8px 0", fontStyle: "italic" }}>Henüz görev yok.</p>
          )}
          <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>
            <Icon name="plus" size={13} />Görev ekle
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Tasks Page ───────────────────────────────────────────
export default function Tasks() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | string>("all");
  const [showDone, setShowDone] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const { data: taskList = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasks.list() });
  const { data: catData } = useQuery({ queryKey: ["categories"], queryFn: categories.list });
  const { data: courseList = [] } = useQuery({ queryKey: ["courses"], queryFn: () => import("@/lib/api").then(m => m.courses.list()) });

  const userCats = catData?.categories ?? [];
  const all = taskList as any[];

  const deleteCatMut = useMutation({
    mutationFn: (id: string) => categories.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["tasks"] }); if (activeTab !== "all") setActiveTab("all"); },
  });

  // ── Categorize tasks ─────────────────────────────────────────
  const tasksByCategory: Record<string, any[]> = { uncategorized: [] };
  userCats.forEach(c => { tasksByCategory[c.id] = []; });
  all.forEach(t => {
    const key = t.categoryId && tasksByCategory[t.categoryId] !== undefined ? t.categoryId : "uncategorized";
    tasksByCategory[key].push(t);
  });

  // Tabs to show: always "Tümü", then each category, then uncategorized if any
  const tabs = [
    { id: "all", name: "Tümü", color: "var(--text-2)", icon: "tasks" as const },
    ...userCats.map(c => ({ id: c.id, name: c.name, color: c.color, icon: c.icon as string })),
    ...(tasksByCategory.uncategorized.length > 0 ? [{ id: "uncategorized", name: "Kategorisiz", color: "var(--text-3)", icon: "menu" as string }] : []),
  ];

  // What to render in the main area
  const sectionsToShow = activeTab === "all"
    ? [
        ...userCats.map(c => ({ cat: c, tasks: tasksByCategory[c.id] ?? [] })),
        ...(tasksByCategory.uncategorized.length > 0 ? [{ cat: null as any, tasks: tasksByCategory.uncategorized }] : []),
      ]
    : activeTab === "uncategorized"
    ? [{ cat: null as any, tasks: tasksByCategory.uncategorized ?? [] }]
    : [{ cat: userCats.find(c => c.id === activeTab) ?? null, tasks: tasksByCategory[activeTab] ?? [] }];

  const totalActive = all.filter(t => t.status === "TODO" || t.status === "IN_PROGRESS").length;
  const totalDone = all.filter(t => t.status === "DONE").length;

  return (
    <div className="col gap-20">
      {/* Header */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Görev yönetimi · kategorili</span>
          <h1 className="topbar-title">Görevler.</h1>
          <span className="muted fs-13">{totalActive} aktif · {totalDone} tamamlandı · {userCats.length} kategori</span>
        </div>
        <div className="topbar-right">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5, color: "var(--text-2)" }}>
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
            Tamamlananları göster
          </label>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(tab => {
          const count = tab.id === "all" ? all.filter(t => t.status !== "DONE" && t.status !== "CANCELLED").length : (tasksByCategory[tab.id] ?? []).filter(t => t.status !== "DONE" && t.status !== "CANCELLED").length;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: isActive ? `${tab.color}15` : "var(--surface)", border: `1px solid ${isActive ? `${tab.color}55` : "var(--border)"}`, color: isActive ? "var(--text-0)" : "var(--text-2)", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", transition: "all 160ms", flexShrink: 0 }}>
              <Icon name={tab.icon as any} size={14} />
              {tab.name}
              {count > 0 && <span style={{ padding: "1px 6px", borderRadius: 10, background: isActive ? `${tab.color}25` : "var(--surface-2)", fontSize: 10.5, fontFamily: "var(--font-mono)", color: isActive ? tab.color : "var(--text-3)" }}>{count}</span>}
            </button>
          );
        })}

        {/* + Kategori */}
        <button
          onClick={() => setShowCatModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, background: "transparent", border: "1px dashed var(--border)", color: "var(--text-3)", cursor: "pointer", fontSize: 12.5, whiteSpace: "nowrap", flexShrink: 0, transition: "all 160ms" }}
          onMouseEnter={e => { (e.currentTarget as any).style.borderColor = "rgba(91,140,255,0.4)"; (e.currentTarget as any).style.color = "var(--primary)"; }}
          onMouseLeave={e => { (e.currentTarget as any).style.borderColor = "var(--border)"; (e.currentTarget as any).style.color = "var(--text-3)"; }}>
          <Icon name="plus" size={13} />Kategori ekle
        </button>

        {/* Delete category (when a specific category tab is active) */}
        {activeTab !== "all" && activeTab !== "uncategorized" && (
          <button
            onClick={() => { if (confirm("Kategoriyi sil? Görevlerdeki kategori bağlantısı kaldırılır.")) deleteCatMut.mutate(activeTab); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 10, background: "transparent", border: "1px solid transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 12.5, flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--danger)"; }}
            onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}>
            <Icon name="trash" size={13} />Kategoriyi sil
          </button>
        )}
      </div>

      {/* Empty state: no categories */}
      {userCats.length === 0 && all.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "52px 24px", background: "linear-gradient(180deg, rgba(91,140,255,0.04), transparent)", borderColor: "rgba(91,140,255,0.2)" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(91,140,255,0.1)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--primary)" }}>
            <Icon name="tasks" size={26} />
          </div>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Henüz kategori veya görev yok</div>
          <p className="muted fs-13" style={{ marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>Önce bir kategori oluştur (Okul, İş, Spor...), sonra o kategoriye görevler ekle.</p>
          <button className="btn primary" style={{ margin: "0 auto" }} onClick={() => setShowCatModal(true)}>
            <Icon name="plus" size={14} />İlk kategoriyi oluştur
          </button>
        </div>
      )}

      {/* Sections */}
      <div className="col gap-24">
        {sectionsToShow.map(({ cat, tasks: catTasks }, i) => (
          <CategorySection
            key={cat?.id ?? "uncategorized"}
            cat={cat}
            taskList={catTasks}
            courseList={courseList as any[]}
            showDone={showDone}
          />
        ))}
      </div>

      {/* Add Category Modal */}
      {showCatModal && (
        <AddCategoryModal
          existingNames={userCats.map(c => c.name)}
          onClose={() => setShowCatModal(false)}
          onCreated={cat => { setActiveTab(cat.id); }}
        />
      )}
    </div>
  );
}
