import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasks, courses } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";

const PRIORITY_COLORS: Record<string, string> = { LOW: "#8a93b8", MEDIUM: "#5B8CFF", HIGH: "#F59E0B", URGENT: "#EF4444" };
const PRIORITY_LABELS: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" };
const STATUS_NEXT: Record<string, string> = { TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO" };
const STATUS_ICONS: Record<string, string> = { TODO: "check", IN_PROGRESS: "zap", DONE: "check-circle", CANCELLED: "x" };

export default function Tasks() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "TODO" | "IN_PROGRESS" | "DONE">("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", deadline: "", courseId: "", estimatedMin: "" });

  const { data: taskList = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasks.list() });
  const { data: courseList = [] } = useQuery({ queryKey: ["courses"], queryFn: () => courses.list() });

  const createMut = useMutation({
    mutationFn: (d: any) => tasks.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setShowForm(false); setForm({ title: "", description: "", priority: "MEDIUM", deadline: "", courseId: "", estimatedMin: "" }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const all = taskList as any[];
  const filtered = filter === "all" ? all : all.filter((t: any) => t.status === filter);
  const active = all.filter((t: any) => t.status === "TODO" || t.status === "IN_PROGRESS");
  const done = all.filter((t: any) => t.status === "DONE");

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Görev yönetimi · kişisel & okul</span>
          <h1 className="topbar-title">Görevler.</h1>
          <span className="muted fs-13">{active.length} aktif · {done.length} tamamlandı</span>
        </div>
        <div className="topbar-right">
          <div className="row gap-8" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
            {(["all", "TODO", "IN_PROGRESS", "DONE"] as const).map(f => (
              <button key={f} className={`btn sm ${filter === f ? "primary" : "ghost"}`} style={{ border: 0 }} onClick={() => setFilter(f)}>
                {f === "all" ? "Tümü" : f === "TODO" ? "Yapılacak" : f === "IN_PROGRESS" ? "Devam" : "Tamam"}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} />Görev Ekle</button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" />Yeni Görev</div>
            <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="col gap-6" style={{ gridColumn: "span 2" }}>
              <label className="mono dim fs-11">BAŞLIK *</label>
              <input style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Görev başlığı" autoFocus />
            </div>
            <div className="col gap-6">
              <label className="mono dim fs-11">ÖNCELİK</label>
              <select style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col gap-6">
              <label className="mono dim fs-11">DEADLINE</label>
              <input type="datetime-local" style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
            {(courseList as any[]).length > 0 && (
              <div className="col gap-6">
                <label className="mono dim fs-11">DERS</label>
                <select style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                  value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}>
                  <option value="">Derse bağlama (opsiyonel)</option>
                  {(courseList as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="col gap-6">
              <label className="mono dim fs-11">TAHMİNİ SÜRE (DK)</label>
              <input type="number" style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                value={form.estimatedMin} onChange={e => setForm(f => ({ ...f, estimatedMin: e.target.value }))} placeholder="60" />
            </div>
          </div>
          <div className="row gap-8 mt-16">
            <button className="btn primary" disabled={!form.title || createMut.isPending}
              onClick={() => createMut.mutate({ ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined, courseId: form.courseId || undefined, estimatedMin: form.estimatedMin ? parseInt(form.estimatedMin) : undefined })}>
              Kaydet
            </button>
            <button className="btn ghost" onClick={() => setShowForm(false)}>İptal</button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="col gap-8">
        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div className="muted fs-13">
              {filter === "all" ? "Henüz görev yok." : `${filter === "TODO" ? "Yapılacak" : filter === "IN_PROGRESS" ? "Devam eden" : "Tamamlanan"} görev yok.`}
            </div>
          </div>
        )}
        {filtered.map((task: any) => {
          const color = PRIORITY_COLORS[task.priority] ?? "#5B8CFF";
          const isDone = task.status === "DONE" || task.status === "CANCELLED";
          return (
            <div key={task.id} className="card tight" style={{
              opacity: isDone ? 0.6 : 1,
              borderColor: `${color}22`,
              background: `linear-gradient(180deg, ${color}04, transparent), var(--grad-card)`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <button onClick={() => updateMut.mutate({ id: task.id, data: { status: STATUS_NEXT[task.status] ?? "TODO" } })}
                  style={{ marginTop: 2, background: "transparent", border: "none", cursor: "pointer", color: isDone ? "var(--success)" : "var(--text-3)", flexShrink: 0 }}>
                  <Icon name={STATUS_ICONS[task.status] ?? "check"} size={18} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="fs-14" style={{ fontWeight: 600, textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-3)" : "var(--text-0)" }}>{task.title}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9.5, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", background: `${color}20`, color }}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.status === "IN_PROGRESS" && <span className="chip info" style={{ fontSize: 9.5 }}>DEVAM</span>}
                  </div>
                  {task.description && <div className="muted fs-12 mt-4" style={{ lineHeight: 1.4 }}>{task.description}</div>}
                  <div className="row gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                    {task.course && <span className="chip" style={{ fontSize: 10 }}>{task.course.name}</span>}
                    {task.deadline && (
                      <span className="chip warn" style={{ fontSize: 10 }}>
                        <Icon name="clock" size={10} />{format(new Date(task.deadline), "d MMM HH:mm")}
                      </span>
                    )}
                    {task.estimatedMin && <span className="chip" style={{ fontSize: 10 }}>{task.estimatedMin}dk</span>}
                  </div>
                </div>
                <button onClick={() => deleteMut.mutate(task.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", flexShrink: 0 }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
