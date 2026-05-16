import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { getToken } from "@/lib/auth";

const BASE = "/api/v1";

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  okul: "#5B8CFF", iş: "#F59E0B", sosyal: "#F472B6", dijital: "#22D3EE",
  spor: "#A3E635", kişisel: "#8B5CF6", aile: "#F59E0B", dinlenme: "#8B5CF6",
};
const CAT_ICONS: Record<string, string> = {
  okul: "school", iş: "zap", sosyal: "users", dijital: "phone",
  spor: "heart", kişisel: "sparkles", aile: "users", dinlenme: "moon",
};
const CATS = ["okul", "iş", "sosyal", "dijital", "spor", "kişisel", "aile", "dinlenme"];

function fmtDur(min: number | null | undefined): string {
  if (!min) return "";
  if (min < 60) return `${min}dk`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}s ${m}dk` : `${h}s`;
}

function dayLabel(d: Date): string {
  if (isToday(d)) return "Bugün";
  if (isYesterday(d)) return "Dün";
  return format(d, "d MMMM yyyy");
}

// ── Inline Edit Form ──────────────────────────────────────────
function EditForm({ log, onSave, onCancel }: { log: any; onSave: (d: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(log.title ?? "");
  const [description, setDescription] = useState(log.description ?? "");
  const [durationMin, setDurationMin] = useState(log.durationMin?.toString() ?? "");

  const fieldStyle: React.CSSProperties = {
    padding: "8px 10px", borderRadius: 8, background: "var(--surface)",
    border: "1px solid var(--border-strong)", color: "var(--text-0)",
    fontFamily: "var(--font-body)", fontSize: 13, outline: "none", width: "100%",
  };

  return (
    <div className="col gap-8">
      <input style={fieldStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Başlık" />
      <input style={fieldStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Açıklama (opsiyonel)" />
      <input style={{ ...fieldStyle, maxWidth: 160 }} type="number" value={durationMin}
        onChange={e => setDurationMin(e.target.value)} placeholder="Süre (dakika)" />
      <div className="row gap-8">
        <button className="btn primary sm"
          onClick={() => onSave({ title, description: description || undefined, durationMin: durationMin ? parseInt(durationMin) : undefined })}>
          Kaydet
        </button>
        <button className="btn ghost sm" onClick={onCancel}>İptal</button>
      </div>
    </div>
  );
}

// ── Log Card ──────────────────────────────────────────────────
function LogCard({ log, onEdit, onDelete }: { log: any; onEdit: () => void; onDelete: () => void }) {
  const cat = log.category?.name ?? "";
  const color = CAT_COLORS[cat] ?? "var(--text-3)";
  const icon = CAT_ICONS[cat] ?? "sparkles";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
        background: `${color}15`, color, display: "grid", placeItems: "center",
        border: `1px solid ${color}30`,
      }}>
        <Icon name={icon as any} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
          <span className="fs-13" style={{ fontWeight: 600 }}>{log.title}</span>
          {cat && (
            <span style={{
              padding: "1px 8px", borderRadius: 6, fontSize: 9.5,
              fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
              background: `${color}15`, color, border: `1px solid ${color}30`,
            }}>{cat}</span>
          )}
          {log.durationMin ? (
            <span className="mono dim fs-11">{fmtDur(log.durationMin)}</span>
          ) : null}
        </div>
        {log.description && (
          <p className="muted fs-12" style={{ lineHeight: 1.4, marginBottom: 3 }}>{log.description}</p>
        )}
        <div className="mono dim fs-11">
          {format(new Date(log.createdAt), "HH:mm")} · {log.source}
        </div>
      </div>
      <div className="row gap-4">
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: 6 }}
          onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--primary)"; (e.currentTarget as any).style.background = "var(--surface)"; }}
          onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; (e.currentTarget as any).style.background = "none"; }}
          onClick={onEdit}>
          <Icon name="edit" size={14} />
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: 6 }}
          onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--danger)"; (e.currentTarget as any).style.background = "rgba(239,68,68,0.08)"; }}
          onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; (e.currentTarget as any).style.background = "none"; }}
          onClick={onDelete}>
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ActivityLogs() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("all");

  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => req<any[]>("/activity-logs?limit=200"),
    retry: false,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      req(`/activity-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-logs"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setEditId(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => req(`/activity-logs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-logs"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  // Filter
  const logs = filterCat === "all"
    ? (rawLogs as any[])
    : (rawLogs as any[]).filter((l: any) => l.category?.name === filterCat);

  // Group by day
  const groups = new Map<string, any[]>();
  for (const log of logs) {
    const day = startOfDay(new Date(log.createdAt)).toISOString();
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(log);
  }
  const groupEntries = Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Aktivite geçmişi · {(rawLogs as any[]).length} kayıt</span>
          <h1 className="topbar-title">Aktivite Logları.</h1>
          <span className="muted fs-13">Agent ve check-in'den otomatik oluşturulur. Düzenleyebilirsin.</span>
        </div>
        <div className="topbar-right">
          <button className="btn ghost sm" onClick={() => window.location.href = "/checkin"}>
            <Icon name="plus" size={13} />Check-in yap
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="row gap-6" style={{ flexWrap: "wrap" }}>
        <button onClick={() => setFilterCat("all")}
          className={filterCat === "all" ? "chip info" : "chip"}
          style={{ cursor: "pointer", border: "none" }}>
          Tümü <span className="mono dim fs-11">({(rawLogs as any[]).length})</span>
        </button>
        {CATS.map(c => {
          const count = (rawLogs as any[]).filter((l: any) => l.category?.name === c).length;
          if (count === 0) return null;
          const color = CAT_COLORS[c] ?? "var(--text-3)";
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: "999px",
                fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em",
                background: filterCat === c ? `${color}15` : "var(--surface-2)",
                color: filterCat === c ? color : "var(--text-1)",
                border: filterCat === c ? `1px solid ${color}55` : "1px solid var(--border)",
              }}>
              {c} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="muted fs-13" style={{ textAlign: "center", padding: 40 }}>Yükleniyor...</div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 52 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(91,140,255,0.1)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--primary)" }}>
            <Icon name="edit" size={26} />
          </div>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {filterCat === "all" ? "Henüz aktivite logu yok" : `"${filterCat}" kategorisinde log yok`}
          </div>
          <p className="muted fs-13" style={{ marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>
            Check-in yaptıkça agent aktiviteleri otomatik kaydeder.
          </p>
          <button className="btn primary" style={{ margin: "0 auto" }} onClick={() => window.location.href = "/checkin"}>
            <Icon name="edit" size={14} />Check-in yap
          </button>
        </div>
      )}

      {/* Grouped by day */}
      <div className="col gap-20">
        {groupEntries.map(([dayKey, dayLogs]) => {
          const dayDate = new Date(dayKey);
          return (
            <div key={dayKey}>
              {/* Day header */}
              <div className="row gap-8" style={{ marginBottom: 10, alignItems: "center" }}>
                <span className="display" style={{ fontSize: 14, fontWeight: 600 }}>{dayLabel(dayDate)}</span>
                <span className="mono dim fs-11">{format(dayDate, "EEEE")}</span>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border), transparent)" }} />
                <span className="mono dim fs-11">{dayLogs.length} aktivite</span>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div className="col gap-12">
                  {dayLogs.map((log: any, i: number) => (
                    <div key={log.id}>
                      {i > 0 && <div className="divider" style={{ margin: "8px 0" }} />}
                      {editId === log.id ? (
                        <EditForm
                          log={log}
                          onSave={data => updateMut.mutate({ id: log.id, data })}
                          onCancel={() => setEditId(null)}
                        />
                      ) : (
                        <LogCard
                          log={log}
                          onEdit={() => setEditId(log.id)}
                          onDelete={() => {
                            if (confirm(`"${log.title}" silinsin mi?`)) {
                              deleteMut.mutate(log.id);
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
