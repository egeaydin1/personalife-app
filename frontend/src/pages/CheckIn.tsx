import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkins } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { format } from "date-fns";

type Extract = { kind: string; value: string; conf: number; icon: string; color: string };

const CAT_COLORS: Record<string, string> = {
  okul: "#5B8CFF", iş: "#F59E0B", sosyal: "#F472B6", dijital: "#22D3EE",
  spor: "#A3E635", kişisel: "#8B5CF6", aile: "#F59E0B", dinlenme: "#8B5CF6",
};
const CAT_ICONS: Record<string, string> = {
  okul: "school", iş: "zap", sosyal: "users", dijital: "phone",
  spor: "heart", kişisel: "sparkles", aile: "users", dinlenme: "moon",
};

function fmtDuration(min: number) {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}s ${m}dk` : `${h}s`;
}

// ── Activity log card (rendered instead of raw TOOL JSON) ──────
function ActivityLogCard({ data }: { data: any }) {
  const cat = data.category?.name ?? "aktivite";
  const color = CAT_COLORS[cat] ?? "#5b6390";
  const icon = CAT_ICONS[cat] ?? "sparkles";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 10,
      background: `${color}0F`, border: `1px solid ${color}30`,
      margin: "4px 0",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: `${color}20`, color, display: "grid", placeItems: "center",
        border: `1px solid ${color}33`, flexShrink: 0,
      }}>
        <Icon name={icon} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fs-12" style={{ fontWeight: 600, color: "var(--text-0)" }}>{data.title}</div>
        {data.durationMin && (
          <div className="mono dim fs-11">{fmtDuration(data.durationMin)}</div>
        )}
      </div>
      <span className="mono" style={{ fontSize: 10, color, letterSpacing: "0.08em" }}>{cat}</span>
      <div style={{ color: "var(--success)", fontSize: 13 }}>✓</div>
    </div>
  );
}

// ── Group consecutive TOOL messages after ASSISTANT ────────────
function groupMessages(messages: any[]) {
  const result: { type: "chat"; msg: any } | { type: "tool-group"; activities: any[] }[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "TOOL") {
      // Try to parse as activity log
      try {
        const data = JSON.parse(m.content);
        if (data.id && data.title && data.source === "checkin") {
          // Collect consecutive TOOL messages
          const activities: any[] = [data];
          while (i + 1 < messages.length && messages[i + 1].role === "TOOL") {
            i++;
            try {
              const next = JSON.parse(messages[i].content);
              if (next.id && next.title) activities.push(next);
            } catch { /* skip */ }
          }
          result.push({ type: "tool-group", activities });
          i++;
          continue;
        }
      } catch { /* not JSON, skip */ }
      i++;
      continue; // Skip non-parseable TOOL messages and error JSON
    }
    if (m.role === "SYSTEM") { i++; continue; } // Skip system messages
    result.push({ type: "chat", msg: m });
    i++;
  }
  return result;
}

export default function CheckIn() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const { data: today, isLoading } = useQuery({
    queryKey: ["checkin", "today"],
    queryFn: () => checkins.today(),
    refetchInterval: false,
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => checkins.sendMessage(message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin", "today"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });

  const messages: any[] = today?.messages ?? [];
  const grouped = groupMessages(messages);

  // ── Auto-scroll to bottom whenever messages change ────────────
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Small delay to let DOM update
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [messages.length, sendMutation.isPending, scrollToBottom]);

  // Live extraction preview while typing
  useEffect(() => {
    if (!draft.trim()) { setExtracts([]); return; }
    const timer = setTimeout(() => {
      const res: Extract[] = [];
      if (/mia|theo|arda|sena|lina|anıl|ali|can|elif/i.test(draft))
        res.push({ kind: "KİŞİ", value: draft.match(/mia|theo|arda|sena|lina|anıl|ali|can|elif/i)?.[0] ?? "", conf: 94, icon: "users", color: "#F472B6" });
      if (/öğle|kahvaltı|akşam yemeği|yemek|kahve/i.test(draft))
        res.push({ kind: "AKTİVİTE", value: "Yemek / Kahve", conf: 88, icon: "heart", color: "#A3E635" });
      if (/saat|sabah|öğleden sonra|akşam|\d+s|\d+ saat|\d+\s*dk/i.test(draft))
        res.push({ kind: "SÜRE", value: "Süre tespit edildi", conf: 72, icon: "clock", color: "#22D3EE" });
      if (/yorgun|mutlu|iyi|kötü|stres|harika|güzel/i.test(draft))
        res.push({ kind: "RUH HALİ", value: draft.match(/yorgun|mutlu|iyi|kötü|stres|harika|güzel/i)?.[0] ?? "", conf: 68, icon: "sparkles", color: "#F59E0B" });
      if (/ders|sınav|ödev|proje|kütüphane|okul/i.test(draft))
        res.push({ kind: "OKUL", value: "Okul aktivitesi", conf: 91, icon: "school", color: "#5B8CFF" });
      if (/instagram|youtube|tiktok|twitter|reels|sosyal medya/i.test(draft))
        res.push({ kind: "DİJİTAL", value: draft.match(/instagram|youtube|tiktok|twitter|reels/i)?.[0] ?? "", conf: 89, icon: "phone", color: "#22D3EE" });
      if (/spor|koş|yüz|gym|antrenman|futbol/i.test(draft))
        res.push({ kind: "SPOR", value: "Spor aktivitesi", conf: 86, icon: "heart", color: "#A3E635" });
      setExtracts(res);
    }, 400);
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
  const sessionCount = messages.filter((m: any) => m.role === "USER").length;

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Günlük yansıma · oturum {sessionCount + 1}</span>
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
          {/* ── LEFT: Chat ────────────────────────────────────── */}
          <div className="col gap-16">
            {/* Chat card — fixed height + internal scroll */}
            <div className="card" style={{ display: "flex", flexDirection: "column", height: "min(520px, 55vh)", padding: 0, overflow: "hidden" }}>
              <div className="card-head" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <div className="card-title"><span className="card-title-dot" />Konuşma</div>
                <span className="card-sub">{format(new Date(), "EEEE · HH:mm")}</span>
              </div>

              {/* Scrollable message area */}
              <div
                ref={scrollAreaRef}
                style={{ flex: 1, overflowY: "auto", padding: "12px 16px", scrollBehavior: "smooth" }}
              >
                {/* Welcome message if no messages */}
                {grouped.length === 0 && (
                  <div className="chat-msg agent">
                    <div className="chat-avatar" />
                    <div style={{ flex: 1 }}>
                      <div className="chat-text">Merhaba! Bugün nasıl geçti? Neler yaptığını anlat — uzun da yazabilirsin, parçalı da. Ben yapılandırırım.</div>
                      <div className="chat-meta">agent · {format(new Date(), "HH:mm")}</div>
                    </div>
                  </div>
                )}

                {/* Grouped messages */}
                {grouped.map((item, i) => {
                  if (item.type === "tool-group") {
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div className="mono dim fs-11" style={{ marginBottom: 6, letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="sparkles" size={11} />
                          {item.activities.length} AKTİVİTE KAYDEDİLDİ
                        </div>
                        {item.activities.map((act: any, j: number) => (
                          <ActivityLogCard key={j} data={act} />
                        ))}
                      </div>
                    );
                  }

                  const m = item.msg;
                  const isUser = m.role === "USER";
                  return (
                    <div key={i} className={`chat-msg ${isUser ? "user" : "agent"}`}
                      style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}>
                      <div className={`chat-avatar ${isUser ? "user" : ""}`} />
                      <div style={{ flex: 1 }}>
                        <div className="chat-text">{m.content}</div>
                        <div className="chat-meta">{isUser ? "sen" : "agent"} · {format(new Date(m.createdAt), "HH:mm")}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {sendMutation.isPending && (
                  <div className="chat-msg agent">
                    <div className="chat-avatar" />
                    <div style={{ flex: 1 }}>
                      <div className="chat-text" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {[0, 1, 2].map(j => (
                          <span key={j} style={{
                            width: 6, height: 6, borderRadius: 50, background: "var(--primary)",
                            animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
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

          {/* ── RIGHT: Live parse panel + stats ───────────────── */}
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
                  <div className="num fs-32" style={{ color: "var(--lime)" }}>{sessionCount}</div>
                  <div className="col">
                    <span className="fs-13" style={{ fontWeight: 500 }}>Mesaj gönderildi</span>
                    <span className="muted fs-11">bu oturumda</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick tips */}
            <div className="card" style={{ background: "linear-gradient(180deg,rgba(91,140,255,0.05),transparent)", borderColor: "rgba(91,140,255,0.2)" }}>
              <div className="card-head">
                <div className="card-title"><span className="card-title-dot" style={{ background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }} />İpuçları</div>
              </div>
              <div className="col gap-8">
                {[
                  "Kişi isimlerini yaz → arkadaş hafızana eklenir",
                  "Süre belirt (2 saat, 45dk) → daha doğru log",
                  "Ruh halini yaz → duygu analizi aktifleşir",
                ].map((tip, i) => (
                  <div key={i} className="row gap-8" style={{ fontSize: 12, color: "var(--text-2)" }}>
                    <Icon name="sparkles" size={12} />{tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
