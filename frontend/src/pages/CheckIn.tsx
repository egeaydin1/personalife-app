import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkins } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";

type Extract = { kind: string; value: string; conf: number; icon: string; color: string; };

export default function CheckIn() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const { data: today, isLoading } = useQuery({ queryKey: ["checkin", "today"], queryFn: () => checkins.today() });

  const sendMutation = useMutation({
    mutationFn: (message: string) => checkins.sendMessage(message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin", "today"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const messages: any[] = today?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMutation.isPending]);

  // Simulate live extraction preview while typing
  useEffect(() => {
    if (!draft.trim()) { setExtracts([]); return; }
    const timer = setTimeout(() => {
      const res: Extract[] = [];
      if (/mia|theo|arda|sena|lina/i.test(draft)) res.push({ kind: "KİŞİ", value: draft.match(/mia|theo|arda|sena|lina/i)?.[0] ?? "", conf: 94, icon: "users", color: "#F472B6" });
      if (/öğle|kahvaltı|akşam yemeği|yemek/i.test(draft)) res.push({ kind: "AKTİVİTE", value: "Yemek", conf: 88, icon: "heart", color: "#A3E635" });
      if (/saat|sabah|öğleden sonra|akşam|\d+h|\d+ saat/i.test(draft)) res.push({ kind: "SÜRE", value: "Süre tespit edildi", conf: 72, icon: "clock", color: "#22D3EE" });
      if (/yorgun|mutlu|iyi|kötü|stres/i.test(draft)) res.push({ kind: "RUH HALİ", value: draft.match(/yorgun|mutlu|iyi|kötü|stres/i)?.[0] ?? "", conf: 68, icon: "sparkles", color: "#F59E0B" });
      if (/ders|sınav|ödev|proje/i.test(draft)) res.push({ kind: "OKUL", value: "Okul aktivitesi", conf: 91, icon: "school", color: "#5B8CFF" });
      setExtracts(res);
    }, 500);
    return () => clearTimeout(timer);
  }, [draft]);

  function handleSend() {
    const msg = draft.trim();
    if (!msg || sendMutation.isPending) return;
    setDraft("");
    setExtracts([]);
    sendMutation.mutate(msg);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const activityCount = today?.activityLogs?.length ?? 0;
  const peopleSet = new Set<string>();
  messages.forEach((m: any) => {
    const matches = m.content?.match(/mia|theo|arda|sena|lina|burak/gi) ?? [];
    matches.forEach((p: string) => peopleSet.add(p));
  });

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Günlük yansıma · oturum {messages.filter((m: any) => m.role === "USER").length + 1}</span>
          <h1 className="topbar-title">Günün hakkında anlat.</h1>
          <span className="muted fs-13">Yazıyorsun — agent yapılandırır, hafızana işler.</span>
        </div>
        <div className="topbar-right">
          <span className="toast-pill"><span className="pulse-dot" />Agent dinliyor</span>
          <button className="btn ghost sm"><Icon name="clock" size={12} />Geçmiş</button>
        </div>
      </div>

      {isLoading ? (
        <div className="muted fs-13" style={{ textAlign: "center", padding: 40 }}>Yükleniyor...</div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          {/* LEFT: chat + composer */}
          <div className="col gap-16">
            <div className="card" style={{ minHeight: 360 }}>
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" />Konuşma</div>
                <span className="card-sub">{format(new Date(), "EEEE · HH:mm")}</span>
              </div>
              <div className="col gap-4">
                {messages.length === 0 && (
                  <div className="chat-msg agent">
                    <div className="chat-avatar" />
                    <div style={{ flex: 1 }}>
                      <div className="chat-text">Merhaba! Bugün nasıl geçti? Neler yaptığını anlat — uzun da yazabilirsin, parçalı da. Ben yapılandırırım.</div>
                      <div className="chat-meta">agent · {format(new Date(), "HH:mm")}</div>
                    </div>
                  </div>
                )}
                {messages.map((m: any, i: number) => (
                  <div key={i} className={`chat-msg ${m.role === "USER" ? "user" : "agent"}`} style={{ animationDelay: `${i * 60}ms` }}>
                    <div className={`chat-avatar ${m.role === "USER" ? "user" : ""}`} />
                    <div style={{ flex: 1 }}>
                      <div className="chat-text">{m.content}</div>
                      <div className="chat-meta">{m.role === "USER" ? "sen" : "agent"} · {format(new Date(m.createdAt), "HH:mm")}</div>
                    </div>
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="chat-msg agent">
                    <div className="chat-avatar" />
                    <div style={{ flex: 1 }}>
                      <div className="chat-text" style={{ color: "var(--text-3)", fontStyle: "italic" }}>Yazıyor...</div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="composer">
              <textarea
                ref={textRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Bugün neler yaptın? Uzun yaz, kısa yaz, karışık olsun — agent anlasın."
                rows={3}
              />
              <div className="composer-row">
                <button className="composer-chip" onClick={() => setDraft(d => d + " okul ")}>+ Okul</button>
                <button className="composer-chip" onClick={() => setDraft(d => d + " arkadaşlar ")}>+ Arkadaşlar</button>
                <button className="composer-chip" onClick={() => setDraft(d => d + " ekran süresi ")}>+ Ekran</button>
                <button className="composer-chip" onClick={() => setDraft(d => d + " spor ")}>+ Spor</button>
                <div style={{ marginLeft: "auto" }} className="row gap-8">
                  <button className="icon-btn"><Icon name="mic" size={15} /></button>
                  <button className="btn primary" onClick={handleSend} disabled={!draft.trim() || sendMutation.isPending}>
                    <Icon name="send" size={13} />Gönder
                  </button>
                </div>
              </div>
            </div>

            {/* Screen time upload */}
            <div className="card" style={{ borderStyle: "dashed", background: "transparent" }}>
              <div className="between">
                <div className="row gap-10">
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(34,211,238,0.12)", color: "var(--cyan)", display: "grid", placeItems: "center", border: "1px solid rgba(34,211,238,0.3)" }}>
                    <Icon name="image" />
                  </div>
                  <div>
                    <div className="fs-13" style={{ fontWeight: 500 }}>Ekran Süresi ekran görüntüsü bırak</div>
                    <div className="muted fs-11">Uygulamaları ve süreleri çıkarırım — bugüne otomatik eklenir.</div>
                  </div>
                </div>
                <button className="btn ghost sm" onClick={() => window.location.href = "/screen-time"}>Yükle</button>
              </div>
            </div>
          </div>

          {/* RIGHT: parse panel + stats */}
          <div className="col gap-16">
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <span className="card-title-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />
                  Taslak analizi · canlı
                </div>
                <span className="toast-pill"><span className="pulse-dot" />{extracts.length} sinyal</span>
              </div>
              <div>
                {extracts.map((x, i) => (
                  <div key={i} className="extract-row" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="extract-icon" style={{ background: `${x.color}1A`, color: x.color }}>
                      <Icon name={x.icon} size={15} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>{x.kind}</div>
                      <div className="fs-13" style={{ fontWeight: 500 }}>{x.value}</div>
                    </div>
                    <span className="mono dim fs-11">{x.conf}%</span>
                  </div>
                ))}
                {extracts.length === 0 && (
                  <div className="muted fs-12" style={{ padding: 12, fontStyle: "italic" }}>
                    Yazmaya başla — aktiviteleri, kişileri ve zamanı gerçek zamanlı yapılandıracağım.
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Bugün, şimdiye kadar</div>
              </div>
              <div className="col gap-12">
                <div className="row gap-10">
                  <div className="num fs-32" style={{ color: "var(--primary)" }}>{activityCount}</div>
                  <div className="col">
                    <span className="fs-13" style={{ fontWeight: 500 }}>Kaydedilen aktivite</span>
                    <span className="muted fs-11">{activityCount === 0 ? "Henüz log girilmedi" : "agent tarafından çıkarıldı"}</span>
                  </div>
                </div>
                <div className="divider" />
                <div className="row gap-10">
                  <div className="num fs-32" style={{ color: "var(--pink)" }}>{peopleSet.size}</div>
                  <div className="col">
                    <span className="fs-13" style={{ fontWeight: 500 }}>Bahsedilen kişi</span>
                    <span className="muted fs-11">{peopleSet.size > 0 ? Array.from(peopleSet).join(", ") : "Henüz kişi belirtilmedi"}</span>
                  </div>
                </div>
                <div className="divider" />
                <div className="row gap-10">
                  <div className="num fs-32" style={{ color: "var(--lime)" }}>{messages.filter((m: any) => m.role === "USER").length}</div>
                  <div className="col">
                    <span className="fs-13" style={{ fontWeight: 500 }}>Mesaj gönderildi</span>
                    <span className="muted fs-11">bu oturumda</span>
                  </div>
                </div>
              </div>
            </div>

            {today?.checkin?.mood && (
              <div className="card" style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.06), rgba(244,114,182,0.04))", borderColor: "rgba(245,158,11,0.2)" }}>
                <div className="card-head">
                  <div className="card-title"><span className="card-title-dot" style={{ background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />Ruh hali</div>
                </div>
                <div className="row gap-8">
                  {[1, 2, 3, 4, 5].map(v => (
                    <div key={v} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: v <= today.checkin.mood ? "rgba(245,158,11,0.2)" : "var(--surface)", border: `1px solid ${v <= today.checkin.mood ? "rgba(245,158,11,0.4)" : "var(--border)"}`, fontSize: 16 }}>
                      {["😔", "😕", "😐", "🙂", "😊"][v - 1]}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
