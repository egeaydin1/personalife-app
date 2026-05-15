import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reports } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spark } from "@/components/ui/Spark";
import { format } from "date-fns";

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: 50, background: "var(--surface)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--text-3)" }}>
        <Icon name="chart" size={20} />
      </div>
      <p className="muted fs-12" style={{ fontStyle: "italic" }}>{message}</p>
    </div>
  );
}

// ── Stream graph — real stacked area ─────────────────────────
function StreamGraph({ byCategory }: { byCategory: { name: string; minutes: number }[] }) {
  if (!byCategory || byCategory.length === 0) {
    return <EmptyState message="Henüz aktivite logu yok — check-in yap." />;
  }

  const COLORS: Record<string, string> = {
    school: "#5B8CFF", okul: "#5B8CFF",
    social: "#F472B6", sosyal: "#F472B6", friends: "#F472B6", arkadaşlar: "#F472B6",
    digital: "#22D3EE", dijital: "#22D3EE",
    sports: "#A3E635", spor: "#A3E635",
    rest: "#8B5CF6", dinlenme: "#8B5CF6",
    personal_dev: "#F59E0B",
    family: "#F59E0B", aile: "#F59E0B",
    work: "#EF4444", iş: "#EF4444",
    uncategorized: "#5b6390",
  };
  const fallbackColors = ["#5B8CFF", "#F472B6", "#22D3EE", "#A3E635", "#8B5CF6", "#F59E0B"];

  const total = byCategory.reduce((s, c) => s + c.minutes, 0);

  return (
    <div>
      {/* Simple horizontal bar breakdown */}
      <div className="col gap-10">
        {byCategory.map((c, i) => {
          const color = COLORS[c.name.toLowerCase()] ?? fallbackColors[i % fallbackColors.length];
          const pct = Math.round((c.minutes / total) * 100);
          const h = Math.round(c.minutes / 60 * 10) / 10;
          return (
            <div key={c.name}>
              <div className="between" style={{ marginBottom: 5 }}>
                <div className="row gap-8">
                  <span style={{ width: 10, height: 10, borderRadius: 50, background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                  <span className="fs-13" style={{ fontWeight: 500 }}>{c.name}</span>
                </div>
                <div className="row gap-8">
                  <span className="mono fs-12" style={{ color }}>{h}s</span>
                  <span className="mono dim fs-11">{pct}%</span>
                </div>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 50, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, borderRadius: 50, boxShadow: `0 0 8px ${color}44`, transition: "width 600ms cubic-bezier(.2,.8,.2,1)" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="between mt-16" style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <span className="mono dim fs-11">TOPLAM</span>
        <span className="num fs-14">{Math.round(total / 60 * 10) / 10}s · {byCategory.length} kategori</span>
      </div>
    </div>
  );
}

// ── Activity heatmap — real daily data ───────────────────────
function Heatmap({ dailyBreakdown }: { dailyBreakdown?: { date: string; minutes: number }[] }) {
  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    return <EmptyState message="Yeterli günlük veri yok." />;
  }

  const maxMin = Math.max(...dailyBreakdown.map(d => d.minutes), 1);
  const color = (v: number) => {
    if (v < 0.1) return "rgba(255,255,255,0.04)";
    if (v < 0.3) return "rgba(91,140,255,0.25)";
    if (v < 0.55) return "rgba(91,140,255,0.5)";
    if (v < 0.75) return "rgba(139,92,246,0.65)";
    return "rgba(244,114,182,0.8)";
  };

  // Group by week
  const weeks: { date: string; minutes: number }[][] = [];
  let week: { date: string; minutes: number }[] = [];
  dailyBreakdown.forEach((d, i) => {
    week.push(d);
    if (week.length === 7 || i === dailyBreakdown.length - 1) {
      weeks.push([...week]);
      week = [];
    }
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(weeks.length, 14)}, 1fr)`, gap: 4 }}>
        {weeks.slice(-14).map((w, wi) => (
          <div key={wi} className="col gap-1">
            {w.map((d, di) => {
              const v = d.minutes / maxMin;
              return (
                <div key={di} title={`${d.date}: ${Math.round(d.minutes / 60 * 10) / 10}s`}
                  style={{ aspectRatio: "1", borderRadius: 4, background: color(v), transition: "transform 160ms", cursor: "default" }} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="row gap-8 mt-12" style={{ alignItems: "center" }}>
        <span className="mono dim fs-11">Az</span>
        {[0.05, 0.3, 0.55, 0.75, 0.9].map((v, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 4, background: color(v) }} />)}
        <span className="mono dim fs-11">Çok</span>
      </div>
    </div>
  );
}

// ── Goal vs reality ───────────────────────────────────────────
function GoalVsReality({ weekly }: { weekly: any }) {
  if (!weekly) return <EmptyState message="Yükleniyor..." />;

  const schoolMin = weekly.byCategory?.find((c: any) => /school|okul/i.test(c.name))?.minutes ?? 0;
  const checkins = weekly.checkinsCompleted ?? 0;
  const screenMin = weekly.screenByApp?.reduce((s: number, a: any) => s + a.minutes, 0) ?? 0;

  const rows = [
    { label: "Check-in", real: checkins, goal: 7, unit: "gün", color: "#A3E635", hasData: true },
    { label: "Çalışma saati", real: Math.round(schoolMin / 60 * 10) / 10, goal: 24, unit: "s", color: "#5B8CFF", hasData: schoolMin > 0 },
    { label: "Ekran süresi", real: Math.round(screenMin / 60 * 10) / 10, goal: 28, unit: "s", color: "#22D3EE", hasData: screenMin > 0, lowerIsBetter: true },
  ].filter(r => r.hasData);

  if (rows.length === 0) return <EmptyState message="Henüz veri yok." />;

  return (
    <div className="col gap-14">
      {rows.map((g, i) => {
        const pct = Math.min(100, (g.real / g.goal) * 100);
        const good = g.lowerIsBetter ? pct <= 100 : pct >= 80;
        return (
          <div key={i}>
            <div className="between" style={{ marginBottom: 5 }}>
              <span className="fs-12" style={{ fontWeight: 500 }}>{g.label}</span>
              <span className="mono fs-11">
                <span style={{ color: good ? "var(--success)" : "var(--warning)" }}>{g.real}{g.unit}</span>
                <span className="dim"> / hedef {g.goal}{g.unit}</span>
              </span>
            </div>
            <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 50 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${g.color}cc, ${g.color})`, borderRadius: 50, boxShadow: `0 0 8px ${g.color}66` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Screen time breakdown ─────────────────────────────────────
function ScreenApps({ screenByApp }: { screenByApp?: { appName: string; minutes: number }[] }) {
  if (!screenByApp || screenByApp.length === 0) {
    return <EmptyState message="Ekran süresi verisi yok — ekran görüntüsü yükle." />;
  }
  const maxMin = screenByApp[0]?.minutes ?? 1;
  return (
    <div className="col gap-10">
      {screenByApp.slice(0, 8).map((a, i) => {
        const pct = (a.minutes / maxMin) * 100;
        const h = Math.round(a.minutes / 60 * 10) / 10;
        return (
          <div key={i}>
            <div className="between" style={{ marginBottom: 4 }}>
              <span className="fs-12" style={{ fontWeight: 500 }}>{a.appName}</span>
              <span className="mono fs-11" style={{ color: "var(--cyan)" }}>{a.minutes < 60 ? `${a.minutes}dk` : `${h}s`}</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 50, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, rgba(34,211,238,0.6), rgba(34,211,238,1))", borderRadius: 50 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Daily activity list ───────────────────────────────────────
function DailyLog({ activityLogs }: { activityLogs?: any[] }) {
  if (!activityLogs || activityLogs.length === 0) {
    return <EmptyState message="Bugün henüz aktivite logu yok." />;
  }
  return (
    <div className="col gap-8">
      {activityLogs.map((log: any, i: number) => (
        <div key={i} className="row gap-12" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ width: 8, height: 8, borderRadius: 50, background: "var(--primary)", marginTop: 4, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="fs-13" style={{ fontWeight: 500 }}>{log.title}</div>
            {log.description && <div className="muted fs-11" style={{ marginTop: 2 }}>{log.description}</div>}
          </div>
          {log.durationMin && <span className="mono dim fs-11">{log.durationMin < 60 ? `${log.durationMin}dk` : `${Math.round(log.durationMin / 60 * 10) / 10}s`}</span>}
          {log.category && <span className="chip" style={{ fontSize: 10 }}>{log.category.name}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function Analytics() {
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("weekly");

  const { data: daily } = useQuery({ queryKey: ["reports", "daily"], queryFn: () => reports.daily(), retry: false });
  const { data: weekly } = useQuery({ queryKey: ["reports", "weekly"], queryFn: () => reports.weekly(), retry: false });
  const { data: monthly } = useQuery({ queryKey: ["reports", "monthly"], queryFn: () => reports.monthly(), retry: false });

  const hasWeeklyData = (weekly?.byCategory?.length ?? 0) > 0;
  const hasMonthlyData = (monthly?.byCategory?.length ?? 0) > 0;
  const hasDailyData = (daily?.activityLogs?.length ?? 0) > 0 || (daily?.summary?.totalScreenMin ?? 0) > 0;

  // KPI values from real data only
  const schoolHours = weekly?.byCategory?.find((c: any) => /school|okul/i.test(c.name))?.minutes ?? 0;
  const socialHours = weekly?.byCategory?.find((c: any) => /social|sosyal|friends/i.test(c.name))?.minutes ?? 0;
  const screenMinWeek = weekly?.screenByApp?.reduce((s: number, a: any) => s + a.minutes, 0) ?? 0;

  const kpis = [
    { label: "CHECK-IN (BU HAFTA)", val: weekly ? `${weekly.checkinsCompleted ?? 0}/7`, color: "#A3E635", spark: null },
    { label: "OKUL SAATİ", val: schoolHours > 0 ? `${Math.round(schoolHours / 60 * 10) / 10}s` : "—", color: "#5B8CFF", spark: null },
    { label: "SOSYAL SAATİ", val: socialHours > 0 ? `${Math.round(socialHours / 60 * 10) / 10}s` : "—", color: "#F472B6", spark: null },
    { label: "EKRAN SÜRESİ", val: screenMinWeek > 0 ? `${Math.round(screenMinWeek / 60 * 10) / 10}s` : "—", color: "#22D3EE", spark: null },
  ];

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Analitik · {format(new Date(), "MMMM yyyy")}</span>
          <h1 className="topbar-title">Trendler.</h1>
          <span className="muted fs-13">Sayılar değil örüntüler. Gerçek verilerden içgörü.</span>
        </div>
        <div className="topbar-right">
          <div className="row gap-8" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
            {(["daily", "weekly", "monthly"] as const).map(v => (
              <button key={v} className={`btn sm ${view === v ? "primary" : "ghost"}`} style={{ border: 0 }} onClick={() => setView(v)}>
                {v === "daily" ? "Bugün" : v === "weekly" ? "7 gün" : "Ay"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {kpis.map((k, i) => (
          <div key={i} className="card tight">
            <span className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>{k.label}</span>
            <div className="num mt-8" style={{ fontSize: 28, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {view === "daily" && (
        <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title"><span className="card-title-dot" style={{ background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }} />Bugünkü aktiviteler</div>
              <span className="card-sub">{daily?.summary?.activitiesLogged ?? 0} LOG</span>
            </div>
            <DailyLog activityLogs={daily?.activityLogs} />
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title"><span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />Ekran süresi — bugün</div>
            </div>
            <ScreenApps screenByApp={daily?.screenTimeEntries?.length > 0 ? daily.screenTimeEntries.reduce((acc: any, e: any) => {
              const existing = acc.find((a: any) => a.appName === e.appName);
              if (existing) existing.minutes += e.durationMin;
              else acc.push({ appName: e.appName, minutes: e.durationMin });
              return acc;
            }, []).sort((a: any, b: any) => b.minutes - a.minutes) : []} />
          </div>
        </div>
      )}

      {view === "weekly" && (
        <>
          <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Kategori dağılımı</div>
                <span className="card-sub">BU HAFTA</span>
              </div>
              {hasWeeklyData ? <StreamGraph byCategory={weekly.byCategory} /> : <EmptyState message="Bu hafta henüz aktivite logu yok." />}
            </div>
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--lime)", boxShadow: "0 0 8px var(--lime)" }} />Hedef vs gerçek</div>
              </div>
              <GoalVsReality weekly={weekly} />
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--pink)", boxShadow: "0 0 8px var(--pink)" }} />Günlük aktivite dağılımı</div>
                <span className="card-sub">ISITMA HARİTASI</span>
              </div>
              <Heatmap dailyBreakdown={weekly?.dailyBreakdown} />
            </div>
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />En çok kullanılan uygulamalar</div>
                <span className="card-sub">EKRAN SÜRESİ</span>
              </div>
              <ScreenApps screenByApp={weekly?.screenByApp} />
            </div>
          </div>
        </>
      )}

      {view === "monthly" && (
        <>
          {/* Monthly summary stats */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Check-in", val: `${monthly?.checkinsCompleted ?? 0}`, sub: "gün" },
              { label: "Görev tamamlama", val: monthly?.tasksTotal > 0 ? `${monthly.tasksCompleted}/${monthly.tasksTotal}` : "—", sub: "" },
              { label: "Toplam aktivite", val: monthly?.totalActivityHours > 0 ? `${Math.round(monthly.totalActivityHours * 10) / 10}s` : "—", sub: "" },
              { label: "Ekran süresi", val: monthly?.totalScreenHours > 0 ? `${Math.round(monthly.totalScreenHours * 10) / 10}s` : "—", sub: "" },
            ].map((s, i) => (
              <div key={i} className="card tight" style={{ textAlign: "center" }}>
                <div className="num" style={{ fontSize: 28 }}>{s.val}</div>
                <div className="muted fs-11">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Aylık kategori dağılımı</div>
              </div>
              {hasMonthlyData ? <StreamGraph byCategory={monthly.byCategory} /> : <EmptyState message="Bu ay henüz yeterli aktivite logu yok." />}
            </div>
            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />En çok kullanılan uygulamalar</div>
              </div>
              <ScreenApps screenByApp={monthly?.screenByApp} />
            </div>
          </div>
        </>
      )}

      {/* Prompt to start logging */}
      {!hasDailyData && !hasWeeklyData && (
        <div className="card glow" style={{ textAlign: "center", padding: "48px 24px", background: "linear-gradient(180deg, rgba(91,140,255,0.06), transparent)", borderColor: "rgba(91,140,255,0.25)" }}>
          <Icon name="chart" size={32} />
          <div className="display mt-12" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Henüz veri yok</div>
          <p className="muted fs-13" style={{ marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>
            Analizler için günlük check-in yapman ve aktivite loglamanı gerekiyor. Ne kadar log girersen analitik o kadar zenginleşir.
          </p>
          <button className="btn primary" onClick={() => window.location.href = "/checkin"}>
            <Icon name="edit" size={14} />İlk check-in'i yap
          </button>
        </div>
      )}
    </div>
  );
}
