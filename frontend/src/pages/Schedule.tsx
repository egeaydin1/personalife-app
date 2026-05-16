import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courses, calendar } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format, addDays, startOfWeek } from "date-fns";

// ── Constants ─────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const COURSE_COLORS = ["#5B8CFF", "#8B5CF6", "#22D3EE", "#F472B6", "#F59E0B", "#A3E635"];
const DOW_LABELS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function authHeaders() {
  const t = localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? "";
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

async function attendanceReq(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api/v1${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Error");
  if (res.status === 204) return undefined;
  return res.json();
}

// ── Input style helper ────────────────────────────────────────
function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "9px 12px", borderRadius: 10,
    background: "var(--surface)", border: "1px solid var(--border-strong)",
    color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none",
    width: "100%", ...extra,
  };
}

// ── Weekly Calendar ───────────────────────────────────────────
function WeeklyCalendar({ courseList, events }: { courseList: any[]; events: any[] }) {
  const [sel, setSel] = useState<any>(null);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun
  const todayJsDay = todayDow === 0 ? 6 : todayDow - 1; // Mon=0..Sun=6
  const nowH = now.getHours() + now.getMinutes() / 60;

  // Build course blocks for this week
  const courseBlocks: any[] = [];
  courseList.forEach((c: any, ci: number) => {
    c.daysOfWeek.forEach((dow: number) => {
      const jsDay = dow === 0 ? 6 : dow - 1;
      const dayDate = days[jsDay];
      if (!dayDate) return;
      const semStart = new Date(c.semesterStart);
      const semEnd = new Date(c.semesterEnd);
      if (dayDate < semStart || dayDate > semEnd) return;
      const [sh, sm] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);
      courseBlocks.push({
        key: `c-${c.id}-${jsDay}`,
        day: jsDay, start: sh + sm / 60, end: eh + em / 60,
        title: c.name, room: c.room, kind: "course",
        color: c.color ?? COURSE_COLORS[ci % COURSE_COLORS.length], data: c,
      });
    });
  });

  // Build calendar event blocks — only current week
  const weekEnd = addDays(weekStart, 7);
  const evBlocks: any[] = events
    .filter((ev: any) => {
      const d = new Date(ev.startAt);
      return d >= weekStart && d < weekEnd;
    })
    .map((ev: any) => {
      const d = new Date(ev.startAt);
      const dow = d.getDay();
      const jsDay = dow === 0 ? 6 : dow - 1;
      const sh = d.getHours() + d.getMinutes() / 60;
      const eh = new Date(ev.endAt).getHours() + new Date(ev.endAt).getMinutes() / 60;
      return {
        key: `ev-${ev.id}`, day: jsDay, start: sh, end: Math.max(sh + 0.5, eh),
        title: ev.title, kind: "event", color: "#F472B6", data: ev,
      };
    });

  const allBlocks = [...courseBlocks, ...evBlocks];

  return (
    <div>
      <div className="cal-grid">
        <div className="cal-head" />
        {days.map((d, i) => (
          <div className="cal-head" key={i}>
            {DAY_LABELS[i]}
            <span className={`dnum${i === todayJsDay ? " today" : ""}`}>{d.getDate()}</span>
          </div>
        ))}
        {HOURS.map(h => (
          <div key={h} style={{ display: "contents" }}>
            <div className="cal-time">{h.toString().padStart(2, "0")}:00</div>
            {days.map((_, di) => {
              const here = allBlocks.filter(b => b.day === di && Math.floor(b.start) === h);
              const isToday = di === todayJsDay;
              return (
                <div className="cal-cell" key={`${h}-${di}`} style={{ position: "relative", minHeight: 60 }}>
                  {here.map(ev => {
                    const top = ((ev.start - h)) * 100;
                    const height = Math.max((ev.end - ev.start) * 100, 20);
                    const isSelected = sel?.key === ev.key;
                    return (
                      <div key={ev.key} className="cal-event"
                        onClick={() => setSel(ev)}
                        style={{
                          top: `${top}%`, height: `${height}%`,
                          background: `linear-gradient(180deg, ${ev.color}cc, ${ev.color}66)`,
                          borderLeft: `2px solid ${ev.color}`,
                          boxShadow: isSelected ? `inset 0 0 0 1px ${ev.color}, 0 0 18px ${ev.color}66` : undefined,
                          zIndex: isSelected ? 4 : 1,
                        }}>
                        <div className="cal-event-title">{ev.title}</div>
                        {ev.room && <div className="cal-event-meta">{ev.room}</div>}
                      </div>
                    );
                  })}
                  {isToday && h === Math.floor(nowH) && (
                    <div style={{ position: "absolute", left: -1, right: -1, top: `${(nowH - h) * 100}%`, height: 2, background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)", zIndex: 6 }}>
                      <span style={{ position: "absolute", left: -4, top: -3, width: 8, height: 8, background: "var(--cyan)", borderRadius: 50, boxShadow: "0 0 10px var(--cyan)" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {sel && (
        <div className="card mt-16" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 50, background: sel.color, boxShadow: `0 0 8px ${sel.color}` }} />
              <span className="display fs-14" style={{ fontWeight: 600 }}>{sel.title}</span>
            </div>
            <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => setSel(null)}>
              <Icon name="x" size={13} />
            </button>
          </div>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            <span className="chip">{DAY_LABELS[sel.day]} · {Math.floor(sel.start).toString().padStart(2,"0")}:{((sel.start % 1) * 60).toFixed(0).padStart(2,"0")}–{Math.floor(sel.end).toString().padStart(2,"0")}:{((sel.end % 1) * 60).toFixed(0).padStart(2,"0")}</span>
            {sel.room && <span className="chip info">{sel.room}</span>}
            <span className={`chip ${sel.kind === "course" ? "purple" : "down"}`}>{sel.kind === "course" ? "Ders" : "Etkinlik"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Courses tab ───────────────────────────────────────────────
function CoursesTab({ courseList, qc }: { courseList: any[]; qc: any }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", teacher: "", room: "", color: COURSE_COLORS[0],
    daysOfWeek: [] as number[], startTime: "09:00", endTime: "10:30",
    semesterStart: "", semesterEnd: "",
  });

  const createMut = useMutation({
    mutationFn: (d: any) => courses.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses"] }); setShowForm(false); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => courses.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });

  function toggleDay(i: number) {
    setForm(f => ({ ...f, daysOfWeek: f.daysOfWeek.includes(i) ? f.daysOfWeek.filter(x => x !== i) : [...f.daysOfWeek, i] }));
  }

  return (
    <div className="col gap-16">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn ghost sm" onClick={() => setShowForm(s => !s)}>
          <Icon name="plus" size={13} />Ders Ekle
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20 }}>
          <div className="card-head"><div className="card-title"><span className="card-title-dot" />Yeni Ders</div></div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[["Ders Adı *", "name", "text"], ["Öğretmen", "teacher", "text"], ["Sınıf / Yer", "room", "text"], ["Başlangıç", "startTime", "time"], ["Bitiş", "endTime", "time"], ["Dönem Başlangıç", "semesterStart", "date"], ["Dönem Bitiş", "semesterEnd", "date"]].map(([lbl, key, type]) => (
              <div key={key} className="col gap-6">
                <label className="mono dim fs-11">{String(lbl).toUpperCase()}</label>
                <input type={String(type)} style={inp()} value={(form as any)[String(key)]} onChange={e => setForm(f => ({ ...f, [String(key)]: e.target.value }))} />
              </div>
            ))}
            <div className="col gap-6">
              <label className="mono dim fs-11">RENK</label>
              <div className="row gap-6">
                {COURSE_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 26, height: 26, borderRadius: 50, background: c, border: `3px solid ${form.color === c ? "white" : "transparent"}`, cursor: "pointer", boxShadow: form.color === c ? `0 0 10px ${c}` : "none" }} />
                ))}
              </div>
            </div>
          </div>
          <div className="col gap-6" style={{ marginBottom: 14 }}>
            <label className="mono dim fs-11">GÜNLER</label>
            <div className="row gap-6">
              {DOW_LABELS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer", background: form.daysOfWeek.includes(i) ? "var(--primary)" : "var(--surface)", color: form.daysOfWeek.includes(i) ? "white" : "var(--text-2)", border: "1px solid var(--border)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="row gap-8">
            <button className="btn primary" disabled={!form.name || createMut.isPending}
              onClick={() => createMut.mutate({
                ...form,
                semesterStart: form.semesterStart ? new Date(form.semesterStart).toISOString() : new Date().toISOString(),
                semesterEnd: form.semesterEnd ? new Date(form.semesterEnd).toISOString() : addDays(new Date(), 180).toISOString(),
              })}>Kaydet</button>
            <button className="btn ghost" onClick={() => setShowForm(false)}>İptal</button>
          </div>
        </div>
      )}

      {courseList.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p className="muted fs-13" style={{ marginBottom: 16 }}>Henüz ders eklenmedi.</p>
          <button className="btn primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} />İlk dersi ekle</button>
        </div>
      )}

      <div className="col gap-8">
        {courseList.map((c: any) => (
          <div key={c.id} className="row gap-12" style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ width: 10, height: 10, borderRadius: 50, background: c.color ?? "#5B8CFF", boxShadow: `0 0 8px ${c.color ?? "#5B8CFF"}`, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div className="fs-14" style={{ fontWeight: 600 }}>{c.name}</div>
              <div className="mono dim fs-11" style={{ marginTop: 3 }}>
                {c.daysOfWeek.map((d: number) => DOW_LABELS[d]).join(", ")} · {c.startTime}–{c.endTime}
                {c.room ? ` · ${c.room}` : ""}{c.teacher ? ` · ${c.teacher}` : ""}
              </div>
            </div>
            <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => deleteMut.mutate(c.id)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Events tab ────────────────────────────────────────────────
function EventsTab({ events, qc }: { events: any[]; qc: any }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", startAt: "", endAt: "" });

  const createMut = useMutation({
    mutationFn: (d: any) => calendar.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      setShowForm(false);
      setForm({ title: "", startAt: "", endAt: "" });
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => calendar.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  return (
    <div className="col gap-16">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn ghost sm" onClick={() => setShowForm(s => !s)}>
          <Icon name="plus" size={13} />Etkinlik Ekle
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20 }}>
          <div className="card-head"><div className="card-title"><span className="card-title-dot" />Yeni Etkinlik</div></div>
          <div className="col gap-10" style={{ marginBottom: 14 }}>
            <div className="col gap-6">
              <label className="mono dim fs-11">BAŞLIK *</label>
              <input style={inp()} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Etkinlik başlığı" />
            </div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="col gap-6">
                <label className="mono dim fs-11">BAŞLANGIÇ</label>
                <input type="datetime-local" style={inp()} value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} />
              </div>
              <div className="col gap-6">
                <label className="mono dim fs-11">BİTİŞ</label>
                <input type="datetime-local" style={inp()} value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="row gap-8">
            <button className="btn primary" disabled={!form.title || !form.startAt || createMut.isPending}
              onClick={() => createMut.mutate({ ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt || form.startAt).toISOString() })}>
              Kaydet
            </button>
            <button className="btn ghost" onClick={() => setShowForm(false)}>İptal</button>
          </div>
        </div>
      )}

      <div className="col gap-8">
        {events.length === 0 && !showForm && <p className="muted fs-12" style={{ fontStyle: "italic" }}>Takvim etkinliği yok.</p>}
        {events.map((ev: any) => (
          <div key={ev.id} className="row gap-12" style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, background: "rgba(91,140,255,0.12)", flexShrink: 0 }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--primary)" }}>{format(new Date(ev.startAt), "MMM").toUpperCase()}</span>
              <span className="num" style={{ fontSize: 16, color: "var(--primary)" }}>{format(new Date(ev.startAt), "d")}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="fs-14" style={{ fontWeight: 600 }}>{ev.title}</div>
              <div className="mono dim fs-11">{format(new Date(ev.startAt), "HH:mm")} – {format(new Date(ev.endAt), "HH:mm")}</div>
            </div>
            <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => deleteMut.mutate(ev.id)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Attendance tab ────────────────────────────────────────────
function AttendanceTab() {
  const qc = useQueryClient();

  const { data: pending = { pending: [] }, refetch: refetchPending } = useQuery({
    queryKey: ["attendance", "pending"],
    queryFn: () => attendanceReq("/courses/attendance/pending"),
    refetchInterval: 60_000,
  });
  const { data: summary = [] } = useQuery({
    queryKey: ["attendance", "summary"],
    queryFn: () => attendanceReq("/courses/attendance/summary"),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["attendance", "history"],
    queryFn: () => attendanceReq("/courses/attendance"),
  });

  const markMut = useMutation({
    mutationFn: (data: any) => attendanceReq("/courses/attendance", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      refetchPending();
    },
  });

  const pendingList = (pending as any).pending ?? [];

  return (
    <div className="col gap-20">
      {/* Pending */}
      {pendingList.length > 0 && (
        <div className="card" style={{ padding: 20, background: "linear-gradient(180deg,rgba(245,158,11,0.08),transparent)", borderColor: "rgba(245,158,11,0.25)" }}>
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />Bugün işaretlenmemiş dersler</div>
          </div>
          <div className="col gap-10">
            {pendingList.map((item: any, i: number) => (
              <div key={i} className="row gap-12" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <div className="fs-13" style={{ fontWeight: 600 }}>{item.course.name}</div>
                  <div className="mono dim fs-11">{item.course.startTime}–{item.course.endTime}{item.course.room ? ` · ${item.course.room}` : ""}</div>
                </div>
                <button className="btn primary sm"
                  onClick={() => markMut.mutate({ courseId: item.course.id, date: item.date, attended: true })}
                  disabled={markMut.isPending}>
                  <Icon name="check" size={13} />Gittim
                </button>
                <button className="btn ghost sm"
                  onClick={() => markMut.mutate({ courseId: item.course.id, date: item.date, attended: false })}
                  disabled={markMut.isPending} style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}>
                  <Icon name="x" size={13} />Gitmedim
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {(summary as any[]).length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" />Devamsızlık özeti</div>
          </div>
          <div className="col gap-10">
            {(summary as any[]).map((s: any) => (
              <div key={s.courseId} className="row gap-12" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ width: 8, height: 8, borderRadius: 50, background: s.color ?? "#5B8CFF", boxShadow: `0 0 6px ${s.color ?? "#5B8CFF"}`, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div className="fs-13" style={{ fontWeight: 600 }}>{s.courseName}</div>
                  <div className="mono dim fs-11">{s.attended} gittim · {s.missed} gitmedim · {s.total} toplam</div>
                </div>
                {s.rate !== null && (
                  <span className={`chip ${s.rate >= 80 ? "up" : s.rate >= 60 ? "warn" : "down"}`} style={{ fontSize: 11 }}>
                    %{s.rate}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {(history as any[]).length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />Son kayıtlar</div>
          </div>
          <div className="col gap-6">
            {(history as any[]).slice(0, 20).map((a: any) => (
              <div key={a.id} className="row gap-10" style={{ padding: "8px 10px", borderRadius: 8, background: a.attended ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${a.attended ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                <Icon name={a.attended ? "check" : "x"} size={14} />
                <span className="fs-12" style={{ fontWeight: 500 }}>{a.course?.name ?? "—"}</span>
                <span className="mono dim fs-11" style={{ marginLeft: "auto" }}>{format(new Date(a.date), "d MMM yyyy")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingList.length === 0 && (summary as any[]).length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p className="muted fs-13">Henüz ders ve devamsızlık kaydı yok.</p>
          <p className="muted fs-12" style={{ marginTop: 8 }}>Ders programınızı "Dersler" sekmesinden ekleyin.</p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function Schedule() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"calendar" | "courses" | "events" | "attendance">("calendar");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const { data: courseList = [] } = useQuery({ queryKey: ["courses"], queryFn: courses.list });
  const { data: events = [] } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => calendar.list({ from: weekStart.toISOString(), to: weekEnd.toISOString() }),
    staleTime: 10_000,
  });

  const tabs = [
    { id: "calendar", label: "Haftalık Takvim", icon: "calendar" },
    { id: "courses", label: "Dersler", icon: "school" },
    { id: "events", label: "Etkinlikler", icon: "plus" },
    { id: "attendance", label: "Devamsızlık", icon: "check" },
  ] as const;

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">{format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}</span>
          <h1 className="topbar-title">Takvim</h1>
          <span className="muted fs-13">Dersler, etkinlikler ve devamsızlık takibi.</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="row gap-8" style={{ flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id}
            className={`btn ${tab === t.id ? "primary" : "ghost"} sm`}
            onClick={() => setTab(t.id as any)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={t.icon as any} size={13} />{t.label}
          </button>
        ))}
        <span style={{ marginLeft: "auto" }} className="toast-pill">
          <span className="pulse-dot" />Agent {(courseList as any[]).length} ders takip ediyor
        </span>
      </div>

      {tab === "calendar" && <WeeklyCalendar courseList={courseList as any[]} events={events as any[]} />}
      {tab === "courses" && <CoursesTab courseList={courseList as any[]} qc={qc} />}
      {tab === "events" && <EventsTab events={events as any[]} qc={qc} />}
      {tab === "attendance" && <AttendanceTab />}
    </div>
  );
}
