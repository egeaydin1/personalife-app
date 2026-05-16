import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent, tasks, auth } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format, addDays } from "date-fns";
import { getToken } from "@/lib/auth";

async function req<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Mini card component ───────────────────────────────────────
function Block({ title, color, children, count }: {
  title: string; color: string; children: React.ReactNode; count?: number;
}) {
  return (
    <div style={{
      borderRadius: 16, padding: "16px 18px",
      background: `linear-gradient(180deg, ${color}08, transparent)`,
      border: `1px solid ${color}22`,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
          <span className="display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</span>
        </div>
        {count !== undefined && (
          <span className="mono dim fs-11">{count} madde</span>
        )}
      </div>
      <div className="col gap-6">{children}</div>
    </div>
  );
}

function Item({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{ padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
      <div className="fs-12" style={{ lineHeight: 1.45 }}>{text}</div>
      {sub && <div className="mono dim fs-11" style={{ marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="muted fs-12" style={{ padding: "6px 2px", fontStyle: "italic" }}>{msg}</div>;
}

// ── Main ──────────────────────────────────────────────────────
export default function Memory() {
  const qc = useQueryClient();
  const [rawOpen, setRawOpen] = useState(false);

  // Structured data from real endpoints
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const { data: taskList = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasks.list({ topLevel: true } as any) });
  const { data: snap, dataUpdatedAt } = useQuery({ queryKey: ["memory"], queryFn: agent.memory, staleTime: 0 });
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: () => req<any[]>("/courses") });
  const { data: upcoming = [] } = useQuery({
    queryKey: ["calendar", "upcoming-memory"],
    queryFn: () => req<any[]>(`/calendar?from=${new Date().toISOString()}&to=${addDays(new Date(), 14).toISOString()}`),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["activity-logs", "memory"],
    queryFn: () => req<any[]>("/activity-logs?limit=40"),
  });
  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: () => req<any[]>("/friends"),
  });
  const { data: attSummary = [] } = useQuery({
    queryKey: ["attendance", "summary"],
    queryFn: () => req<any[]>("/courses/attendance/summary"),
  });

  const refreshMut = useMutation({
    mutationFn: agent.refreshMemory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory"] });
      qc.invalidateQueries({ queryKey: ["activity-logs", "memory"] });
    },
  });

  // Derived data
  const activeTasks = (taskList as any[]).filter(t => ["TODO", "IN_PROGRESS"].includes(t.status));
  const milestones = activeTasks.filter(t => t.isMilestone);
  const regularTasks = activeTasks.filter(t => !t.isMilestone);

  // Category totals from logs
  const catTotals: Record<string, number> = {};
  for (const l of logs as any[]) {
    const cat = l.category?.name ?? "diğer";
    catTotals[cat] = (catTotals[cat] ?? 0) + (l.durationMin ?? 0);
  }
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Missing days (last 7)
  const logDays = new Set((logs as any[]).map(l => new Date(l.createdAt).toISOString().slice(0, 10)));
  const missingDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), -(i + 1));
    return d.toISOString().slice(0, 10);
  }).filter(d => !logDays.has(d));

  function fmtMin(m: number) {
    if (m < 60) return `${m}dk`;
    return `${(m / 60).toFixed(1)}s`;
  }

  const snapAge = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 60000) : null;

  return (
    <div className="col gap-20">
      {/* Header */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">memory.md · bağlam anlık görüntüsü</span>
          <h1 className="topbar-title">Şu anki durumun.</h1>
          <span className="muted fs-13">Agent'ın hayatını şu an nasıl okuduğu.</span>
        </div>
        <div className="topbar-right">
          <span className="toast-pill">
            <span className="pulse-dot" />
            {snapAge !== null ? `${snapAge} dk önce güncellendi` : "Yükleniyor"}
          </span>
          <button className="btn primary" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>
            <Icon name={refreshMut.isPending ? "loader" : "sparkles"} size={13} />
            {refreshMut.isPending ? "Yenileniyor..." : "Yenile"}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "AKTİF GÖREV", value: activeTasks.length, color: "var(--primary)" },
          { label: "AKTİVİTE LOGU", value: (logs as any[]).length, color: "var(--cyan)" },
          { label: "MILESTONE", value: milestones.length, color: "var(--amber)" },
          { label: "EKSİK LOG GÜNÜ", value: missingDays.length, color: missingDays.length > 3 ? "var(--danger)" : "var(--lime)" },
        ].map((s, i) => (
          <div key={i} className="card tight" style={{ textAlign: "center" }}>
            <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 6 }}>{s.label}</div>
            <div className="num" style={{ fontSize: 32, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 3-column main grid */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "start" }}>

        {/* Col 1: Tasks */}
        <div className="col gap-12">
          {milestones.length > 0 && (
            <Block title="Milestones" color="var(--amber)" count={milestones.length}>
              {milestones.map((t: any) => (
                <Item key={t.id} text={`🎯 ${t.title}`}
                  sub={t.milestoneDate ? `Hedef: ${format(new Date(t.milestoneDate), "d MMM")}` : t.category?.name} />
              ))}
            </Block>
          )}
          <Block title="Aktif Görevler" color="var(--primary)" count={regularTasks.length}>
            {regularTasks.length === 0
              ? <Empty msg="Aktif görev yok" />
              : regularTasks.slice(0, 6).map((t: any) => (
                <Item key={t.id}
                  text={`[${t.status}] ${t.title}`}
                  sub={[t.category?.name, t.deadline ? `due ${format(new Date(t.deadline), "d MMM")}` : ""].filter(Boolean).join(" · ")}
                />
              ))}
            {regularTasks.length > 6 && <div className="mono dim fs-11">+{regularTasks.length - 6} görev daha</div>}
          </Block>

          <Block title="Ders Programı" color="#8B5CF6" count={(courses as any[]).length}>
            {(courses as any[]).length === 0
              ? <Empty msg="Ders eklenmemiş" />
              : (courses as any[]).map((c: any) => (
                <Item key={c.id}
                  text={c.name}
                  sub={`${c.daysOfWeek.map((d: number) => ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][d]).join(", ")} · ${c.startTime}–${c.endTime}${c.room ? ` · ${c.room}` : ""}`}
                />
              ))}
          </Block>

          {(attSummary as any[]).length > 0 && (
            <Block title="Devamsızlık" color="var(--danger)">
              {(attSummary as any[]).map((s: any) => (
                <Item key={s.courseId}
                  text={s.courseName}
                  sub={s.rate !== null ? `${s.attended}/${s.total} · %${s.rate} devam` : "Henüz işaretlenmedi"}
                />
              ))}
            </Block>
          )}
        </div>

        {/* Col 2: Activity + Calendar */}
        <div className="col gap-12">
          <Block title="Aktivite Özeti (7 gün)" color="var(--cyan)" count={topCats.length}>
            {topCats.length === 0
              ? <Empty msg="Son 7 günde log yok" />
              : topCats.map(([cat, min]) => (
                <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span className="fs-12" style={{ fontWeight: 500 }}>{cat}</span>
                  <span className="mono fs-12" style={{ color: "var(--cyan)" }}>{fmtMin(min)}</span>
                </div>
              ))}
            {missingDays.length > 0 && (
              <div style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 11.5, color: "var(--amber)" }}>
                ⚠ Eksik günler: {missingDays.slice(0, 4).map(d => format(new Date(d), "d MMM")).join(", ")}
              </div>
            )}
          </Block>

          <Block title="Yaklaşan (14 gün)" color="var(--pink)" count={(upcoming as any[]).length}>
            {(upcoming as any[]).length === 0
              ? <Empty msg="Yaklaşan etkinlik yok" />
              : (upcoming as any[]).slice(0, 5).map((ev: any) => (
                <Item key={ev.id}
                  text={ev.title}
                  sub={format(new Date(ev.startAt), "EEE d MMM · HH:mm")}
                />
              ))}
          </Block>

          <Block title="Son Check-in" color="var(--success)">
            <Item text={`Tarih: ${format(new Date(), "d MMMM yyyy")}`} />
            <Item text={`Toplam log: ${(logs as any[]).length}`} sub={`Son aktivite: ${(logs as any[])[0]?.title ?? "—"}`} />
          </Block>
        </div>

        {/* Col 3: Social + User profile */}
        <div className="col gap-12">
          <Block title="Profil" color="var(--purple)">
            <Item text={`${me?.name ?? "—"}`} sub={`${me?.role ?? "—"} · ${me?.timezone ?? "Europe/Istanbul"}`} />
            {me?.school && <Item text={me.school} sub={me.major ?? "—"} />}
            {me?.wakeTime && <Item text={`Ritim: ${me.wakeTime} — ${me.sleepTime}`} sub={`Peak: ${me.peakHours ?? "—"}`} />}
            {me?.agentContactPref && <Item text={`Agent: ${me.agentContactPref} · ${me.agentTone}`} />}
          </Block>

          <Block title="Sosyal Çevre" color="var(--pink)" count={(friends as any[]).length}>
            {(friends as any[]).length === 0
              ? <Empty msg="Arkadaş eklenmemiş" />
              : (friends as any[]).slice(0, 5).map((f: any) => (
                <Item key={f.id}
                  text={f.name}
                  sub={[
                    f.relationshipType,
                    f.lastContactAt ? `son: ${format(new Date(f.lastContactAt), "d MMM")}` : null,
                  ].filter(Boolean).join(" · ")}
                />
              ))}
          </Block>

          {me?.focusAreas?.length > 0 && (
            <Block title="Odak Alanları" color="var(--lime)">
              <div className="row gap-6" style={{ flexWrap: "wrap" }}>
                {me.focusAreas.map((a: string) => (
                  <span key={a} className="chip purple" style={{ fontSize: 11 }}>{a}</span>
                ))}
              </div>
            </Block>
          )}

          {me?.dailyRoutine && (
            <Block title="Tipik Gün" color="var(--amber)">
              <div className="fs-12 muted" style={{ lineHeight: 1.55, fontStyle: "italic" }}>"{me.dailyRoutine}"</div>
            </Block>
          )}

          {/* One-liner */}
          <div style={{ padding: "14px 16px", borderRadius: 16, background: "linear-gradient(180deg,rgba(139,92,246,0.08),transparent)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 8 }}>AGENT GÖZÜYLE</div>
            <div className="fs-13" style={{ lineHeight: 1.7, fontStyle: "italic" }}>
              "{(logs as any[]).length > 0
                ? `${(logs as any[]).length} aktivite logu, ${activeTasks.length} aktif görev ve ${(friends as any[]).length} arkadaşla takip edilen bir hayat. Agent seninle her check-in'de daha çok tanışıyor.`
                : "Henüz yeterli veri yok. Check-in yaptıkça agent seni tanımaya başlar."}"
            </div>
            <div className="row gap-6 mt-12" style={{ flexWrap: "wrap" }}>
              <span className="chip purple" style={{ fontSize: 10 }}>yansımalı karakter</span>
              <span className="chip info" style={{ fontSize: 10 }}>loglara dayalı</span>
              <span className="chip up" style={{ fontSize: 10 }}>gelişiyor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Raw memory — collapsible */}
      <div>
        <button onClick={() => setRawOpen(o => !o)}
          className="btn ghost sm"
          style={{ marginBottom: rawOpen ? 12 : 0 }}>
          <Icon name={rawOpen ? "arrow-up" : "arrow-down"} size={13} />
          {rawOpen ? "Ham memory.md'yi gizle" : "Ham memory.md'yi göster"}
        </button>
        {rawOpen && snap?.content && (
          <div className="card" style={{ padding: 16 }}>
            <pre style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.65, overflow: "auto", maxHeight: 360, whiteSpace: "pre-wrap", margin: 0 }}>
              {snap.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
