import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth, integrations } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

const INTEGRATION_META: Record<string, { name: string; desc: string; icon: string; color: string; status: "available" | "coming-soon" }> = {
  TELEGRAM: {
    name: "Telegram bot",
    desc: "Check-in dürtüleri ve hızlı log alma. Yatak öncesi sohbette gününü özetle.",
    icon: "send",
    color: "#22D3EE",
    status: "coming-soon",
  },
  GOOGLE_CALENDAR: {
    name: "Google Calendar",
    desc: "Etkinlikleri otomatik sync. Dersler ve toplantılar agent'a görünür.",
    icon: "calendar",
    color: "#5B8CFF",
    status: "coming-soon",
  },
  ICAL_EXPORT: {
    name: "iCal export URL",
    desc: "Personalife verisini Apple Calendar, Google Calendar veya herhangi bir takvime read-only sync.",
    icon: "calendar",
    color: "#A3E635",
    status: "available",
  },
};

export default function Settings() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const { data: intData } = useQuery({ queryKey: ["integrations"], queryFn: integrations.list });
  const [copied, setCopied] = useState(false);

  const regenIcalMut = useMutation({
    mutationFn: integrations.regenerateIcal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const icalUrl = intData?.icalToken
    ? `${window.location.origin}/api/v1/ical/${intData.icalToken}`
    : "";

  function copyIcal() {
    navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Ayarlar · profil & entegrasyonlar</span>
          <h1 className="topbar-title">Ayarlar.</h1>
          <span className="muted fs-13">Hesap bilgilerin, agent davranışı, dış servis bağlantıları.</span>
        </div>
      </div>

      {/* Profile summary */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="card-title-dot" />Profilin</div>
          <span className="card-sub">{me?.onboardingCompletedAt ? "KURULUM TAMAM" : "EKSİK"}</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            ["İsim", me?.name ?? "—"],
            ["E-posta", me?.email ?? "—"],
            ["Yaş aralığı", me?.ageRange ?? "—"],
            ["Rol", me?.role ?? "—"],
            ["Şehir", me?.city ?? "—"],
            ["Saat dilimi", me?.timezone ?? "—"],
            ["Uyanma", me?.wakeTime ?? "—"],
            ["Uyuma", me?.sleepTime ?? "—"],
            ["Peak hours", me?.peakHours ?? "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ padding: 12, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div className="mono dim fs-11" style={{ letterSpacing: "0.12em" }}>{label?.toUpperCase()}</div>
              <div className="fs-13 mt-4" style={{ fontWeight: 500 }}>{val}</div>
            </div>
          ))}
        </div>
        {me?.focusAreas?.length > 0 && (
          <>
            <div className="divider" />
            <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 8 }}>ODAK ALANLARI</div>
            <div className="row gap-6" style={{ flexWrap: "wrap" }}>
              {me.focusAreas.map((a: string) => <span key={a} className="chip purple">{a}</span>)}
            </div>
          </>
        )}
        {me?.dailyRoutine && (
          <>
            <div className="divider" />
            <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 8 }}>TİPİK GÜN</div>
            <p className="fs-13" style={{ lineHeight: 1.55, color: "var(--text-1)" }}>{me.dailyRoutine}</p>
          </>
        )}
        {!me?.onboardingCompletedAt && (
          <>
            <div className="divider" />
            <button className="btn primary" onClick={() => window.location.href = "/onboarding"}>
              <Icon name="sparkles" size={13} />Kurulumu tamamla
            </button>
          </>
        )}
      </div>

      {/* Integrations */}
      <div>
        <div className="between" style={{ marginBottom: 14 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Entegrasyonlar</h3>
          <span className="card-sub">{intData?.integrations.length ?? 0} BAĞLI</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          {Object.entries(INTEGRATION_META).map(([type, meta]) => {
            const existing = intData?.integrations.find((i: any) => i.type === type);
            const isAvailable = meta.status === "available";
            return (
              <div key={type} className="card tight" style={{
                background: `linear-gradient(180deg, ${meta.color}08, transparent), var(--grad-card)`,
                borderColor: existing ? `${meta.color}55` : "var(--border)",
              }}>
                <div className="between" style={{ marginBottom: 12 }}>
                  <div className="row gap-10">
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: `${meta.color}1A`, color: meta.color,
                      display: "grid", placeItems: "center",
                      border: `1px solid ${meta.color}33`,
                    }}>
                      <Icon name={meta.icon} size={16} />
                    </div>
                    <div>
                      <div className="display fs-13" style={{ fontWeight: 600 }}>{meta.name}</div>
                      {existing && <div className="mono" style={{ fontSize: 10, color: meta.color, letterSpacing: "0.1em" }}>BAĞLI</div>}
                      {!existing && !isAvailable && <div className="mono dim" style={{ fontSize: 10, letterSpacing: "0.1em" }}>YAKINDA</div>}
                    </div>
                  </div>
                </div>
                <p className="muted fs-12" style={{ lineHeight: 1.5, marginBottom: 14, minHeight: 50 }}>{meta.desc}</p>

                {type === "ICAL_EXPORT" && (
                  <div className="col gap-8">
                    <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-2)", wordBreak: "break-all", lineHeight: 1.5 }}>
                      {icalUrl || "yükleniyor..."}
                    </div>
                    <div className="row gap-6">
                      <button className="btn sm primary" onClick={copyIcal} disabled={!icalUrl}>
                        <Icon name={copied ? "check" : "edit"} size={11} />
                        {copied ? "Kopyalandı" : "URL'yi kopyala"}
                      </button>
                      <button className="btn sm ghost" onClick={() => regenIcalMut.mutate()} disabled={regenIcalMut.isPending}>
                        <Icon name="loader" size={11} />
                        Yenile
                      </button>
                    </div>
                    <p className="muted fs-11" style={{ fontStyle: "italic", marginTop: 4 }}>
                      Apple/Google Calendar'da "Add subscription" altına bu URL'yi yapıştır.
                    </p>
                  </div>
                )}

                {type !== "ICAL_EXPORT" && (
                  <button className="btn ghost sm" style={{ width: "100%", justifyContent: "center" }} disabled={!isAvailable}>
                    {isAvailable ? "Bağla" : "Yakında"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
