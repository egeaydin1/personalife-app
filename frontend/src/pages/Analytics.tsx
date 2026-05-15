import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reports } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spark } from "@/components/ui/Spark";
import { format, startOfWeek } from "date-fns";

// Smooth catmull-rom path
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// Stream graph from real weekly data
function StreamGraph({ byCategory }: { byCategory: { name: string; minutes: number }[] }) {
  const cats = byCategory.length > 0 ? byCategory.slice(0, 5) : [
    { name: "Okul", color: "#5B8CFF", data: [4.2, 3.8, 5.5, 4.0, 4.5, 1.2, 0.8] },
    { name: "Sosyal", color: "#F472B6", data: [1.2, 0.6, 1.5, 1.0, 2.4, 3.5, 2.0] },
    { name: "Dijital", color: "#22D3EE", data: [3.5, 4.2, 3.0, 4.0, 3.6, 2.8, 4.5] },
    { name: "Hareket", color: "#A3E635", data: [0.6, 1.2, 0.0, 1.0, 0.8, 1.6, 1.2] },
    { name: "Dinlenme", color: "#8B5CF6", data: [8.0, 7.5, 8.0, 8.0, 7.5, 9.0, 9.5] },
  ];
  const COLORS_MAP: Record<string, string> = { okul: "#5B8CFF", sosyal: "#F472B6", dijital: "#22D3EE", school: "#5B8CFF", social: "#F472B6", digital: "#22D3EE", friends: "#F472B6", sports: "#A3E635", rest: "#8B5CF6", personal_dev: "#F59E0B", family: "#F59E0B" };

  const W = 720, H = 220, pad = 24;
  const catsWithData = cats.map((c: any, ci: number) => ({
    name: c.name,
    color: COLORS_MAP[c.name.toLowerCase()] ?? ["#5B8CFF", "#F472B6", "#22D3EE", "#A3E635", "#8B5CF6"][ci % 5],
    data: c.data ?? Array(7).fill(c.minutes / 7),
  }));

  const points = 7;
  const xStep = (W - pad * 2) / (points - 1);
  const totals = Array(points).fill(0);
  catsWithData.forEach(c => c.data.forEach((v: number, i: number) => (totals[i] += v)));
  const maxTotal = Math.max(...totals, 1);
  const baselines = totals.map(t => H / 2 + (t * (H - pad * 2) / maxTotal) / 2);
  const cumulative = Array(points).fill(0);

  const bands = catsWithData.map(c => {
    const top: [number, number][] = [], bottom: [number, number][] = [];
    for (let i = 0; i < points; i++) {
      const scale = (H - pad * 2) / maxTotal;
      const y1 = baselines[i] - cumulative[i] * scale;
      const y2 = y1 - (c.data[i] || 0) * scale;
      const x = pad + i * xStep;
      top.push([x, y1]); bottom.push([x, y2]);
      cumulative[i] += (c.data[i] || 0);
    }
    const topPath = smoothPath(top);
    const botPath = smoothPath([...bottom].reverse());
    return { c, path: `${topPath} L ${bottom[bottom.length - 1][0]} ${bottom[bottom.length - 1][1]} ${botPath.slice(1)} Z` };
  });

  const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 240 }}>
        <defs>
          {catsWithData.map(c => (
            <linearGradient key={c.name} id={`grad-${c.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={c.color} stopOpacity="0.4" />
            </linearGradient>
          ))}
        </defs>
        {bands.map((b, i) => (
          <path key={i} d={b.path} fill={`url(#grad-${b.c.name})`} stroke={b.c.color} strokeOpacity="0.3" strokeWidth="0.5" />
        ))}
        {days.map((d, i) => (
          <text key={d} x={pad + i * xStep} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="var(--font-mono)" fontSize="9">{d}</text>
        ))}
      </svg>
      <div className="row gap-12" style={{ marginTop: 8, flexWrap: "wrap" }}>
        {catsWithData.map(c => (
          <div key={c.name} className="row gap-6 fs-12">
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
            <span className="muted">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Heatmap 14 weeks
function Heatmap({ dailyBreakdown }: { dailyBreakdown?: { date: string; minutes: number }[] }) {
  const weeks = 14;
  const color = (v: number) => {
    if (v < 0.15) return "rgba(255,255,255,0.04)";
    if (v < 0.35) return "rgba(91,140,255,0.25)";
    if (v < 0.55) return "rgba(91,140,255,0.5)";
    if (v < 0.75) return "rgba(139,92,246,0.65)";
    return "rgba(244,114,182,0.8)";
  };
  const maxMin = Math.max(...(dailyBreakdown?.map(d => d.minutes) ?? [1]), 1);
  const days = ["P", "S", "Ç", "P", "C", "C", "P"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "20px repeat(14, 1fr)", gap: 4 }}>
        <div />
        {Array.from({ length: weeks }).map((_, i) => (
          <div key={i} className="mono dim" style={{ fontSize: 9, textAlign: "center" }}>{i % 2 === 0 ? `H${i + 1}` : ""}</div>
        ))}
        {days.map((d, di) => (
          <div key={di} style={{ display: "contents" }}>
            <div className="mono dim" style={{ fontSize: 9, textAlign: "center", paddingTop: 4 }}>{d}</div>
            {Array.from({ length: weeks }).map((_, w) => {
              const idx = dailyBreakdown ? (w * 7 + di) % dailyBreakdown.length : -1;
              const v = idx >= 0 && dailyBreakdown ? dailyBreakdown[idx].minutes / maxMin : Math.max(0, Math.sin(w * 0.7 + di * 0.4) * 0.5 + 0.5 + (Math.random() - 0.5) * 0.4);
              return <div key={w} style={{ aspectRatio: "1", borderRadius: 4, background: color(v), transition: "transform 160ms" }} />;
            })}
          </div>
        ))}
      </div>
      <div className="row gap-8 mt-12" style={{ alignItems: "center" }}>
        <span className="mono dim fs-11">Sakin</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 4, background: color(v) }} />)}
        <span className="mono dim fs-11">Yoğun</span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: weekly } = useQuery({ queryKey: ["reports", "weekly"], queryFn: () => reports.weekly(), retry: false });
  const { data: monthly } = useQuery({ queryKey: ["reports", "monthly"], queryFn: () => reports.monthly(), retry: false });
  const [view, setView] = useState<"weekly" | "monthly">("weekly");

  const kpis = [
    { label: "ODAK SAATİ / HAFTA", val: weekly ? `${Math.round((weekly.byCategory?.find((c: any) => c.name === "school" || c.name === "okul")?.minutes ?? 0) / 60 * 10) / 10}h` : "—", delta: "+0%", color: "#5B8CFF", spark: [18, 20, 19, 22, 23, 25, 26] },
    { label: "ORT. EKRAN SÜRESİ", val: "—", delta: "-0%", color: "#22D3EE", spark: [4.6, 4.4, 4.5, 4.2, 4.0, 3.9, 3.8] },
    { label: "SOSYAL SAATLER", val: weekly ? `${Math.round((weekly.byCategory?.find((c: any) => c.name === "social" || c.name === "sosyal" || c.name === "friends")?.minutes ?? 0) / 60 * 10) / 10}h` : "—", delta: "+0%", color: "#F472B6", spark: [4, 4.5, 5, 4.8, 5.5, 5.8, 6] },
    { label: "LOG TUTARLILIK", val: weekly ? `${Math.round((weekly.checkinsCompleted / 7) * 100)}%` : "—", delta: "+0%", color: "#A3E635", spark: [65, 68, 72, 74, 78, 80, 82] },
  ];

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Analitik · {format(new Date(), "MMMM yyyy")}</span>
          <h1 className="topbar-title">Trendler.</h1>
          <span className="muted fs-13">Metrik değil, örüntüler. Boşluktaki sayılar değil, bağlantılar.</span>
        </div>
        <div className="topbar-right">
          <div className="row gap-8" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
            <button className={`btn sm ${view === "weekly" ? "primary" : "ghost"}`} style={{ border: 0 }} onClick={() => setView("weekly")}>7g</button>
            <button className={`btn sm ${view === "monthly" ? "primary" : "ghost"}`} style={{ border: 0 }} onClick={() => setView("monthly")}>Ay</button>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {kpis.map((k, i) => (
          <div key={i} className="card tight">
            <div className="between">
              <span className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>{k.label}</span>
              <span className={`chip ${k.delta.startsWith("-") ? "info" : "up"}`}>{k.delta}</span>
            </div>
            <div className="num mt-8" style={{ fontSize: 28, color: k.color }}>{k.val}</div>
            <Spark data={k.spark} color={k.color} />
          </div>
        ))}
      </div>

      {/* Stream graph */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Haftanın akışı</div>
          <span className="card-sub">YIĞILMIŞ SAATLER</span>
        </div>
        <StreamGraph byCategory={weekly?.byCategory ?? []} />
      </div>

      {/* Heatmap + Goal vs Reality */}
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--pink)", boxShadow: "0 0 8px var(--pink)" }} />Odak yoğunluğu</div>
            <span className="card-sub">ISITMA HARİTASI</span>
          </div>
          <Heatmap dailyBreakdown={weekly?.dailyBreakdown} />
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--lime)", boxShadow: "0 0 8px var(--lime)" }} />Hedef vs gerçek</div>
            <span className="card-sub">BU HAFTA</span>
          </div>
          <div className="col gap-14">
            {[
              { label: "Çalışma saati", goal: 24, real: Math.round((weekly?.byCategory?.find((c: any) => /school|okul/i.test(c.name))?.minutes ?? 0) / 60 * 10) / 10, color: "#5B8CFF", unit: "h" },
              { label: "Log girişi", goal: 7, real: weekly?.checkinsCompleted ?? 0, color: "#A3E635", unit: "x" },
              { label: "Aktif görev", goal: 10, real: 0, color: "#F59E0B", unit: "x" },
            ].map((g, i) => {
              const pct = Math.min(100, (g.real / g.goal) * 100);
              return (
                <div key={i}>
                  <div className="between" style={{ marginBottom: 5 }}>
                    <span className="fs-12" style={{ fontWeight: 500 }}>{g.label}</span>
                    <span className="mono fs-11">
                      <span style={{ color: g.color }}>{g.real}{g.unit}</span>
                      <span className="dim"> / {g.goal}{g.unit}</span>
                    </span>
                  </div>
                  <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 50 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${g.color}cc, ${g.color})`, borderRadius: 50, boxShadow: `0 0 8px ${g.color}66` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Correlations */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />Agent'ın fark ettikleri</div>
            <span className="card-sub">14 HAFTALIK BAZA</span>
          </div>
          <div className="col gap-10">
            {[
              { left: "Spor günü", right: "Ertesi gün odak +18%", strength: 0.74, color: "#A3E635" },
              { left: "Akşam reels > 1s", right: "Sabah log atlama", strength: 0.68, color: "#22D3EE" },
              { left: "Pazar planlaması", right: "Hafta görev tamamlama +27%", strength: 0.81, color: "#5B8CFF" },
              { left: "Uyku < 7s", right: "Plan uyumu −14%", strength: 0.58, color: "#8B5CF6" },
            ].map((c, i) => (
              <div key={i} className="row gap-12" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="col" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500, fontSize: 12.5 }}>{c.left}</span>
                  <span className="muted fs-11" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="arrow-right" size={11} /> {c.right}
                  </span>
                </div>
                <div style={{ width: 60, height: 6, borderRadius: 50, background: "rgba(255,255,255,0.05)", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${c.strength * 100}%`, background: c.color, borderRadius: 50, boxShadow: `0 0 6px ${c.color}88` }} />
                </div>
                <span className="num fs-12" style={{ width: 32, textAlign: "right", color: c.color }}>{Math.round(c.strength * 100)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.06), rgba(91,140,255,0.02))", borderColor: "rgba(139,92,246,0.25)" }}>
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Kategorilere göre süre</div>
            <span className="card-sub">BU HAFTA</span>
          </div>
          <div className="col gap-10">
            {(weekly?.byCategory ?? []).slice(0, 6).map((c: any, i: number) => {
              const colors = ["#5B8CFF", "#F472B6", "#22D3EE", "#A3E635", "#8B5CF6", "#F59E0B"];
              const color = colors[i % colors.length];
              const h = Math.round(c.minutes / 60 * 10) / 10;
              return (
                <div key={i} className="row" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", justifyContent: "space-between" }}>
                  <div className="row gap-8">
                    <span style={{ width: 8, height: 8, borderRadius: 50, background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span style={{ fontSize: 12.5 }}>{c.name}</span>
                  </div>
                  <span className="num fs-13" style={{ color }}>{h}h</span>
                </div>
              );
            })}
            {(!weekly?.byCategory || weekly.byCategory.length === 0) && (
              <span className="muted fs-12" style={{ fontStyle: "italic", padding: 8 }}>Henüz veri yok — check-in yap.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
