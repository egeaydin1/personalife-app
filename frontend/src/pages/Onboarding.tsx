import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";

const ROLES = [
  { id: "student", label: "Öğrenciyim", icon: "school" },
  { id: "employee", label: "Çalışıyorum", icon: "phone" },
  { id: "freelance", label: "Freelance", icon: "zap" },
  { id: "transition", label: "Geçiş döneminde", icon: "loader" },
  { id: "other", label: "Diğer", icon: "users" },
];

const AGE_RANGES = ["16-22", "23-29", "30-39", "40+"];

const FOCUS_AREAS = [
  { id: "academic", label: "Akademik performans", color: "#5B8CFF" },
  { id: "productivity", label: "Üretkenlik & odak", color: "#F59E0B" },
  { id: "social", label: "Sosyal ilişkiler", color: "#F472B6" },
  { id: "health", label: "Sağlık & spor", color: "#A3E635" },
  { id: "digital", label: "Dijital denge", color: "#22D3EE" },
  { id: "emotional", label: "Duygusal farkındalık", color: "#8B5CF6" },
  { id: "projects", label: "Kişisel projeler", color: "#EF4444" },
];

const PEAK_HOURS = [
  { id: "morning", label: "Sabah", desc: "6:00 – 10:00", emoji: "🌅" },
  { id: "afternoon", label: "Öğleden sonra", desc: "12:00 – 16:00", emoji: "☀️" },
  { id: "evening", label: "Akşam", desc: "18:00 – 22:00", emoji: "🌆" },
  { id: "late_night", label: "Gece geç", desc: "22:00 – 02:00", emoji: "🌙" },
];

const CONTACT_PREFS = [
  { id: "silent", label: "Sessiz", desc: "Ben istediğimde gelir" },
  { id: "balanced", label: "Dengeli (önerilen)", desc: "Günde 1-2 kez nazikçe" },
  { id: "active", label: "Aktif", desc: "Düzenli takip + nudge'lar" },
];

async function callApi(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
  return res.json();
}

export default function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>({
    ageRange: "",
    role: "",
    school: "",
    major: "",
    jobTitle: "",
    dailyRoutine: "",
    focusAreas: [] as string[],
    goals: [{ title: "" }, { title: "" }, { title: "" }],
    wakeTime: "07:30",
    sleepTime: "23:30",
    peakHours: "",
    agentContactPref: "balanced",
    agentTone: "casual",
  });

  const completeMut = useMutation({
    mutationFn: (data: any) => callApi("/auth/onboarding", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    },
  });

  function next() {
    if (step < 2) setStep(s => s + 1);
    else submit();
  }
  function back() { if (step > 0) setStep(s => s - 1); }
  function skip() { submit(); }

  function submit() {
    const cleanGoals = (form.goals as { title: string; description?: string }[]).filter(g => g.title.trim());
    completeMut.mutate({ ...form, goals: cleanGoals });
  }

  function toggleFocus(id: string) {
    setForm((f: any) => ({
      ...f,
      focusAreas: f.focusAreas.includes(id) ? f.focusAreas.filter((x: string) => x !== id) : [...f.focusAreas, id],
    }));
  }

  const stepLabels = ["Kimliğin", "Hedefler", "Ritim"];
  const canProceed = step === 0
    ? !!form.role && !!form.ageRange
    : step === 1
    ? form.focusAreas.length > 0
    : !!form.peakHours;

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "auto", background: "var(--bg-0)" }}>
      <div className="app-bg" />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
        {/* Header with progress */}
        <header style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "radial-gradient(circle at 30% 30%, #c8d7ff, #5B8CFF 50%, #8B5CF6 100%)", boxShadow: "0 0 14px rgba(91,140,255,0.5)" }} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>Personalife</div>
              <div className="mono dim" style={{ fontSize: 9, letterSpacing: "0.18em" }}>KURULUM · {step + 1}/3</div>
            </div>
            <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={skip} disabled={completeMut.isPending}>
              Şimdilik atla
            </button>
          </div>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 24 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 50,
                  background: i <= step ? "linear-gradient(135deg, #5B8CFF, #8B5CF6)" : "var(--surface)",
                  border: `1px solid ${i <= step ? "rgba(91,140,255,0.5)" : "var(--border)"}`,
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                  color: i <= step ? "white" : "var(--text-3)",
                  boxShadow: i === step ? "0 0 16px rgba(91,140,255,0.5)" : "none",
                  transition: "all 240ms",
                  flexShrink: 0,
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="mono" style={{ fontSize: 11, color: i <= step ? "var(--text-1)" : "var(--text-3)", letterSpacing: "0.12em" }}>
                  {stepLabels[i].toUpperCase()}
                </span>
                {i < 2 && <div style={{ flex: 1, height: 1, background: i < step ? "rgba(91,140,255,0.4)" : "var(--border)" }} />}
              </div>
            ))}
          </div>
        </header>

        {/* Step content */}
        <div className="card glow" style={{ padding: 32 }}>
          {step === 0 && (
            <div className="col gap-24 enter">
              <div>
                <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 8 }}>
                  Tanışalım.
                </h1>
                <p className="muted fs-14" style={{ lineHeight: 1.55 }}>
                  Agent seni iyi tanıyabilsin diye birkaç temel bilgiye ihtiyacımız var.
                </p>
              </div>

              <div className="col gap-12">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>YAŞ ARALIĞI</label>
                <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                  {AGE_RANGES.map(a => (
                    <button key={a}
                      className={form.ageRange === a ? "btn primary" : "btn ghost"}
                      onClick={() => setForm((f: any) => ({ ...f, ageRange: a }))}
                      style={{ minWidth: 80 }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col gap-12">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>ŞU AN NE YAPIYORSUN?</label>
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                  {ROLES.map(r => (
                    <button key={r.id}
                      onClick={() => setForm((f: any) => ({ ...f, role: r.id }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "12px 14px", borderRadius: 12,
                        background: form.role === r.id ? "linear-gradient(135deg, rgba(91,140,255,0.15), rgba(139,92,246,0.08))" : "var(--surface)",
                        border: `1px solid ${form.role === r.id ? "rgba(91,140,255,0.4)" : "var(--border)"}`,
                        color: "var(--text-0)",
                        cursor: "pointer", fontSize: 13, fontWeight: 500,
                        textAlign: "left", transition: "all 180ms",
                      }}>
                      <Icon name={r.icon} size={16} />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.role === "student" && (
                <div className="grid enter" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="col gap-6">
                    <label className="mono dim fs-11">OKUL</label>
                    <input className="auth-input" placeholder="Boğaziçi Üniversitesi" value={form.school} onChange={e => setForm((f: any) => ({ ...f, school: e.target.value }))} />
                  </div>
                  <div className="col gap-6">
                    <label className="mono dim fs-11">BÖLÜM</label>
                    <input className="auth-input" placeholder="Bilgisayar Müh." value={form.major} onChange={e => setForm((f: any) => ({ ...f, major: e.target.value }))} />
                  </div>
                </div>
              )}

              {(form.role === "employee" || form.role === "freelance") && (
                <div className="col gap-6 enter">
                  <label className="mono dim fs-11">POZİSYON / ALAN</label>
                  <input className="auth-input" placeholder="Software Engineer · Fintech" value={form.jobTitle} onChange={e => setForm((f: any) => ({ ...f, jobTitle: e.target.value }))} />
                </div>
              )}

              <div className="col gap-6">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>TİPİK BİR GÜNÜN NASIL GEÇİYOR? (OPSİYONEL)</label>
                <textarea className="auth-input" rows={3}
                  placeholder="Sabah erken kalkıp 9'da derse gidiyorum, akşam 5'e kadar okul, sonra 2-3 saat kütüphane..."
                  value={form.dailyRoutine}
                  onChange={e => setForm((f: any) => ({ ...f, dailyRoutine: e.target.value }))}
                  style={{ fontFamily: "var(--font-body)", resize: "vertical", lineHeight: 1.5 }} />
                <span className="muted fs-11" style={{ fontStyle: "italic" }}>Bu bilgi agent'ın bağlamı için kritik. Detay ne kadar zenginse o kadar iyi.</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="col gap-24 enter">
              <div>
                <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 8 }}>
                  Neye odaklanmak istiyorsun?
                </h1>
                <p className="muted fs-14" style={{ lineHeight: 1.55 }}>
                  Önümüzdeki dönem agent hangi alanlarda sana yardımcı olsun, neyi takip etsin?
                </p>
              </div>

              <div className="col gap-12">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>ODAK ALANLARI (BİR VEYA DAHA FAZLA)</label>
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                  {FOCUS_AREAS.map(area => {
                    const active = form.focusAreas.includes(area.id);
                    return (
                      <button key={area.id} onClick={() => toggleFocus(area.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "12px 14px", borderRadius: 12,
                          background: active ? `${area.color}15` : "var(--surface)",
                          border: `1px solid ${active ? `${area.color}55` : "var(--border)"}`,
                          color: "var(--text-0)",
                          cursor: "pointer", fontSize: 13, fontWeight: 500,
                          textAlign: "left", transition: "all 180ms",
                          boxShadow: active ? `0 0 16px ${area.color}25` : "none",
                        }}>
                        <div style={{ width: 10, height: 10, borderRadius: 50, background: area.color, boxShadow: active ? `0 0 8px ${area.color}` : "none", flexShrink: 0 }} />
                        {area.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col gap-12">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>3 AYLIK ANA HEDEFLERİN (OPSİYONEL)</label>
                {form.goals.map((g: any, i: number) => (
                  <div key={i} className="row gap-8">
                    <span className="num" style={{ fontSize: 14, color: "var(--text-3)", minWidth: 24 }}>{i + 1}.</span>
                    <input className="auth-input" style={{ flex: 1 }}
                      placeholder={["GPA'mı 3.5'a çıkarmak", "Haftada 3 gün spor yapmak", "Yan proje çıkarmak"][i]}
                      value={g.title}
                      onChange={e => setForm((f: any) => ({
                        ...f,
                        goals: f.goals.map((x: any, ix: number) => ix === i ? { ...x, title: e.target.value } : x),
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="col gap-24 enter">
              <div>
                <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 8 }}>
                  Ritmin nasıl?
                </h1>
                <p className="muted fs-14" style={{ lineHeight: 1.55 }}>
                  Agent ne zaman ulaşsın, ne zaman seni rahatsız etmesin — bunları sen belirliyorsun.
                </p>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="col gap-6">
                  <label className="mono dim fs-11">UYANMA SAATİ</label>
                  <input className="auth-input" type="time" value={form.wakeTime} onChange={e => setForm((f: any) => ({ ...f, wakeTime: e.target.value }))} />
                </div>
                <div className="col gap-6">
                  <label className="mono dim fs-11">UYUMA SAATİ</label>
                  <input className="auth-input" type="time" value={form.sleepTime} onChange={e => setForm((f: any) => ({ ...f, sleepTime: e.target.value }))} />
                </div>
              </div>

              <div className="col gap-12">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>EN ÜRETKEN OLDUĞUN ZAMAN</label>
                <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {PEAK_HOURS.map(p => (
                    <button key={p.id} onClick={() => setForm((f: any) => ({ ...f, peakHours: p.id }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 12,
                        background: form.peakHours === p.id ? "linear-gradient(135deg, rgba(91,140,255,0.15), rgba(139,92,246,0.08))" : "var(--surface)",
                        border: `1px solid ${form.peakHours === p.id ? "rgba(91,140,255,0.4)" : "var(--border)"}`,
                        color: "var(--text-0)",
                        cursor: "pointer", textAlign: "left", transition: "all 180ms",
                      }}>
                      <span style={{ fontSize: 20 }}>{p.emoji}</span>
                      <div>
                        <div className="fs-13" style={{ fontWeight: 500 }}>{p.label}</div>
                        <div className="mono dim fs-11">{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="col gap-12">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>AGENT NE SIKLIKTA ULAŞSIN?</label>
                <div className="col gap-6">
                  {CONTACT_PREFS.map(c => (
                    <button key={c.id} onClick={() => setForm((f: any) => ({ ...f, agentContactPref: c.id }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 12,
                        background: form.agentContactPref === c.id ? "linear-gradient(90deg, rgba(91,140,255,0.15), transparent)" : "var(--surface)",
                        border: `1px solid ${form.agentContactPref === c.id ? "rgba(91,140,255,0.4)" : "var(--border)"}`,
                        color: "var(--text-0)",
                        cursor: "pointer", textAlign: "left", transition: "all 180ms",
                      }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 50,
                        border: `2px solid ${form.agentContactPref === c.id ? "var(--primary)" : "var(--border-strong)"}`,
                        background: form.agentContactPref === c.id ? "var(--primary)" : "transparent",
                        boxShadow: form.agentContactPref === c.id ? "0 0 8px var(--primary)" : "none",
                        flexShrink: 0, position: "relative",
                      }}>
                        {form.agentContactPref === c.id && (
                          <div style={{ position: "absolute", inset: 3, borderRadius: 50, background: "white" }} />
                        )}
                      </div>
                      <div>
                        <div className="fs-13" style={{ fontWeight: 500 }}>{c.label}</div>
                        <div className="muted fs-11">{c.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="col gap-12">
                <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>KONUŞMA TONU</label>
                <div className="row gap-8">
                  {[
                    { id: "casual", label: "Samimi" },
                    { id: "neutral", label: "Nötr" },
                    { id: "professional", label: "Profesyonel" },
                  ].map(t => (
                    <button key={t.id}
                      className={form.agentTone === t.id ? "btn primary" : "btn ghost"}
                      onClick={() => setForm((f: any) => ({ ...f, agentTone: t.id }))}
                      style={{ flex: 1 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {completeMut.isError && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 13, marginTop: 24 }}>
              {(completeMut.error as any)?.message ?? "Bir hata oluştu"}
            </div>
          )}

          {/* Navigation */}
          <div className="row gap-12" style={{ marginTop: 32, justifyContent: "space-between" }}>
            <button className="btn ghost" onClick={back} disabled={step === 0 || completeMut.isPending}>
              <Icon name="arrow-right" size={13} stroke={1.8} />
              Geri
            </button>
            <div className="row gap-8">
              <span className="mono dim fs-11">{step + 1} / 3</span>
              <button className="btn primary" onClick={next} disabled={!canProceed || completeMut.isPending}>
                {step === 2
                  ? (completeMut.isPending ? "Kaydediliyor..." : "Tamamla")
                  : "Devam"}
                <Icon name={step === 2 ? "check" : "arrow-right"} size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
