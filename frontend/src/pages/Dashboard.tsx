import { useQuery } from "@tanstack/react-query";
import { reports, tasks, checkins, calendar, auth } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spark } from "@/components/ui/Spark";
import { MultiRing } from "@/components/ui/ProgressRing";
import { Typewriter } from "@/components/ui/Typewriter";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";

// ── Pulse Orb Hero ──────────────────────────────────────────
function PulseOrbHero({ score }: { score: number }) {
  const satellites = [
    { label: "OKUL",      value: "—",    color: "#5B8CFF", angle: -90,  dist: 200 },
    { label: "SOSYAL",    value: "—",    color: "#F472B6", angle: -25,  dist: 220 },
    { label: "DİJİTAL",  value: "—",    color: "#22D3EE", angle: 40,   dist: 215 },
    { label: "GÖREVLER", value: "—",    color: "#A3E635", angle: 110,  dist: 215 },
    { label: "ODAK",     value: "—",    color: "#F59E0B", angle: 230,  dist: 210 },
  ];
  return (
    <div className="pulse-stage" style={{ overflow: "visible", position: "relative" }}>
      <div className="orbit outer" />
      <div className="orbit" />
      <div className="pulse-orb">
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", color: "white" }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.7 }}>TODAY · PULSE</div>
            <div className="display" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, marginTop: 6, letterSpacing: "-0.04em" }}>{score}</div>
            <div className="mono" style={{ fontSize: 10, opacity: 0.7, marginTop: 6 }}>MOMENTUM</div>
          </div>
        </div>
      </div>
      {satellites.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        return (
          <div key={i} className="satellite"
            style={{ left: `calc(50% + ${Math.cos(rad) * s.dist}px)`, top: `calc(50% + ${Math.sin(rad) * s.dist}px)`, transform: "translate(-50%, -50%)" }}>
            <div className="satellite-dot" style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }} />
            <div className="satellite-label">{s.label}</div>
            <div className="satellite-val">{s.value}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Consistency Rings ───────────────────────────────────────
function ConsistencyRings({ checkinCount }: { checkinCount: number }) {
  const pct = Math.round((checkinCount / 7) * 100);
  const rings = [
    { value: pct,  color: "#F472B6", label: "Check-in" },
    { value: 72,   color: "#22D3EE", label: "Odak" },
    { value: 64,   color: "#A3E635", label: "Denge" },
    { value: 88,   color: "#F59E0B", label: "Tamamlama" },
  ];
  return (
    <div className="row gap-16">
      <MultiRing rings={rings} size={130} />
      <div className="col gap-8">
        {rings.map((r, i) => (
          <div key={i} className="row gap-8">
            <span style={{ width: 8, height: 8, borderRadius: 50, background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
            <span className="fs-12 muted" style={{ width: 80 }}>{r.label}</span>
            <span className="num fs-13" style={{ color: r.color }}>{r.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Timeline ribbon (from daily logs or placeholder) ────────
function TimelineRibbon({ logs }: { logs: any[] }) {
  const blocks = logs.length > 0
    ? logs.slice(0, 8).map((l: any, i: number) => ({
        startH: 8 + i * 1.5,
        endH: 9 + i * 1.5,
        label: l.title,
        color: ["#5B8CFF", "#F472B6", "#22D3EE", "#A3E635", "#8B5CF6"][i % 5],
        op: 0.85,
      }))
    : [
        { startH: 9, endH: 10.5, label: "Sabah çalışma", color: "#5B8CFF", op: 0.85 },
        { startH: 12, endH: 13, label: "Öğle yemeği", color: "#F472B6", op: 0.7 },
        { startH: 15, endH: 17, label: "Derin çalışma", color: "#8B5CF6", op: 0.85 },
      ];

  const nowH = new Date().getHours() + new Date().getMinutes() / 60;
  const pct = (h: number) => (h / 24) * 100;
  return (
    <div>
      <div className="ribbon">
        <div className="ribbon-grid" />
        {blocks.map((b, i) => (
          <div key={i} className="ribbon-block"
            style={{
              left: `${pct(b.startH)}%`, width: `${pct(b.endH) - pct(b.startH)}%`,
              background: `linear-gradient(180deg, ${b.color}, ${b.color}99)`,
              opacity: b.op, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 0 16px ${b.color}40`,
            }}>
            {b.label}
          </div>
        ))}
        <div className="ribbon-now" style={{ left: `${pct(nowH)}%` }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-3)", letterSpacing: "0.1em" }}>
        {[0, 3, 6, 9, 12, 15, 18, 21].map(h => <div key={h}>{h.toString().padStart(2, "0")}:00</div>)}
      </div>
    </div>
  );
}

// ── Momentum lanes ──────────────────────────────────────────
function MomentumLanes({ checkinCount, taskDone, taskTotal }: { checkinCount: number; taskDone: number; taskTotal: number }) {
  const lanes = [
    { label: "Log streak",       value: Math.min(100, checkinCount * 14),  hint: `${checkinCount} days this week`,    color: "#A3E635" },
    { label: "Görev tamamlama",  value: taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0, hint: `${taskDone} / ${taskTotal}`, color: "#F59E0B" },
    { label: "Plan uyumu",       value: 78, hint: "bu hafta",              color: "#5B8CFF" },
    { label: "Sosyal medya",     value: 58, hint: "hedef ≤ %45",           color: "#22D3EE", invert: true },
  ];
  return (
    <div className="col gap-12">
      {lanes.map((l, i) => (
        <div key={i}>
          <div className="between" style={{ marginBottom: 6 }}>
            <div className="row gap-8">
              <span className="fs-12" style={{ fontWeight: 500 }}>{l.label}</span>
              <span className="mono dim fs-11">{l.hint}</span>
            </div>
            <span className="num fs-12">{l.value}%</span>
          </div>
          <div className="liquid">
            <div className="liquid-fill" style={{ width: `${l.value}%`, background: `linear-gradient(90deg, ${l.color}cc, ${l.color})` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AI Reflection ───────────────────────────────────────────
function AIReflection({ summary }: { summary?: string }) {
  const text = summary || "Bugünkü verilerine göre aktivitelerini takip etmek için check-in ekranını kullan. Agent, günlük loglarını ve takvimini analiz ederek sana özel içgörüler üretecek.";
  return (
    <div className="card glow" style={{ background: "linear-gradient(180deg, rgba(91,140,255,0.08), rgba(139,92,246,0.04))", borderColor: "rgba(91,140,255,0.25)" }}>
      <div className="between">
        <div className="row gap-10">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "radial-gradient(circle at 35% 30%, #c8d7ff, #5B8CFF 50%, #1e3a8a 100%)", boxShadow: "0 0 10px rgba(91,140,255,0.6)" }} />
          <div>
            <div className="display fs-14" style={{ fontWeight: 600 }}>Haftalık yansıma</div>
            <div className="mono dim" style={{ fontSize: 10, letterSpacing: "0.14em" }}>AGENT ANALİZİ</div>
          </div>
        </div>
        <span className="toast-pill"><span className="pulse-dot" />Canlı</span>
      </div>
      <div className="mt-16" style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text-0)" }}>
        <Typewriter text={text} speed={14} />
      </div>
      <div className="mt-16 row gap-8">
        <button className="btn primary" onClick={() => window.location.href = "/checkin"}><Icon name="edit" size={14} />Check-in yap</button>
        <button className="btn ghost" onClick={() => window.location.href = "/analytics"}><Icon name="chart" size={14} />Analitik</button>
      </div>
    </div>
  );
}

// ── Upcoming list ───────────────────────────────────────────
function UpcomingList({ events }: { events: any[] }) {
  const navigate = useNavigate();
  if (events.length === 0) return <p className="muted fs-12" style={{ fontStyle: "italic" }}>Yaklaşan etkinlik yok</p>;
  return (
    <div className="col gap-10">
      {events.slice(0, 5).map((ev: any, i: number) => (
        <div key={i} className="row gap-12" style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ width: 42, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>
            {format(new Date(ev.startAt), "HH:mm")}
          </div>
          <div style={{ flex: 1 }}>
            <div className="fs-13" style={{ fontWeight: 500 }}>{ev.title}</div>
            <div className="mono dim fs-11">{format(new Date(ev.startAt), "EEE d MMM")}</div>
          </div>
        </div>
      ))}
      <button className="btn ghost" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={() => navigate("/schedule")}>
        <Icon name="calendar" size={13} />Takvimi gör
      </button>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
  const { data: daily } = useQuery({ queryKey: ["reports", "daily"], queryFn: () => reports.daily(), retry: false });
  const { data: taskList = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasks.list() });
  const { data: todayCheckin } = useQuery({ queryKey: ["checkin", "today"], queryFn: () => checkins.today(), retry: false });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me, retry: false });
  const { data: upcoming = [] } = useQuery({
    queryKey: ["calendar", "upcoming"],
    queryFn: () => calendar.list({ from: new Date().toISOString(), to: addDays(new Date(), 7).toISOString() }),
    retry: false,
  });
  const { data: checkinList = [] } = useQuery({ queryKey: ["checkins"], queryFn: () => checkins.list({ limit: 7 }), retry: false });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const firstName = me?.name?.split(" ")[0] ?? me?.email?.split("@")[0] ?? "kullanıcı";

  const activeTasks = (taskList as any[]).filter((t: any) => t.status === "TODO" || t.status === "IN_PROGRESS");
  const doneTasks = (taskList as any[]).filter((t: any) => t.status === "DONE");
  const checkinCount = (checkinList as any[]).length;
  const logs = daily?.activityLogs ?? [];
  const score = Math.min(99, 40 + checkinCount * 8 + Math.min(doneTasks.length * 4, 30));

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">{format(now, "EEEE · d MMMM · HH:mm")}</span>
          <h1 className="topbar-title">{greeting}, {firstName}.</h1>
          <span className="muted fs-13">
            {checkinCount > 0 ? `Bu hafta ${checkinCount} log girdin — devam et.` : "Bugün ilk logunu girmek için check-in yap."}
          </span>
        </div>
        <div className="topbar-right">
          <span className="toast-pill"><span className="pulse-dot" />Agent aktif</span>
          <button className="icon-btn"><Icon name="bell" /></button>
          <button className="icon-btn"><Icon name="settings" /></button>
          <div className="avatar">{firstName[0]?.toUpperCase()}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card glow" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
            <div className="between">
              <div className="card-title"><span className="card-title-dot" />Life Pulse · bugün</div>
              <div className="row gap-8">
                <span className="chip info">GÜN</span>
                <span className="chip">HAFTA</span>
              </div>
            </div>
          </div>
          <PulseOrbHero score={score} />
          <div style={{ position: "absolute", left: 22, bottom: 18, fontSize: 11.5, color: "var(--text-2)", maxWidth: 320, lineHeight: 1.5 }}>
            <span className="mono dim" style={{ fontSize: 10, letterSpacing: "0.14em" }}>AGENT OKUMASI</span>
            <div className="mt-4">{activeTasks.length} aktif görev · {doneTasks.length} tamamlandı · {upcoming.length} yaklaşan etkinlik.</div>
          </div>
          <div style={{ position: "absolute", right: 22, bottom: 18, display: "flex", gap: 8 }}>
            <button className="btn sm primary" onClick={() => window.location.href = "/checkin"}><Icon name="arrow-right" size={12} />Günü logla</button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />Tutarlılık halkaları</div>
            <span className="card-sub">BU HAFTA</span>
          </div>
          <ConsistencyRings checkinCount={checkinCount} />
          <div className="divider" />
          <div className="row gap-10" style={{ flexWrap: "wrap" }}>
            {checkinCount >= 3 && <span className="chip up"><Icon name="fire" size={11} /> {checkinCount} günlük streak</span>}
            {activeTasks.length > 0 && <span className="chip info"><Icon name="target" size={11} /> {activeTasks.length} aktif görev</span>}
          </div>
        </div>
      </div>

      {/* Timeline + Momentum */}
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />Günlük zaman şeridi</div>
            <span className="chip info">BUGÜN</span>
          </div>
          <TimelineRibbon logs={logs} />
          <div className="mt-16" style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.55, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="sparkles" size={13} />
            <span>{logs.length > 0 ? `${logs.length} aktivite loglandı.` : "Henüz aktivite logu yok. Check-in yaparak gününü kaydet."}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--lime)", boxShadow: "0 0 8px var(--lime)" }} />Momentum</div>
            <span className="card-sub">GEÇEN HAFTAYA KARŞI</span>
          </div>
          <MomentumLanes checkinCount={checkinCount} taskDone={doneTasks.length} taskTotal={(taskList as any[]).length} />
        </div>
      </div>

      {/* AI Reflection + Upcoming */}
      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <AIReflection summary={todayCheckin?.summary} />
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Yaklaşan · sonraki 7 gün</div>
            <button className="card-action" onClick={() => window.location.href = "/schedule"}><Icon name="plus" size={12} />Ekle</button>
          </div>
          <UpcomingList events={upcoming as any[]} />
        </div>
      </div>

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />Öncelikli görevler</div>
            <span className="card-sub">{activeTasks.length} AKTİF</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {activeTasks.slice(0, 6).map((task: any, i: number) => (
              <div key={i} className="ach-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 9.5,
                    fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
                    background: task.priority === "URGENT" ? "rgba(239,68,68,0.15)" : task.priority === "HIGH" ? "rgba(245,158,11,0.15)" : "rgba(91,140,255,0.15)",
                    color: task.priority === "URGENT" ? "#EF4444" : task.priority === "HIGH" ? "#F59E0B" : "#5B8CFF",
                  }}>
                    {task.priority === "URGENT" ? "ACİL" : task.priority === "HIGH" ? "YÜKSEK" : "ORTA"}
                  </span>
                  {task.deadline && <span className="mono dim fs-11" style={{ marginLeft: "auto" }}>{format(new Date(task.deadline), "d MMM")}</span>}
                </div>
                <span className="fs-13" style={{ fontWeight: 500, lineHeight: 1.3 }}>{task.title}</span>
                {task.course && <span className="mono dim" style={{ fontSize: 10 }}>{task.course.name}</span>}
              </div>
            ))}
          </div>
          <button className="btn ghost" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => window.location.href = "/tasks"}>
            <Icon name="tasks" size={13} />Tüm görevleri gör
          </button>
        </div>
      )}
    </div>
  );
}
