import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";
import { getToken } from "@/lib/auth";

const BASE = "/api/v1";

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

const CATS = ["okul", "iş", "sosyal", "dijital", "spor", "kişisel", "aile", "dinlenme"];
const CAT_COLORS: Record<string, string> = {
  okul: "#5B8CFF", iş: "#F59E0B", sosyal: "#F472B6", dijital: "#22D3EE",
  spor: "#A3E635", kişisel: "#8B5CF6", aile: "#F59E0B", dinlenme: "#8B5CF6",
};

export default function ActivityLogs() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => req<any[]>("/activity-logs"),
    retry: false,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => req(`/activity-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activity-logs"] }); setEditId(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => req(`/activity-logs/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity-logs"] }),
  });

  const filtered = filterCat === "all" ? logs : (logs as any[]).filter((l: any) => l.category?.name === filterCat);

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Aktivite geçmişi</span>
          <h1 className="topbar-title">Loglar.</h1>
          <span className="muted fs-13">{(logs as any[]).length} kayıt · agent ve check-in'den otomatik oluşturuldu</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="row gap-8" style={{ flexWrap: "wrap" }}>
        <button className={`chip ${filterCat === "all" ? "info" : ""}`} style={{ cursor: "pointer" }} onClick={() => setFilterCat("all")}>Tümü</button>
        {CATS.map(c => (
          <button key={c} className={`chip ${filterCat === c ? "info" : ""}`} style={{ cursor: "pointer", borderColor: filterCat === c ? `${CAT_COLORS[c]}55` : undefined }} onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>

      {isLoading && <div className="muted fs-13" style={{ textAlign: "center", padding: 40 }}>Yükleniyor...</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="edit" size={28} />
          <div className="display mt-12" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {filterCat === "all" ? "Henüz aktivite logu yok" : `${filterCat} kategorisinde log yok`}
          </div>
          <p className="muted fs-13" style={{ marginBottom: 20 }}>Check-in yaptıkça agent aktiviteleri otomatik kaydeder.</p>
          <button className="btn primary" style={{ margin: "0 auto" }} onClick={() => window.location.href = "/checkin"}>
            <Icon name="edit" size={14} />Check-in yap
          </button>
        </div>
      )}

      <div className="col gap-8">
        {(filtered as any[]).map((log: any) => {
          const color = CAT_COLORS[log.category?.name] ?? "var(--text-3)";
          const isEditing = editId === log.id;
          return (
            <div key={log.id} className="card tight">
              {!isEditing ? (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 50, background: color, boxShadow: `0 0 6px ${color}`, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row gap-8" style={{ flexWrap: "wrap", marginBottom: 4 }}>
                      <span className="fs-14" style={{ fontWeight: 600 }}>{log.title}</span>
                      {log.category && <span className="chip" style={{ fontSize: 9.5, borderColor: `${color}44`, background: `${color}10`, color }}>{log.category.name}</span>}
                      {log.durationMin && <span className="mono dim fs-11">{log.durationMin < 60 ? `${log.durationMin}dk` : `${Math.round(log.durationMin / 60 * 10) / 10}s`}</span>}
                    </div>
                    {log.description && <p className="muted fs-12" style={{ lineHeight: 1.4, marginBottom: 4 }}>{log.description}</p>}
                    <div className="mono dim fs-11">{format(new Date(log.createdAt), "d MMM yyyy · HH:mm")} · {log.source}</div>
                  </div>
                  <div className="row gap-6">
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4 }}
                      onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--primary)"; }}
                      onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}
                      onClick={() => { setEditId(log.id); setEditForm({ title: log.title, description: log.description ?? "", durationMin: log.durationMin ?? "" }); }}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4 }}
                      onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--danger)"; }}
                      onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--text-3)"; }}
                      onClick={() => deleteMut.mutate(log.id)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="col gap-8">
                  <input value={editForm.title} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }} />
                  <input value={editForm.description} placeholder="Açıklama (opsiyonel)"
                    onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }} />
                  <input type="number" value={editForm.durationMin} placeholder="Süre (dakika)"
                    onChange={e => setEditForm((f: any) => ({ ...f, durationMin: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none", maxWidth: 160 }} />
                  <div className="row gap-8">
                    <button className="btn primary sm" disabled={updateMut.isPending}
                      onClick={() => updateMut.mutate({ id: log.id, data: { title: editForm.title, description: editForm.description || undefined, durationMin: editForm.durationMin ? parseInt(editForm.durationMin) : undefined } })}>
                      Kaydet
                    </button>
                    <button className="btn ghost sm" onClick={() => setEditId(null)}>İptal</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
