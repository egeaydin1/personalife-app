import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { screenTime } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";

export default function ScreenTime() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploading, setUploading] = useState(false);

  const { data: uploads = [] } = useQuery({
    queryKey: ["screen-time"],
    queryFn: () => screenTime.list(),
    refetchInterval: (query) => {
      const data = query.state.data as any[];
      return data?.some((u: any) => u.status === "PENDING" || u.status === "PROCESSING") ? 3000 : false;
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => screenTime.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screen-time"] }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await screenTime.upload(file, date);
      qc.invalidateQueries({ queryKey: ["screen-time"] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const allEntries = (uploads as any[]).flatMap((u: any) => u.entries ?? []);
  const byApp = allEntries.reduce((acc: Record<string, number>, e: any) => {
    acc[e.appName] = (acc[e.appName] ?? 0) + e.durationMin;
    return acc;
  }, {});
  const sorted = Object.entries(byApp).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxMin = sorted[0]?.[1] ?? 1;
  const COLORS = ["#5B8CFF", "#22D3EE", "#F472B6", "#A3E635", "#8B5CF6", "#F59E0B", "#EF4444", "#5B8CFF", "#22D3EE", "#F472B6"];

  function fmtDuration(min: number) {
    if (min < 60) return `${min}dk`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}s ${m}dk` : `${h}s`;
  }

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Dijital davranış analizi</span>
          <h1 className="topbar-title">Ekran Süresi.</h1>
          <span className="muted fs-13">Ekran görüntüsü at — uygulamaları ve süreleri çıkararım.</span>
        </div>
        <div className="topbar-right">
          <span className="toast-pill"><span className="pulse-dot" />{(uploads as any[]).length} yükleme</span>
        </div>
      </div>

      {/* Upload card */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />Ekran Görüntüsü Yükle</div>
        </div>
        <div className="row gap-16" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="mono dim fs-11">TARİH</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-mono)", fontSize: 12, outline: "none", width: 160 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, borderRadius: 14, border: "2px dashed var(--border)", padding: 32, cursor: "pointer", transition: "border-color 160ms, background 160ms" }}
              onMouseEnter={e => { (e.currentTarget as any).style.borderColor = "rgba(34,211,238,0.4)"; (e.currentTarget as any).style.background = "rgba(34,211,238,0.04)"; }}
              onMouseLeave={e => { (e.currentTarget as any).style.borderColor = "var(--border)"; (e.currentTarget as any).style.background = "transparent"; }}
              onClick={() => fileRef.current?.click()}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(34,211,238,0.12)", display: "grid", placeItems: "center", color: "var(--cyan)" }}>
                {uploading ? <Icon name="loader" size={24} /> : <Icon name="upload" size={24} />}
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="fs-14" style={{ fontWeight: 500, color: "var(--text-0)" }}>{uploading ? "Yükleniyor..." : "Ekran görüntüsünü buraya tıkla"}</div>
                <div className="muted fs-12">PNG, JPG · maks 10 MB · OCR otomatik çalışır</div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
          </div>
        </div>
      </div>

      {/* App breakdown */}
      {sorted.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Uygulama kullanımı</div>
            <span className="card-sub">TOPLAM</span>
          </div>
          <div className="col gap-12">
            {sorted.map(([app, min], i) => {
              const color = COLORS[i % COLORS.length];
              const pct = (min / maxMin) * 100;
              return (
                <div key={app}>
                  <div className="between" style={{ marginBottom: 5 }}>
                    <div className="row gap-8">
                      <span style={{ width: 8, height: 8, borderRadius: 50, background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span className="fs-13" style={{ fontWeight: 500 }}>{app}</span>
                    </div>
                    <span className="mono fs-12" style={{ color }}>{fmtDuration(min)}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 50, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, borderRadius: 50, boxShadow: `0 0 8px ${color}66`, transition: "width 600ms cubic-bezier(.2,.8,.2,1)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload history */}
      <div>
        <h3 className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Yükleme geçmişi</h3>
        {(uploads as any[]).length === 0 && <p className="muted fs-12" style={{ fontStyle: "italic" }}>Henüz yükleme yapılmadı.</p>}
        <div className="col gap-8">
          {(uploads as any[]).map((u: any) => (
            <div key={u.id} className="card tight">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: u.status === "DONE" ? "rgba(34,197,94,0.12)" : u.status === "FAILED" ? "rgba(239,68,68,0.12)" : "rgba(91,140,255,0.12)", display: "grid", placeItems: "center", color: u.status === "DONE" ? "var(--success)" : u.status === "FAILED" ? "var(--danger)" : "var(--primary)", flexShrink: 0 }}>
                  <Icon name={u.status === "DONE" ? "check-circle" : u.status === "FAILED" ? "alert-circle" : "loader"} size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fs-13" style={{ fontWeight: 500 }}>{u.filename}</div>
                  <div className="mono dim fs-11">
                    {format(new Date(u.date), "d MMMM yyyy")} · {u.entries?.length ?? 0} uygulama · {u.status === "DONE" ? "işlendi" : u.status === "FAILED" ? "hata" : "işleniyor..."}
                  </div>
                </div>
                {u.entries?.length > 0 && (
                  <div className="row gap-6" style={{ flexWrap: "wrap", maxWidth: 200 }}>
                    {u.entries.slice(0, 3).map((e: any) => (
                      <span key={e.id} className="chip" style={{ fontSize: 9.5 }}>{e.appName}</span>
                    ))}
                    {u.entries.length > 3 && <span className="chip info" style={{ fontSize: 9.5 }}>+{u.entries.length - 3}</span>}
                  </div>
                )}
                <button onClick={() => deleteMut.mutate(u.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", flexShrink: 0 }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
