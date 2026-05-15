import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { auth, integrations } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

// ── Telegram connect card ─────────────────────────────────────
function TelegramCard({ ints }: { ints: any[] }) {
  const qc = useQueryClient();
  const existing = ints.find(i => i.type === "TELEGRAM");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const startMut = useMutation({
    mutationFn: integrations.startTelegram,
    onSuccess: (data: any) => {
      if (data.deepLink) {
        setDeepLink(data.deepLink);
        setPolling(true);
      }
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => integrations.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["integrations"] }); setDeepLink(null); },
  });

  // Poll for connection
  useQuery({
    queryKey: ["integrations", "telegram-status"],
    queryFn: () => fetch("/api/v1/integrations/telegram/status", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? ""}` },
    }).then(r => r.json()),
    refetchInterval: polling ? 3000 : false,
    enabled: polling,
    select: (d: any) => d,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(undefined as any),
  });

  // When status becomes ACTIVE, stop polling and refresh
  useEffect(() => {
    if (!polling) return;
    const int = ints.find(i => i.type === "TELEGRAM");
    if (int?.status === "ACTIVE") {
      setPolling(false);
      setDeepLink(null);
    }
  }, [ints, polling]);

  const botInfo = useQuery({
    queryKey: ["telegram-bot-info"],
    queryFn: () => fetch("/api/v1/integrations/telegram/bot-info", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? ""}` },
    }).then(r => r.json()),
    staleTime: 60_000,
  });

  const available = (botInfo.data as any)?.available === true;
  const isConnected = existing?.status === "ACTIVE";
  const isPending = existing?.status === "PENDING" || polling;

  return (
    <div className="card tight" style={{
      background: isConnected ? "linear-gradient(180deg, rgba(34,211,238,0.06), transparent), var(--grad-card)" : "var(--grad-card)",
      borderColor: isConnected ? "rgba(34,211,238,0.35)" : "var(--border)",
    }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="row gap-10">
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(34,211,238,0.12)", color: "var(--cyan)", display: "grid", placeItems: "center", border: "1px solid rgba(34,211,238,0.3)" }}>
            <Icon name="send" size={16} />
          </div>
          <div>
            <div className="display fs-14" style={{ fontWeight: 600 }}>Telegram bot</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: isConnected ? "var(--cyan)" : "var(--text-3)" }}>
              {isConnected ? `BAĞLI · @${(existing.config as any)?.username ?? ""}` : isPending ? "BAĞLANMAYI BEKLIYOR..." : available ? "HAZIR" : "YAPILANDIRILMADI"}
            </div>
          </div>
        </div>
        {isConnected && (
          <span className="toast-pill" style={{ fontSize: 10 }}><span className="pulse-dot" />Aktif</span>
        )}
      </div>

      <p className="muted fs-12" style={{ lineHeight: 1.5, marginBottom: 14 }}>
        Sabah hatırlatmaları, günlük nudge'lar, takvim uyarıları. Telegram'dan direkt mesaj yazarak check-in yapabilirsin.
      </p>

      {!available && !isConnected && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "var(--amber)", lineHeight: 1.5 }}>
          Telegram kullanmak için <code>TELEGRAM_BOT_TOKEN</code> ortam değişkenini set etmen gerekiyor. Kurulum rehberi için: <code>INTEGRATIONS.md</code>
        </div>
      )}

      {!isConnected && available && !deepLink && (
        <button className="btn primary" style={{ width: "100%", justifyContent: "center" }}
          onClick={() => startMut.mutate()} disabled={startMut.isPending}>
          {startMut.isPending ? "Bağlantı oluşturuluyor..." : "Telegram bağla"}
        </button>
      )}

      {isPending && deepLink && (
        <div className="col gap-10">
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)" }}>
            <div className="fs-13" style={{ fontWeight: 500, marginBottom: 6 }}>1. Aşağıdaki butona tıkla, Telegram'da bota git</div>
            <div className="muted fs-12" style={{ lineHeight: 1.5 }}>2. <strong>START</strong> butonuna bas — bot "merhaba" diyecek</div>
            <div className="muted fs-12">3. Bu sayfaya dön — bağlantı otomatik algılanacak</div>
          </div>
          <a href={deepLink} target="_blank" rel="noreferrer" className="btn primary" style={{ textDecoration: "none", justifyContent: "center" }}>
            <Icon name="send" size={14} />Telegram'da aç
          </a>
          <div className="row gap-6" style={{ justifyContent: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: 50, background: "var(--cyan)", animation: "pulse 1.6s ease-in-out infinite" }} />
            <span className="mono dim fs-11">Bağlantı bekleniyor...</span>
          </div>
        </div>
      )}

      {isConnected && (
        <button className="btn ghost sm" style={{ width: "100%", justifyContent: "center", color: "var(--danger)" }}
          onClick={() => deleteMut.mutate(existing.id)}>
          <Icon name="x" size={13} />Bağlantıyı kaldır
        </button>
      )}
    </div>
  );
}

// ── Google Calendar card ─────────────────────────────────────
function GoogleCard({ ints }: { ints: any[] }) {
  const qc = useQueryClient();
  const existing = ints.find(i => i.type === "GOOGLE_CALENDAR");
  const isConnected = existing?.status === "ACTIVE";
  const hasError = existing?.status === "ERROR";
  const [searchParams] = useSearchParams();
  const googleConnected = searchParams.get("google_connected") === "1";
  const googleError = searchParams.get("google_error");

  const deleteMut = useMutation({
    mutationFn: (id: string) => integrations.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const syncMut = useMutation({
    mutationFn: () => fetch("/api/v1/integrations/google/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? ""}` },
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  async function connectGoogle() {
    const res = await fetch("/api/v1/integrations/google/start", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? ""}` },
    });
    const data = await res.json() as any;
    if (data.url) window.location.href = data.url;
    else if (data.error) alert(data.error);
  }

  const available = !!(import.meta.env.VITE_GOOGLE_AVAILABLE !== "false");

  return (
    <div className="card tight" style={{
      background: isConnected ? "linear-gradient(180deg, rgba(91,140,255,0.06), transparent), var(--grad-card)" : "var(--grad-card)",
      borderColor: isConnected ? "rgba(91,140,255,0.35)" : hasError ? "rgba(239,68,68,0.35)" : "var(--border)",
    }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="row gap-10">
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(91,140,255,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", border: "1px solid rgba(91,140,255,0.3)" }}>
            <Icon name="calendar" size={16} />
          </div>
          <div>
            <div className="display fs-14" style={{ fontWeight: 600 }}>Google Calendar</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: isConnected ? "var(--primary)" : hasError ? "var(--danger)" : "var(--text-3)" }}>
              {isConnected ? `BAĞLI · ${existing.externalId ?? ""}` : hasError ? "HATA — YENİDEN BAĞLAN" : "BAĞLI DEĞİL"}
            </div>
          </div>
        </div>
        {isConnected && (
          <span className="toast-pill" style={{ fontSize: 10, background: "rgba(91,140,255,0.1)", borderColor: "rgba(91,140,255,0.3)", color: "var(--primary)" }}>
            <span className="pulse-dot" style={{ background: "var(--primary)" }} />Sync aktif
          </span>
        )}
      </div>

      <p className="muted fs-12" style={{ lineHeight: 1.5, marginBottom: 14 }}>
        Google Calendar etkinlikleri otomatik sync edilir. Agent gelecek planlarını görebilir, çakışmaları fark eder.
      </p>

      {googleConnected && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12, color: "var(--success)", marginBottom: 12 }}>
          ✓ Google Calendar başarıyla bağlandı!
        </div>
      )}

      {googleError && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>
          Bağlantı hatası: {googleError}. Tekrar dene.
        </div>
      )}

      {isConnected && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-2)" }}>
          Son sync: {existing.lastSyncAt ? new Date(existing.lastSyncAt).toLocaleString("tr-TR") : "henüz yapılmadı"}
        </div>
      )}

      {!isConnected && (
        <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={connectGoogle}>
          <Icon name="calendar" size={14} />Google ile bağla
        </button>
      )}

      {isConnected && (
        <div className="row gap-8">
          <button className="btn ghost sm" style={{ flex: 1, justifyContent: "center" }}
            onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            <Icon name="loader" size={13} />{syncMut.isPending ? "Sync ediliyor..." : "Manuel sync"}
          </button>
          <button className="btn ghost sm" style={{ flex: 1, justifyContent: "center", color: "var(--danger)" }}
            onClick={() => deleteMut.mutate(existing.id)}>
            <Icon name="x" size={13} />Bağlantıyı kaldır
          </button>
        </div>
      )}
    </div>
  );
}

// ── iCal export card ─────────────────────────────────────────
function ICalCard({ icalToken }: { icalToken: string }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const icalUrl = icalToken ? `${window.location.origin}/api/v1/ical/${icalToken}` : "";

  const regenMut = useMutation({
    mutationFn: integrations.regenerateIcal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  function copy() {
    navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card tight" style={{ borderColor: "rgba(163,230,53,0.25)" }}>
      <div className="row gap-10" style={{ marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(163,230,53,0.12)", color: "var(--lime)", display: "grid", placeItems: "center", border: "1px solid rgba(163,230,53,0.3)" }}>
          <Icon name="calendar" size={16} />
        </div>
        <div>
          <div className="display fs-14" style={{ fontWeight: 600 }}>iCal export URL</div>
          <div className="mono dim" style={{ fontSize: 10, letterSpacing: "0.1em" }}>READ-ONLY · HER TAKVİME SYNC</div>
        </div>
      </div>
      <p className="muted fs-12" style={{ lineHeight: 1.5, marginBottom: 12 }}>
        Personalife derslerini ve etkinliklerini Apple Calendar, Google Calendar veya herhangi bir takvim uygulamasına bağlar. "Subscribe" veya "Abonelik ekle" ile kullan.
      </p>
      <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-2)", wordBreak: "break-all", lineHeight: 1.5, marginBottom: 10 }}>
        {icalUrl || "yükleniyor..."}
      </div>
      <div className="row gap-8">
        <button className="btn sm primary" onClick={copy} disabled={!icalUrl} style={{ flex: 1, justifyContent: "center" }}>
          <Icon name={copied ? "check" : "edit"} size={12} />
          {copied ? "Kopyalandı!" : "URL'yi kopyala"}
        </button>
        <button className="btn sm ghost" onClick={() => regenMut.mutate()} disabled={regenMut.isPending} title="Token'ı sıfırla — eski URL çalışmaz">
          <Icon name="loader" size={12} />Yenile
        </button>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────
export default function Settings() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const { data: intData } = useQuery({ queryKey: ["integrations"], queryFn: integrations.list, refetchInterval: 5000 });
  const [searchParams, setSearchParams] = useSearchParams();

  // Clear URL params after showing banners
  useEffect(() => {
    if (searchParams.get("google_connected") || searchParams.get("google_error")) {
      const t = setTimeout(() => setSearchParams({}), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);

  const ints = intData?.integrations ?? [];

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Ayarlar · profil & entegrasyonlar</span>
          <h1 className="topbar-title">Ayarlar.</h1>
          <span className="muted fs-13">Hesap bilgilerin, agent tercihlerin, dış servis bağlantıları.</span>
        </div>
        {me && !me.onboardingCompletedAt && (
          <div className="topbar-right">
            <button className="btn primary" onClick={() => window.location.href = "/onboarding"}>
              <Icon name="sparkles" size={13} />Kurulumu tamamla
            </button>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="card-title-dot" />Profil</div>
          <span className="card-sub">{me?.onboardingCompletedAt ? "✓ KURULUM TAMAM" : "EKSİK"}</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            ["İsim", me?.name ?? "—"],
            ["E-posta", me?.email ?? "—"],
            ["Yaş aralığı", me?.ageRange ?? "—"],
            ["Rol", me?.role ?? "—"],
            ["Şehir", me?.city ?? "—"],
            ["Saat dilimi", me?.timezone ?? "Europe/Istanbul"],
            ["Uyanma", me?.wakeTime ?? "—"],
            ["Uyuma", me?.sleepTime ?? "—"],
            ["Agent tonu", me?.agentTone ?? "casual"],
          ].map(([label, val]) => (
            <div key={label} style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div className="mono dim fs-11" style={{ letterSpacing: "0.12em", marginBottom: 4 }}>{String(label).toUpperCase()}</div>
              <div className="fs-13" style={{ fontWeight: 500 }}>{String(val)}</div>
            </div>
          ))}
        </div>
        {me?.focusAreas?.length > 0 && (
          <>
            <div className="divider" />
            <div className="mono dim fs-11" style={{ marginBottom: 8, letterSpacing: "0.14em" }}>ODAK ALANLARI</div>
            <div className="row gap-6" style={{ flexWrap: "wrap" }}>
              {me.focusAreas.map((a: string) => <span key={a} className="chip purple">{a}</span>)}
            </div>
          </>
        )}
        {me?.dailyRoutine && (
          <>
            <div className="divider" />
            <div className="mono dim fs-11" style={{ marginBottom: 6, letterSpacing: "0.14em" }}>TİPİK GÜN</div>
            <p className="muted fs-13" style={{ lineHeight: 1.55 }}>{me.dailyRoutine}</p>
          </>
        )}
        <div className="divider" />
        <button className="btn ghost sm" onClick={() => window.location.href = "/onboarding"}>
          <Icon name="edit" size={13} />Profili düzenle
        </button>
      </div>

      {/* Integrations */}
      <div>
        <div className="between" style={{ marginBottom: 14 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Entegrasyonlar</h3>
          <span className="card-sub">
            {ints.filter(i => i.status === "ACTIVE").length} AKTİF BAĞLANTI
          </span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <TelegramCard ints={ints} />
          <GoogleCard ints={ints} />
          <ICalCard icalToken={intData?.icalToken ?? ""} />
        </div>
      </div>

      {/* Agent preferences */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Agent Tercihleri</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            ["İletişim sıklığı", me?.agentContactPref === "silent" ? "Sessiz (istediğimde)" : me?.agentContactPref === "active" ? "Aktif (düzenli takip)" : "Dengeli (günde 1-2 kez)"],
            ["Check-in saati", me?.settings?.checkinTime ?? "21:00"],
            ["Sabah follow-up", me?.settings?.morningFollowupTime ?? "08:00"],
            ["LLM modeli", me?.settings?.llmModel ?? "claude-3.5-sonnet"],
          ].map(([label, val]) => (
            <div key={label} style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div className="mono dim fs-11" style={{ letterSpacing: "0.12em", marginBottom: 4 }}>{String(label).toUpperCase()}</div>
              <div className="fs-13" style={{ fontWeight: 500 }}>{String(val)}</div>
            </div>
          ))}
        </div>
        <div className="divider" />
        <p className="muted fs-12" style={{ fontStyle: "italic" }}>
          Onboarding'de seçtiğin tercihler. Değiştirmek için yeniden onboarding'e gidebilirsin.
        </p>
      </div>
    </div>
  );
}
