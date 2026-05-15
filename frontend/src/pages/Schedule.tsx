import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courses, calendar } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format, addDays, startOfWeek } from "date-fns";

const DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const COURSE_COLORS = ["#5B8CFF", "#8B5CF6", "#22D3EE", "#F472B6", "#F59E0B", "#A3E635"];

function eventStyle(ev: any) {
  return {
    background: `linear-gradient(180deg, ${ev.color}cc, ${ev.color}66)`,
    borderLeft: `2px solid ${ev.color}`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px ${ev.color}25`,
  };
}

// Weekly calendar view using real courses + calendar events
function WeeklyCalendar({ courseList, events }: { courseList: any[]; events: any[] }) {
  const [sel, setSel] = useState<any>(null);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Build course occurrences this week
  const courseBlocks: any[] = [];
  courseList.forEach((c: any, ci: number) => {
    c.daysOfWeek.forEach((dow: number) => {
      const jsDay = dow === 0 ? 6 : dow - 1; // convert Sun=0 to Mon=0 index
      const [sh, sm] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);
      courseBlocks.push({
        id: `course-${c.id}-${dow}`,
        day: jsDay,
        start: sh + sm / 60,
        end: eh + em / 60,
        title: c.name,
        room: c.room,
        kind: "school",
        color: COURSE_COLORS[ci % COURSE_COLORS.length],
        data: c,
      });
    });
  });

  // Add calendar events this week
  const evBlocks = events.map((ev: any) => {
    const d = new Date(ev.startAt);
    const dow = d.getDay();
    const jsDay = dow === 0 ? 6 : dow - 1;
    const sh = d.getHours() + d.getMinutes() / 60;
    const eh = new Date(ev.endAt).getHours() + new Date(ev.endAt).getMinutes() / 60;
    return {
      id: `ev-${ev.id}`,
      day: jsDay,
      start: sh,
      end: eh,
      title: ev.title,
      kind: "event",
      color: "#F472B6",
      data: ev,
    };
  });

  const allBlocks = [...courseBlocks, ...evBlocks];
  const now = new Date();
  const todayJsDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const nowH = now.getHours() + now.getMinutes() / 60;

  return (
    <div>
      <div className="cal-grid">
        <div className="cal-head" />
        {days.map((d, i) => {
          const isToday = i === todayJsDay;
          return (
            <div className="cal-head" key={i}>
              {DAYS_SHORT[i]}
              <span className={`dnum${isToday ? " today" : ""}`}>{d.getDate()}</span>
            </div>
          );
        })}

        {HOURS.map(h => (
          <div key={h} style={{ display: "contents" }}>
            <div className="cal-time">{h.toString().padStart(2, "0")}:00</div>
            {days.map((_, di) => {
              const here = allBlocks.filter(b => b.day === di && Math.floor(b.start) === h);
              return (
                <div className="cal-cell" key={`${h}-${di}`} style={{ position: "relative", minHeight: 60 }}>
                  {here.map(ev => {
                    const top = ((ev.start - h) / 1) * 100;
                    const height = Math.max(((ev.end - ev.start) / 1) * 100, 15);
                    const isSelected = sel?.id === ev.id;
                    return (
                      <div key={ev.id} className="cal-event"
                        onClick={() => setSel(ev)}
                        style={{
                          top: `${top}%`, height: `${height}%`,
                          ...eventStyle(ev),
                          boxShadow: isSelected ? `inset 0 0 0 1px ${ev.color}, 0 0 18px ${ev.color}66` : `inset 0 1px 0 rgba(255,255,255,0.15)`,
                          zIndex: isSelected ? 4 : 1,
                        }}>
                        <div className="cal-event-title">{ev.title}</div>
                        {ev.room && <div className="cal-event-meta">{ev.room}</div>}
                      </div>
                    );
                  })}
                  {di === todayJsDay && h === Math.floor(nowH) && (
                    <div style={{ position: "absolute", left: -1, right: -1, top: `${((nowH - h)) * 100}%`, height: 2, background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)", zIndex: 6 }}>
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
        <div className="card mt-16">
          <div className="card-head">
            <div className="card-title">
              <span className="card-title-dot" style={{ background: sel.color, boxShadow: `0 0 8px ${sel.color}` }} />
              {sel.title}
            </div>
            <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => setSel(null)}><Icon name="x" size={14} /></button>
          </div>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            <span className="chip">{sel.start.toFixed(0).padStart(2, "0")}:00 – {sel.end.toFixed(0).padStart(2, "0")}:00</span>
            {sel.room && <span className="chip info">{sel.room}</span>}
            <span className="chip purple">{sel.kind === "school" ? "Ders" : "Etkinlik"}</span>
          </div>
          {sel.data?.teacher && <div className="muted fs-12 mt-8">{sel.data.teacher}</div>}
        </div>
      )}
    </div>
  );
}

export default function Schedule() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"calendar" | "courses" | "events">("calendar");
  const [showCourse, setShowCourse] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: "", teacher: "", room: "", color: COURSE_COLORS[0], daysOfWeek: [] as number[], startTime: "09:00", endTime: "10:30", semesterStart: "", semesterEnd: "" });
  const [eventForm, setEventForm] = useState({ title: "", startAt: "", endAt: "" });

  const { data: courseList = [] } = useQuery({ queryKey: ["courses"], queryFn: courses.list });
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { data: events = [] } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => calendar.list({ from: weekStart.toISOString(), to: addDays(weekStart, 14).toISOString() }),
  });

  const createCourseMut = useMutation({
    mutationFn: (d: any) => courses.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses"] }); setShowCourse(false); },
  });
  const deleteCourseMut = useMutation({
    mutationFn: (id: string) => courses.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
  const createEventMut = useMutation({
    mutationFn: (d: any) => calendar.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); setShowEvent(false); },
  });
  const deleteEventMut = useMutation({
    mutationFn: (id: string) => calendar.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  function toggleDay(d: number) {
    setCourseForm(f => ({ ...f, daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter(x => x !== d) : [...f.daysOfWeek, d] }));
  }

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Mayıs · {format(new Date(), "d MMMM")}</span>
          <h1 className="topbar-title">Takvim</h1>
          <span className="muted fs-13">Okul, sosyal, görevler ve anomaliler — tek bir ritimde.</span>
        </div>
        <div className="topbar-right">
          <div className="row gap-8" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
            <button className={`btn sm ${tab === "calendar" ? "primary" : "ghost"}`} style={{ border: 0 }} onClick={() => setTab("calendar")}>Hafta</button>
            <button className={`btn sm ${tab === "courses" ? "primary" : "ghost"}`} style={{ border: 0 }} onClick={() => setTab("courses")}>Dersler</button>
            <button className={`btn sm ${tab === "events" ? "primary" : "ghost"}`} style={{ border: 0 }} onClick={() => setTab("events")}>Etkinlikler</button>
          </div>
          <button className="btn primary" onClick={() => { setShowEvent(true); setTab("events"); }}><Icon name="plus" size={14} />Etkinlik</button>
        </div>
      </div>

      {/* Legend */}
      <div className="row gap-10" style={{ flexWrap: "wrap" }}>
        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 4, background: "#5B8CFF" }} /> Ders</span>
        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 4, background: "#F472B6" }} /> Sosyal</span>
        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 4, background: "#F59E0B" }} /> Görev</span>
        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 4, background: "#EF4444" }} /> Sınav</span>
        <span style={{ marginLeft: "auto" }} className="toast-pill"><span className="pulse-dot" />Agent {(courseList as any[]).length} ders takip ediyor</span>
      </div>

      {/* Weekly Calendar */}
      {tab === "calendar" && <WeeklyCalendar courseList={courseList as any[]} events={events as any[]} />}

      {/* Courses tab */}
      {tab === "courses" && (
        <div className="col gap-16">
          <div className="between">
            <h3 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ders Programı</h3>
            <button className="btn ghost sm" onClick={() => setShowCourse(true)}><Icon name="plus" size={13} />Ders Ekle</button>
          </div>

          {showCourse && (
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" />Yeni Ders</div>
                <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => setShowCourse(false)}><Icon name="x" size={14} /></button>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Ders Adı *", "name", "text", "Matematik 101"], ["Öğretmen", "teacher", "text", "Prof. Dr. ..."], ["Sınıf / Yer", "room", "text", "B-204"], ["Başlangıç", "startTime", "time", ""], ["Bitiş", "endTime", "time", ""], ["Dönem Başlangıç", "semesterStart", "date", ""], ["Dönem Bitiş", "semesterEnd", "date", ""]].map(([label, field, type, placeholder]) => (
                  <div key={field as string} className="col gap-6">
                    <label className="mono dim fs-11">{label as string}</label>
                    <input type={type as string} placeholder={placeholder as string}
                      style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                      value={(courseForm as any)[field as string]} onChange={e => setCourseForm(f => ({ ...f, [field as string]: e.target.value }))} />
                  </div>
                ))}
                <div className="col gap-6">
                  <label className="mono dim fs-11">RENK</label>
                  <div className="row gap-6">
                    {COURSE_COLORS.map(c => (
                      <button key={c} onClick={() => setCourseForm(f => ({ ...f, color: c }))}
                        style={{ width: 24, height: 24, borderRadius: 50, background: c, border: `2px solid ${courseForm.color === c ? "white" : "transparent"}`, cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="col gap-6 mt-12">
                <label className="mono dim fs-11">GÜNLER</label>
                <div className="row gap-6">
                  {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d, i) => (
                    <button key={i} onClick={() => toggleDay(i + 1 === 7 ? 0 : i + 1)}
                      style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer", background: courseForm.daysOfWeek.includes(i + 1 === 7 ? 0 : i + 1) ? "var(--primary)" : "var(--surface)", color: courseForm.daysOfWeek.includes(i + 1 === 7 ? 0 : i + 1) ? "white" : "var(--text-2)", border: "1px solid var(--border)" }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="row gap-8 mt-16">
                <button className="btn primary" disabled={!courseForm.name || createCourseMut.isPending}
                  onClick={() => createCourseMut.mutate({ ...courseForm, semesterStart: courseForm.semesterStart ? new Date(courseForm.semesterStart).toISOString() : new Date().toISOString(), semesterEnd: courseForm.semesterEnd ? new Date(courseForm.semesterEnd).toISOString() : addDays(new Date(), 180).toISOString() })}>
                  Kaydet
                </button>
                <button className="btn ghost" onClick={() => setShowCourse(false)}>İptal</button>
              </div>
            </div>
          )}

          {(courseList as any[]).length === 0 && !showCourse && (
            <div className="card" style={{ textAlign: "center", padding: 48 }}>
              <div className="muted fs-13" style={{ marginBottom: 16 }}>Henüz ders eklenmedi.</div>
              <button className="btn primary" onClick={() => setShowCourse(true)}><Icon name="plus" size={14} />İlk dersi ekle</button>
            </div>
          )}

          <div className="col gap-10">
            {(courseList as any[]).map((c: any) => (
              <div key={c.id} className="row gap-12" style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                <div style={{ width: 10, height: 10, borderRadius: 50, background: c.color ?? "#5B8CFF", boxShadow: `0 0 8px ${c.color ?? "#5B8CFF"}`, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div className="fs-14" style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="mono dim fs-11" style={{ marginTop: 3 }}>
                    {c.daysOfWeek.map((d: number) => ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][d]).join(", ")} · {c.startTime}–{c.endTime}
                    {c.room ? ` · ${c.room}` : ""}{c.teacher ? ` · ${c.teacher}` : ""}
                  </div>
                </div>
                <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => deleteCourseMut.mutate(c.id)}><Icon name="trash" size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events tab */}
      {tab === "events" && (
        <div className="col gap-16">
          <div className="between">
            <h3 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Takvim Etkinlikleri</h3>
            <button className="btn ghost sm" onClick={() => setShowEvent(true)}><Icon name="plus" size={13} />Etkinlik Ekle</button>
          </div>

          {showEvent && (
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" />Yeni Etkinlik</div>
                <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => setShowEvent(false)}><Icon name="x" size={14} /></button>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="col gap-6" style={{ gridColumn: "span 2" }}>
                  <label className="mono dim fs-11">BAŞLIK *</label>
                  <input style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                    value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Etkinlik başlığı" />
                </div>
                <div className="col gap-6">
                  <label className="mono dim fs-11">BAŞLANGIÇ</label>
                  <input type="datetime-local" style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                    value={eventForm.startAt} onChange={e => setEventForm(f => ({ ...f, startAt: e.target.value }))} />
                </div>
                <div className="col gap-6">
                  <label className="mono dim fs-11">BİTİŞ</label>
                  <input type="datetime-local" style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                    value={eventForm.endAt} onChange={e => setEventForm(f => ({ ...f, endAt: e.target.value }))} />
                </div>
              </div>
              <div className="row gap-8 mt-16">
                <button className="btn primary" disabled={!eventForm.title || !eventForm.startAt || createEventMut.isPending}
                  onClick={() => createEventMut.mutate({ ...eventForm, startAt: new Date(eventForm.startAt).toISOString(), endAt: new Date(eventForm.endAt || eventForm.startAt).toISOString() })}>
                  Kaydet
                </button>
                <button className="btn ghost" onClick={() => setShowEvent(false)}>İptal</button>
              </div>
            </div>
          )}

          <div className="col gap-8">
            {(events as any[]).length === 0 && !showEvent && <p className="muted fs-12" style={{ fontStyle: "italic" }}>Yaklaşan etkinlik yok.</p>}
            {(events as any[]).map((ev: any) => (
              <div key={ev.id} className="row gap-12" style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, background: "rgba(91,140,255,0.12)", flexShrink: 0 }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--primary)" }}>{format(new Date(ev.startAt), "MMM").toUpperCase()}</span>
                  <span className="num" style={{ fontSize: 16, color: "var(--primary)" }}>{format(new Date(ev.startAt), "d")}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fs-14" style={{ fontWeight: 600 }}>{ev.title}</div>
                  <div className="mono dim fs-11">{format(new Date(ev.startAt), "HH:mm")} – {format(new Date(ev.endAt), "HH:mm")}</div>
                </div>
                <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => deleteEventMut.mutate(ev.id)}><Icon name="trash" size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
