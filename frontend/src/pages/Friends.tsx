import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { friends } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spark } from "@/components/ui/Spark";
import { format } from "date-fns";

const COLORS = ["#F472B6", "#8B5CF6", "#22D3EE", "#5B8CFF", "#F59E0B", "#A3E635"];
const PALETTES = [
  ["#F472B6", "#8B5CF6", "#5B8CFF"],
  ["#8B5CF6", "#5B8CFF", "#22D3EE"],
  ["#22D3EE", "#5B8CFF"],
  ["#5B8CFF", "#22D3EE", "#A3E635"],
  ["#F59E0B", "#F472B6"],
  ["#A3E635", "#22D3EE"],
];

function PolaroidBg({ palette }: { palette: string[] }) {
  return (
    <div className="friend-pol" style={{
      background: `
        radial-gradient(circle at 30% 30%, ${palette[0]}55, transparent 50%),
        radial-gradient(circle at 70% 70%, ${palette[1] || palette[0]}44, transparent 55%),
        ${palette[2] ? `radial-gradient(circle at 50% 90%, ${palette[2]}33, transparent 60%),` : ""}
        linear-gradient(135deg, #14193a, #0a0e22)
      `
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "100% 12px", mixBlendMode: "overlay" as any, opacity: 0.4 }} />
      <div style={{ position: "absolute", bottom: 10, left: 12, fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.14em" }}>· · ·</div>
    </div>
  );
}

// Constellation visualization
function Constellation({ friendList, onSelect }: { friendList: any[]; onSelect: (i: number) => void }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }} className="between">
        <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />İlişki takımyıldızı</div>
        <span className="card-sub">TÜM ZAMANLAR</span>
      </div>
      <div className="constellation">
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5B8CFF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <circle cx="50%" cy="50%" r="22" fill="rgba(91,140,255,0.18)" stroke="#5B8CFF" strokeWidth="1.5" />
          <text x="50%" y="50%" textAnchor="middle" dy="4" fill="#fff" style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600 }}>Sen</text>
          {friendList.map((f: any, i: number) => {
            const angle = (i / friendList.length) * Math.PI * 2 - Math.PI / 2;
            const warmth = f.memories?.length ? Math.min(90, 40 + f.memories.length * 10) : 50;
            const dist = 110 + (100 - warmth);
            return (
              <line key={i}
                x1="50%" y1="50%"
                x2={`calc(50% + ${Math.cos(angle) * dist}px)`}
                y2={`calc(50% + ${Math.sin(angle) * dist}px)`}
                stroke="url(#line)" strokeWidth={Math.max(1, warmth / 25)} opacity="0.5"
              />
            );
          })}
        </svg>
        {friendList.map((f: any, i: number) => {
          const angle = (i / friendList.length) * Math.PI * 2 - Math.PI / 2;
          const warmth = f.memories?.length ? Math.min(90, 40 + f._count?.memories * 10) : 50;
          const dist = 110 + (100 - warmth);
          const color = COLORS[i % COLORS.length];
          return (
            <div key={i} style={{
              position: "absolute",
              left: `calc(50% + ${Math.cos(angle) * dist}px)`,
              top: `calc(50% + ${Math.sin(angle) * dist}px)`,
              transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer"
            }} onClick={() => onSelect(i)}>
              <div style={{
                width: 36, height: 36, borderRadius: 50,
                background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color}55 60%, ${color}22 100%)`,
                boxShadow: `0 0 18px ${color}66, inset 0 1px 0 rgba(255,255,255,0.2)`,
                display: "grid", placeItems: "center",
                fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "white"
              }}>
                {f.name.split(" ").map((p: string) => p[0]).join("")}
              </div>
              <span className="mono fs-11" style={{ color: "var(--text-1)" }}>{f.name.split(" ")[0]}</span>
            </div>
          );
        })}
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="star" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: 2 + Math.random() * 3, height: 2 + Math.random() * 3,
            animationDelay: `${Math.random() * 3}s`, opacity: 0.4
          }} />
        ))}
      </div>
    </div>
  );
}

// Friend detail panel
function FriendDetail({ friend, onClose, idx }: { friend: any; idx: number; onClose: () => void }) {
  const { data: memories = [] } = useQuery({
    queryKey: ["friends", friend.id, "memories"],
    queryFn: () => friends.memories(friend.id),
  });
  const qc = useQueryClient();
  const [memContent, setMemContent] = useState("");
  const addMemMut = useMutation({
    mutationFn: (content: string) => friends.addMemory(friend.id, { content, date: new Date().toISOString(), tags: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friends", friend.id, "memories"] }); setMemContent(""); },
  });
  const color = COLORS[idx % COLORS.length];
  const palette = PALETTES[idx % PALETTES.length];

  return (
    <div className="detail-panel open">
      <div className="between">
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={15} /></button>
        <span className="card-sub">İLİŞKİ DETAYI</span>
      </div>
      <div className="mt-20 col gap-16">
        <PolaroidBg palette={palette} />
        <div>
          <h2 className="display" style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>{friend.name}</h2>
          <span className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>{(friend.relationshipType ?? "ARKADAŞ").toUpperCase()}</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div className="mono dim fs-11">SON GÖRÜŞME</div>
            <div className="num fs-14">{friend.lastContactAt ? format(new Date(friend.lastContactAt), "d MMM") : "—"}</div>
          </div>
          <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div className="mono dim fs-11">ANI SAYISI</div>
            <div className="num fs-24">{(memories as any[]).length}</div>
          </div>
        </div>
        {friend.description && (
          <div className="fs-13 muted" style={{ lineHeight: 1.55, fontStyle: "italic" }}>"{friend.description}"</div>
        )}
        <div>
          <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 8 }}>ANLAR & NOTLAR</div>
          <div className="col gap-8" style={{ maxHeight: 200, overflow: "auto" }}>
            {(memories as any[]).length === 0 && <span className="muted fs-12">Henüz anı eklenmedi</span>}
            {(memories as any[]).map((m: any, i: number) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-1)" }}>
                {m.content}
                <div className="mono dim" style={{ fontSize: 10, marginTop: 4 }}>{format(new Date(m.date), "d MMM yyyy")}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <textarea
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, resize: "none", minHeight: 60, outline: "none" }}
            placeholder="Yeni bir anı ekle..."
            value={memContent}
            onChange={e => setMemContent(e.target.value)}
          />
          <button className="btn primary" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
            onClick={() => memContent.trim() && addMemMut.mutate(memContent)}
            disabled={!memContent.trim() || addMemMut.isPending}>
            <Icon name="plus" size={13} />Anı Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Friends() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", relationshipType: "", description: "" });

  const { data: friendList = [] } = useQuery({ queryKey: ["friends"], queryFn: friends.list });

  const createMut = useMutation({
    mutationFn: (data: any) => friends.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friends"] }); setShowForm(false); setForm({ name: "", relationshipType: "", description: "" }); },
  });

  const list = friendList as any[];

  return (
    <div className="col gap-20" style={{ position: "relative", minHeight: "100%" }}>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Sosyal hafıza · {list.length} kişi aktif çevrede</span>
          <h1 className="topbar-title">Arkadaşlar.</h1>
          <span className="muted fs-13">Bir iletişim listesi değil — haftalarındakinin canlı galerisi.</span>
        </div>
        <div className="topbar-right">
          <div className="searchbar"><Icon name="search" size={14} /><span>Kişi, anı, yer ara…</span></div>
          <button className="btn primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} />Kişi Ekle</button>
        </div>
      </div>

      {list.length >= 3 && <Constellation friendList={list} onSelect={setOpen} />}

      {showForm && (
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="card-title-dot" />Yeni Kişi</div>
            <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="col gap-6">
              <label className="mono dim fs-11">İSİM *</label>
              <input style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ad Soyad" />
            </div>
            <div className="col gap-6">
              <label className="mono dim fs-11">İLİŞKİ TİPİ</label>
              <input style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                value={form.relationshipType} onChange={e => setForm(f => ({ ...f, relationshipType: e.target.value }))} placeholder="yakın arkadaş, sınıf arkadaşı..." />
            </div>
          </div>
          <div className="col gap-6 mt-12">
            <label className="mono dim fs-11">TANIM</label>
            <input style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Bu kişi kim, nasıl tanıştınız?" />
          </div>
          <div className="row gap-8 mt-16">
            <button className="btn primary" disabled={!form.name || createMut.isPending} onClick={() => createMut.mutate(form)}>Kaydet</button>
            <button className="btn ghost" onClick={() => setShowForm(false)}>İptal</button>
          </div>
        </div>
      )}

      <div>
        <div className="between" style={{ marginBottom: 14 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>İlişki kartları</h3>
          <div className="row gap-8">
            <span className="chip">{list.length} kişi</span>
          </div>
        </div>
        {list.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div className="muted fs-13" style={{ marginBottom: 16 }}>Henüz kimse eklenmedi.</div>
            <button className="btn primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} />İlk kişiyi ekle</button>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {list.map((f: any, i: number) => {
              const color = COLORS[i % COLORS.length];
              const palette = PALETTES[i % PALETTES.length];
              return (
                <div key={f.id} className="friend-card" onClick={() => setOpen(i)}>
                  <div className="friend-inner">
                    <PolaroidBg palette={palette} />
                    <div className="between">
                      <div>
                        <div className="display fs-16" style={{ fontWeight: 600 }}>{f.name}</div>
                        <div className="mono dim fs-11" style={{ letterSpacing: "0.12em" }}>{(f.relationshipType ?? "ARKADAŞ").toUpperCase()}</div>
                      </div>
                      <div className="col" style={{ alignItems: "flex-end" }}>
                        <span className="num fs-13" style={{ color }}>{f._count?.memories ?? 0}</span>
                        <span className="mono dim fs-11">anı</span>
                      </div>
                    </div>
                    <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                      {f.lastContactAt && <span className="chip">{format(new Date(f.lastContactAt), "d MMM")}</span>}
                      <span className="chip info">{f._count?.memories ?? 0} anı</span>
                    </div>
                    {f.description && (
                      <div className="fs-12 muted" style={{ lineHeight: 1.5, minHeight: 36 }}>"{f.description}"</div>
                    )}
                    <Spark data={[2, 3, 2, 4, 3, 5, 4]} color={color} height={26} />
                    <div className="row gap-8" style={{ padding: "8px 10px", borderRadius: 8, background: `${color}10`, border: `1px solid ${color}30`, color: "var(--text-1)", fontSize: 11.5, lineHeight: 1.4 }}>
                      <Icon name="sparkles" size={12} />
                      <span>{f.proximityLabel ?? "Aktif çevrede"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open !== null && list[open] && (
        <FriendDetail friend={list[open]} idx={open} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
