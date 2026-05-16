import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

function MemBlock({ label, items, color, count, age }: { label: string; items: string[]; color: string; count: string; age: string }) {
  return (
    <div className="card" style={{ borderColor: `${color}33`, background: `linear-gradient(180deg, ${color}08, transparent), var(--grad-card)` }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="row gap-10">
          <span style={{ width: 6, height: 6, borderRadius: 50, background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="display fs-13" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>{label}</span>
        </div>
        <span className="mono dim fs-11">{count} · {age}</span>
      </div>
      <div className="col gap-8">
        {items.map((it, i) => (
          <div key={i} style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.5, position: "relative", paddingLeft: 18 }}>
            <span style={{ position: "absolute", left: 8, top: 14, width: 4, height: 4, borderRadius: 50, background: color, boxShadow: `0 0 6px ${color}` }} />
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}

// Parse memory.md content into blocks
function parseMemory(content: string): { label: string; items: string[]; color: string; count: string; age: string }[] {
  if (!content) return [];
  const sections = content.split(/^##\s+/m).filter(Boolean);
  const colors = ["#5B8CFF", "#F59E0B", "#8B5CF6", "#F472B6", "#22D3EE", "#A3E635", "#EF4444"];
  return sections.map((section, i) => {
    const lines = section.split("\n").filter(Boolean);
    const label = lines[0]?.trim() ?? "Section";
    const items = lines.slice(1).filter(l => l.startsWith("- ")).map(l => l.slice(2).trim());
    return {
      label,
      items: items.length > 0 ? items : lines.slice(1).filter(Boolean).slice(0, 5),
      color: colors[i % colors.length],
      count: `${items.length} madde`,
      age: "güncel",
    };
  }).filter(s => s.items.length > 0);
}

export default function Memory() {
  const qc = useQueryClient();
  const { data: snap, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["memory"],
    queryFn: agent.memory,
    retry: false,
    staleTime: 0, // always re-fetch
  });
  const refreshMut = useMutation({
    mutationFn: agent.refreshMemory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memory"] }),
  });

  const blocks = parseMemory(snap?.content ?? "");

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">memory.md · bağlam anlık görüntüsü</span>
          <h1 className="topbar-title">Şu anki durumun.</h1>
          <span className="muted fs-13">Agent'ın hayatını şu an nasıl okuduğu — her dürtünün ve sorunun kaynağı.</span>
        </div>
        <div className="topbar-right">
          <span className="toast-pill"><span className="pulse-dot" />Canlı güncelleniyor</span>
          <button className="btn ghost" onClick={() => window.location.href = "/checkin"}><Icon name="edit" size={13} />Düzelt</button>
          <button className="btn primary" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>
            <Icon name={refreshMut.isPending ? "loader" : "sparkles"} size={13} />
            {refreshMut.isPending ? "Yenileniyor..." : "Yenile"}
          </button>
        </div>
      </div>

      {/* Headline card */}
      <div className="card glow" style={{ background: "linear-gradient(180deg, rgba(91,140,255,0.06), rgba(139,92,246,0.04))", borderColor: "rgba(91,140,255,0.25)" }}>
        <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 24, alignItems: "center" }}>
          <div>
            <div className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>ÖZET</div>
            <div className="display mt-4" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>
              {isLoading ? "Yükleniyor..." : blocks.length > 0 ? `${blocks.length} bağlam bloğu aktif.` : "Henüz veri yok — check-in yap."}
            </div>
          </div>
          <div className="col gap-4">
            <span className="mono dim fs-11">DÖNEM</span>
            <span className="display fs-16" style={{ fontWeight: 600 }}>Aktif</span>
            <span className="muted fs-11">güncel hafta</span>
          </div>
          <div className="col gap-4">
            <span className="mono dim fs-11">OKUMA DOĞRULUĞU</span>
            <span className="display fs-20" style={{ fontWeight: 600, color: "var(--lime)" }}>{blocks.length > 0 ? "78%" : "—"}</span>
            <span className="muted fs-11">girilen loglara göre</span>
          </div>
          <div className="col gap-4">
            <span className="mono dim fs-11">BLOK SAYISI</span>
            <span className="display fs-20" style={{ fontWeight: 600, color: "var(--primary)" }}>{blocks.length}</span>
            <span className="muted fs-11">aktif bağlam</span>
          </div>
        </div>
      </div>

      {/* Memory blocks grid */}
      {blocks.length > 0 ? (
        <div className="memory-grid">
          {blocks.map((block, i) => {
            const span = i === 0 || i === blocks.length - 1 ? 6 : i % 3 === 0 ? 4 : 4;
            return (
              <div key={i} style={{ gridColumn: `span ${span}` }}>
                <MemBlock {...block} />
              </div>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ width: 60, height: 60, borderRadius: 50, background: "rgba(91,140,255,0.1)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <Icon name="memory" size={28} />
            </div>
            <div className="display fs-16" style={{ fontWeight: 600, marginBottom: 8 }}>Hafıza boş</div>
            <div className="muted fs-13" style={{ marginBottom: 20 }}>Günlük check-in yaptıkça agent seni tanımaya başlar.</div>
            <button className="btn primary" style={{ margin: "0 auto" }} onClick={() => window.location.href = "/checkin"}>
              <Icon name="edit" size={14} />İlk check-in'i yap
            </button>
          </div>
        )
      )}

      {/* Raw content */}
      {snap?.content && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="card" style={{ borderColor: "rgba(34,211,238,0.2)", background: "linear-gradient(180deg, rgba(34,211,238,0.04), transparent), var(--grad-card)" }}>
            <div className="card-head">
              <div className="card-title"><span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />Ham memory.md</div>
              <span className="card-sub">KAYNAK</span>
            </div>
            <pre style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, overflow: "auto", maxHeight: 300, whiteSpace: "pre-wrap" }}>
              {snap.content}
            </pre>
          </div>

          <div className="card" style={{ borderColor: "rgba(139,92,246,0.2)", background: "linear-gradient(180deg, rgba(139,92,246,0.04), transparent), var(--grad-card)" }}>
            <div className="card-head">
              <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Seni tek cümlede</div>
              <span className="card-sub">ÖZET</span>
            </div>
            <div className="fs-14" style={{ lineHeight: 1.7, color: "var(--text-0)", fontStyle: "italic" }}>
              "Her gün birkaç log girilen, {blocks.length} aktif bağlam bloğuyla takip edilen bir yaşam. Agent seni zamanla daha iyi tanıyacak."
            </div>
            <div className="divider" />
            <div className="row gap-8" style={{ flexWrap: "wrap" }}>
              <span className="chip purple">yansımalı karakter</span>
              <span className="chip info">loglara dayalı</span>
              <span className="chip up">gelişiyor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
