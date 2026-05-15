import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { auth, integrations } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

// ── Small helpers ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col gap-6">
      <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>{label}</label>
      {children}
    </div>
  );
}

function EditInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none", width: "100%", transition: "border-color 160ms" }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(91,140,255,0.5)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
    />
  );
}

function EditSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none", width: "100%", cursor: "pointer" }}
    >
      <option value="">Seç…</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SaveBanner({ saved, error }: { saved: boolean; error?: string }) {
  if (!saved && !error) return null;
  return (
    <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, lineHeight: 1.4,
      background: error ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
      border: `1px solid ${error ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
      color: error ? "var(--danger)" : "var(--success)" }}>
      {error ?? "✓ Kaydedildi"}
    </div>
  );
}

const FOCUS_OPTIONS = [
  { id: "academic", label: "Akademik performans" },
  { id: "productivity", label: "Üretkenlik & odak" },
  { id: "social", label: "Sosyal ilişkiler" },
  { id: "health", label: "Sağlık & spor" },
  { id: "digital", label: "Dijital denge" },
  { id: "emotional", label: "Duygusal farkındalık" },
  { id: "projects", label: "Kişisel projeler" },
];

const LLM_MODELS = [
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (önerilen)" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku (hızlı)" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (ucuz)" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
];

// ── Profile section ───────────────────────────────────────────
function ProfileSection({ me }: { me: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", timezone: "", city: "", ageRange: "", role: "", school: "", major: "", jobTitle: "", workMode: "", dailyRoutine: "", wakeTime: "", sleepTime: "", peakHours: "", focusAreas: [] as string[] });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me) return;
    setForm({
      name: me.name ?? "",
      timezone: me.timezone ?? "Europe/Istanbul",
      city: me.city ?? "",
      ageRange: me.ageRange ?? "",
      role: me.role ?? "",
      school: me.school ?? "",
      major: me.major ?? "",
      jobTitle: me.jobTitle ?? "",
      workMode: me.workMode ?? "",
      dailyRoutine: me.dailyRoutine ?? "",
      wakeTime: me.wakeTime ?? "",
      sleepTime: me.sleepTime ?? "",
      peakHours: me.peakHours ?? "",
      focusAreas: me.focusAreas ?? [],
    });
  }, [me]);

  const mut = useMutation({
    mutationFn: (data: any) => auth.updateMe(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setError("");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: any) => setError(e.message ?? "Kaydetme başarısız"),
  });

  function set(field: string) {
    return (v: string) => setForm(f => ({ ...f, [field]: v }));
  }
  function toggleFocus(id: string) {
    setForm(f => ({ ...f, focusAreas: f.focusAreas.includes(id) ? f.focusAreas.filter(x => x !== id) : [...f.focusAreas, id] }));
  }

  const isStudent = form.role === "student";
  const isWorker = form.role === "employee" || form.role === "freelance";

  return (
    <div className="card col gap-20">
      <div className="card-head">
        <div className="card-title"><span className="card-title-dot" />Profil Bilgileri</div>
      </div>

      <SaveBanner saved={saved} error={error} />

      {/* Temel */}
      <div>
        <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 12 }}>TEMEL</div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="AD SOYAD">
            <EditInput value={form.name} onChange={set("name")} placeholder="Adın" />
          </Field>
          <Field label="ŞEHİR">
            <EditInput value={form.city} onChange={set("city")} placeholder="İstanbul" />
          </Field>
          <Field label="SAAT DİLİMİ">
            <EditSelect value={form.timezone} onChange={set("timezone")} options={[
              { value: "Europe/Istanbul", label: "Europe/Istanbul (TR)" },
              { value: "Europe/London", label: "Europe/London" },
              { value: "America/New_York", label: "America/New_York" },
              { value: "Asia/Tokyo", label: "Asia/Tokyo" },
            ]} />
          </Field>
          <Field label="YAŞ ARALIĞI">
            <EditSelect value={form.ageRange} onChange={set("ageRange")} options={["16-22", "23-29", "30-39", "40+"].map(v => ({ value: v, label: v }))} />
          </Field>
        </div>
      </div>

      {/* Hayat durumu */}
      <div>
        <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 12 }}>HAYAT DURUMU</div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="ROL">
            <EditSelect value={form.role} onChange={set("role")} options={[
              { value: "student", label: "Öğrenci" },
              { value: "employee", label: "Çalışan" },
              { value: "freelance", label: "Freelance" },
              { value: "transition", label: "Geçiş döneminde" },
              { value: "other", label: "Diğer" },
            ]} />
          </Field>
          {isStudent && <>
            <Field label="OKUL">
              <EditInput value={form.school} onChange={set("school")} placeholder="Boğaziçi Üniversitesi" />
            </Field>
            <Field label="BÖLÜM">
              <EditInput value={form.major} onChange={set("major")} placeholder="Bilgisayar Müh." />
            </Field>
          </>}
          {isWorker && <>
            <Field label="POZİSYON / ALAN">
              <EditInput value={form.jobTitle} onChange={set("jobTitle")} placeholder="Software Engineer" />
            </Field>
            <Field label="ÇALIŞMA ŞEKLİ">
              <EditSelect value={form.workMode} onChange={set("workMode")} options={[
                { value: "office", label: "Ofis" },
                { value: "remote", label: "Uzaktan" },
                { value: "hybrid", label: "Hibrit" },
              ]} />
            </Field>
          </>}
        </div>
        <div className="col gap-6 mt-12">
          <label className="mono dim fs-11" style={{ letterSpacing: "0.14em" }}>TİPİK GÜN (agent context için)</label>
          <textarea
            value={form.dailyRoutine}
            onChange={e => setForm(f => ({ ...f, dailyRoutine: e.target.value }))}
            placeholder="Sabah erken kalkıp 9'da derse gidiyorum, akşam 5'e kadar okul, sonra 2-3 saat kütüphane..."
            rows={3}
            style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-0)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none", width: "100%", resize: "vertical", lineHeight: 1.5 }}
          />
        </div>
      </div>

      {/* Ritim */}
      <div>
        <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 12 }}>RİTİM</div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="UYANMA SAATİ">
            <EditInput value={form.wakeTime} onChange={set("wakeTime")} type="time" />
          </Field>
          <Field label="UYUMA SAATİ">
            <EditInput value={form.sleepTime} onChange={set("sleepTime")} type="time" />
          </Field>
          <Field label="EN ÜRETKENLİK SAATLERİ">
            <EditSelect value={form.peakHours} onChange={set("peakHours")} options={[
              { value: "morning", label: "Sabah (6-10)" },
              { value: "afternoon", label: "Öğleden sonra (12-16)" },
              { value: "evening", label: "Akşam (18-22)" },
              { value: "late_night", label: "Gece (22-02)" },
            ]} />
          </Field>
        </div>
      </div>

      {/* Odak alanları */}
      <div>
        <div className="mono dim fs-11" style={{ letterSpacing: "0.14em", marginBottom: 12 }}>ODAK ALANLARI</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {FOCUS_OPTIONS.map(opt => {
            const active = form.focusAreas.includes(opt.id);
            return (
              <button key={opt.id} onClick={() => toggleFocus(opt.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: active ? "rgba(91,140,255,0.12)" : "var(--surface)", border: `1px solid ${active ? "rgba(91,140,255,0.4)" : "var(--border)"}`, color: "var(--text-0)", cursor: "pointer", fontSize: 12.5, fontWeight: active ? 500 : 400, transition: "all 160ms", textAlign: "left" }}>
                <div style={{ width: 8, height: 8, borderRadius: 50, background: active ? "var(--primary)" : "var(--text-3)", boxShadow: active ? "0 0 6px var(--primary)" : "none", flexShrink: 0 }} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="between">
        <span className="muted fs-12">Son kayıt: {me?.updatedAt ? new Date(me.updatedAt).toLocaleString("tr-TR") : "—"}</span>
        <button className="btn primary" onClick={() => { setError(""); mut.mutate(form); }} disabled={mut.isPending}>
          <Icon name={mut.isPending ? "loader" : "check"} size={14} />
          {mut.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ── Agent settings section ────────────────────────────────────
function AgentSection({ me }: { me: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ checkinTime: "21:00", morningFollowupTime: "08:00", llmModel: "anthropic/claude-3.5-sonnet", agentContactPref: "balanced", agentTone: "casual" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me) return;
    setForm({
      checkinTime: me.settings?.checkinTime ?? "21:00",
      morningFollowupTime: me.settings?.morningFollowupTime ?? "08:00",
      llmModel: me.settings?.llmModel ?? "anthropic/claude-3.5-sonnet",
      agentContactPref: me.agentContactPref ?? "balanced",
      agentTone: me.agentTone ?? "casual",
    });
  }, [me]);

  const settingsMut = useMutation({
    mutationFn: (d: any) => auth.updateSettings(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["me"] }); setSaved(true); setError(""); setTimeout(() => setSaved(false), 3000); },
    onError: (e: any) => setError(e.message),
  });
  const profileMut = useMutation({
    mutationFn: (d: any) => auth.updateMe(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  function save() {
    const { agentContactPref, agentTone, ...settingsData } = form;
    settingsMut.mutate(settingsData);
    profileMut.mutate({ agentContactPref, agentTone });
  }

  return (
    <div className="card col gap-20">
      <div className="card-head">
        <div className="card-title"><span className="card-title-dot" style={{ background: "var(--purple)", boxShadow: "0 0 8px var(--purple)" }} />Agent Tercihleri</div>
      </div>

      <SaveBanner saved={saved} error={error} />

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="GÜNLÜK CHECK-IN SAATİ">
          <EditInput value={form.checkinTime} onChange={v => setForm(f => ({ ...f, checkinTime: v }))} type="time" />
        </Field>
        <Field label="SABAH FOLLOW-UP SAATİ">
          <EditInput value={form.morningFollowupTime} onChange={v => setForm(f => ({ ...f, morningFollowupTime: v }))} type="time" />
        </Field>
        <Field label="KONUŞMA TONU">
          <EditSelect value={form.agentTone} onChange={v => setForm(f => ({ ...f, agentTone: v }))} options={[
            { value: "casual", label: "Samimi" },
            { value: "neutral", label: "Nötr" },
            { value: "professional", label: "Profesyonel" },
          ]} />
        </Field>
        <Field label="İLETİŞİM SIKLIĞI">
          <EditSelect value={form.agentContactPref} onChange={v => setForm(f => ({ ...f, agentContactPref: v }))} options={[
            { value: "silent", label: "Sessiz — istediğimde gelir" },
            { value: "balanced", label: "Dengeli — günde 1-2 kez" },
            { value: "active", label: "Aktif — düzenli takip" },
          ]} />
        </Field>
        <Field label="LLM MODELİ">
          <EditSelect value={form.llmModel} onChange={v => setForm(f => ({ ...f, llmModel: v }))} options={LLM_MODELS} />
        </Field>
      </div>

      <div className="between">
        <span className="muted fs-12">OpenRouter üzerinden çalışır. Model değiştirmek ücreti etkileyebilir.</span>
        <button className="btn primary" onClick={save} disabled={settingsMut.isPending}>
          <Icon name={settingsMut.isPending ? "loader" : "check"} size={14} />
          {settingsMut.isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ── Password section ──────────────────────────────────────────
function PasswordSection() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mut = useMutation({
    mutationFn: (d: any) => auth.changePassword(d),
    onSuccess: () => { setSaved(true); setError(""); setForm({ currentPassword: "", newPassword: "", confirm: "" }); setTimeout(() => setSaved(false), 3000); },
    onError: (e: any) => setError(e.message ?? "Şifre değiştirilemedi"),
  });

  function save() {
    setError("");
    if (form.newPassword !== form.confirm) { setError("Yeni şifreler eşleşmiyor"); return; }
    if (form.newPassword.length < 8) { setError("Şifre en az 8 karakter olmalı"); return; }
    mut.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  }

  return (
    <div className="card col gap-20">
      <div className="card-head">
        <div className="card-title"><span className="card-title-dot" style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }} />Şifre Değiştir</div>
      </div>

      <SaveBanner saved={saved} error={error} />

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="MEVCUT ŞİFRE">
          <EditInput value={form.currentPassword} onChange={v => setForm(f => ({ ...f, currentPassword: v }))} type="password" placeholder="••••••••" />
        </Field>
        <Field label="YENİ ŞİFRE">
          <EditInput value={form.newPassword} onChange={v => setForm(f => ({ ...f, newPassword: v }))} type="password" placeholder="En az 8 karakter" />
        </Field>
        <Field label="YENİ ŞİFRE (TEKRAR)">
          <EditInput value={form.confirm} onChange={v => setForm(f => ({ ...f, confirm: v }))} type="password" placeholder="••••••••" />
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn primary" onClick={save} disabled={!form.currentPassword || !form.newPassword || mut.isPending}>
          <Icon name="check" size={14} />{mut.isPending ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
        </button>
      </div>
    </div>
  );
}

// ── Telegram card ─────────────────────────────────────────────
function TelegramCard({ ints }: { ints: any[] }) {
  const qc = useQueryClient();
  const existing = ints.find(i => i.type === "TELEGRAM");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const isConnected = existing?.status === "ACTIVE";

  const startMut = useMutation({
    mutationFn: integrations.startTelegram,
    onSuccess: (data: any) => { if (data.deepLink) { setDeepLink(data.deepLink); setPolling(true); } },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => integrations.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["integrations"] }); setDeepLink(null); setPolling(false); },
  });

  useQuery({
    queryKey: ["telegram-status"],
    queryFn: () => auth.me(),
    refetchInterval: polling ? 3000 : false,
    enabled: polling,
    select: (d: any) => d,
  });

  useEffect(() => {
    if (polling && isConnected) { setPolling(false); setDeepLink(null); }
  }, [isConnected, polling]);

  const botInfo = useQuery({
    queryKey: ["telegram-bot-info"],
    queryFn: () => fetch("/api/v1/integrations/telegram/bot-info", { headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? ""}` } }).then(r => r.json()),
    staleTime: 60_000,
  });
  const available = (botInfo.data as any)?.available === true;

  return (
    <div className="card tight" style={{ borderColor: isConnected ? "rgba(34,211,238,0.35)" : "var(--border)", background: isConnected ? "linear-gradient(180deg,rgba(34,211,238,0.06),transparent),var(--grad-card)" : "var(--grad-card)" }}>
      <div className="between" style={{ marginBottom: 10 }}>
        <div className="row gap-10">
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(34,211,238,0.12)", color: "var(--cyan)", display: "grid", placeItems: "center", border: "1px solid rgba(34,211,238,0.3)" }}><Icon name="send" size={16} /></div>
          <div>
            <div className="display fs-14" style={{ fontWeight: 600 }}>Telegram bot</div>
            <div className="mono" style={{ fontSize: 10, color: isConnected ? "var(--cyan)" : "var(--text-3)", letterSpacing: "0.1em" }}>{isConnected ? `BAĞLI · @${(existing.config as any)?.username ?? ""}` : polling ? "BEKLENIYOR..." : available ? "HAZIR" : "YAPILANDIRILMADI"}</div>
          </div>
        </div>
        {isConnected && <span className="toast-pill" style={{ fontSize: 10 }}><span className="pulse-dot" />Aktif</span>}
      </div>
      <p className="muted fs-12" style={{ lineHeight: 1.5, marginBottom: 12 }}>Check-in hatırlatmaları, akıllı nudge'lar. Telegram'dan mesaj yazarak da log girebilirsin.</p>
      {!available && !isConnected && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "var(--amber)" }}>Sunucuda <code>TELEGRAM_BOT_TOKEN</code> ayarlanmadı. Bkz: INTEGRATIONS.md</div>}
      {!isConnected && available && !deepLink && <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => startMut.mutate()} disabled={startMut.isPending}>{startMut.isPending ? "Oluşturuluyor..." : "Telegram bağla"}</button>}
      {polling && deepLink && (
        <div className="col gap-8">
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", fontSize: 12, lineHeight: 1.5 }}>1. Aşağıdaki butona tıkla → Telegram'da bota git<br />2. <strong>START</strong> butonuna bas → "merhaba" diyecek<br />3. Bağlantı otomatik algılanacak</div>
          <a href={deepLink} target="_blank" rel="noreferrer" className="btn primary" style={{ textDecoration: "none", justifyContent: "center" }}><Icon name="send" size={14} />Telegram'da aç</a>
          <div className="row gap-6" style={{ justifyContent: "center" }}><div style={{ width: 8, height: 8, borderRadius: 50, background: "var(--cyan)", animation: "pulse 1.6s ease-in-out infinite" }} /><span className="mono dim fs-11">Bağlantı bekleniyor...</span></div>
        </div>
      )}
      {isConnected && <button className="btn ghost sm" style={{ width: "100%", justifyContent: "center", color: "var(--danger)" }} onClick={() => deleteMut.mutate(existing.id)}><Icon name="x" size={13} />Bağlantıyı kaldır</button>}
    </div>
  );
}

// ── Google Calendar card ─────────────────────────────────────
function GoogleCard({ ints }: { ints: any[] }) {
  const qc = useQueryClient();
  const existing = ints.find(i => i.type === "GOOGLE_CALENDAR");
  const isConnected = existing?.status === "ACTIVE";
  const [searchParams] = useSearchParams();

  const deleteMut = useMutation({
    mutationFn: (id: string) => integrations.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
  const syncMut = useMutation({
    mutationFn: () => fetch("/api/v1/integrations/google/sync", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? ""}` } }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  async function connect() {
    const res = await fetch("/api/v1/integrations/google/start", { headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? ""}` } });
    const data = await res.json() as any;
    if (data.url) window.location.href = data.url;
    else if (data.error) alert(data.error);
  }

  return (
    <div className="card tight" style={{ borderColor: isConnected ? "rgba(91,140,255,0.35)" : "var(--border)", background: isConnected ? "linear-gradient(180deg,rgba(91,140,255,0.06),transparent),var(--grad-card)" : "var(--grad-card)" }}>
      <div className="between" style={{ marginBottom: 10 }}>
        <div className="row gap-10">
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(91,140,255,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", border: "1px solid rgba(91,140,255,0.3)" }}><Icon name="calendar" size={16} /></div>
          <div>
            <div className="display fs-14" style={{ fontWeight: 600 }}>Google Calendar</div>
            <div className="mono" style={{ fontSize: 10, color: isConnected ? "var(--primary)" : "var(--text-3)", letterSpacing: "0.1em" }}>{isConnected ? `BAĞLI · ${existing.externalId ?? ""}` : "BAĞLI DEĞİL"}</div>
          </div>
        </div>
        {isConnected && <span className="toast-pill" style={{ fontSize: 10, background: "rgba(91,140,255,0.1)", borderColor: "rgba(91,140,255,0.3)", color: "var(--primary)" }}><span className="pulse-dot" style={{ background: "var(--primary)" }} />Sync aktif</span>}
      </div>
      {searchParams.get("google_connected") === "1" && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12, color: "var(--success)" }}>✓ Google Calendar bağlandı!</div>}
      <p className="muted fs-12" style={{ lineHeight: 1.5, marginBottom: 12 }}>Etkinlikler otomatik sync. Agent gelecek planlarını görebilir.</p>
      {!isConnected && <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={connect}><Icon name="calendar" size={14} />Google ile bağla</button>}
      {isConnected && (
        <div>
          <div className="muted fs-11" style={{ marginBottom: 8 }}>Son sync: {existing.lastSyncAt ? new Date(existing.lastSyncAt).toLocaleString("tr-TR") : "yapılmadı"}</div>
          <div className="row gap-8">
            <button className="btn ghost sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => syncMut.mutate()} disabled={syncMut.isPending}><Icon name="loader" size={12} />{syncMut.isPending ? "Sync..." : "Manuel sync"}</button>
            <button className="btn ghost sm" style={{ flex: 1, justifyContent: "center", color: "var(--danger)" }} onClick={() => deleteMut.mutate(existing.id)}><Icon name="x" size={12} />Kaldır</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── iCal card ─────────────────────────────────────────────────
function ICalCard({ icalToken }: { icalToken: string }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const url = icalToken ? `${window.location.origin}/api/v1/ical/${icalToken}` : "";
  const regenMut = useMutation({ mutationFn: integrations.regenerateIcal, onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }) });
  function copy() { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  return (
    <div className="card tight" style={{ borderColor: "rgba(163,230,53,0.25)" }}>
      <div className="row gap-10" style={{ marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(163,230,53,0.12)", color: "var(--lime)", display: "grid", placeItems: "center", border: "1px solid rgba(163,230,53,0.3)" }}><Icon name="calendar" size={16} /></div>
        <div>
          <div className="display fs-14" style={{ fontWeight: 600 }}>iCal export URL</div>
          <div className="mono dim" style={{ fontSize: 10, letterSpacing: "0.1em" }}>HER TAKVİME READ-ONLY SYNC</div>
        </div>
      </div>
      <p className="muted fs-12" style={{ lineHeight: 1.5, marginBottom: 10 }}>Apple Calendar, Google Calendar veya Outlook'a "Abonelik ekle" ile kullan.</p>
      <div style={{ padding: "8px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-2)", wordBreak: "break-all", lineHeight: 1.5, marginBottom: 10 }}>{url || "yükleniyor..."}</div>
      <div className="row gap-8">
        <button className="btn sm primary" onClick={copy} disabled={!url} style={{ flex: 1, justifyContent: "center" }}><Icon name={copied ? "check" : "edit"} size={12} />{copied ? "Kopyalandı!" : "Kopyala"}</button>
        <button className="btn sm ghost" onClick={() => regenMut.mutate()} disabled={regenMut.isPending}><Icon name="loader" size={12} />Yenile</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function Settings() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const { data: intData, refetch: refetchInts } = useQuery({ queryKey: ["integrations"], queryFn: integrations.list, refetchInterval: 5000 });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("google_connected") || searchParams.get("google_error")) {
      refetchInts();
      const t = setTimeout(() => setSearchParams({}), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams, refetchInts]);

  const ints = intData?.integrations ?? [];

  return (
    <div className="col gap-20">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-kicker">Hesap · profil & entegrasyonlar</span>
          <h1 className="topbar-title">Ayarlar.</h1>
          <span className="muted fs-13">Profil bilgilerin, agent tercihlerin ve dış servis bağlantıları.</span>
        </div>
      </div>

      <ProfileSection me={me} />
      <AgentSection me={me} />
      <PasswordSection />

      {/* Integrations */}
      <div>
        <div className="between" style={{ marginBottom: 14 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Entegrasyonlar</h3>
          <span className="card-sub">{ints.filter(i => i.status === "ACTIVE").length} AKTİF</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <TelegramCard ints={ints} />
          <GoogleCard ints={ints} />
          <ICalCard icalToken={intData?.icalToken ?? ""} />
        </div>
      </div>
    </div>
  );
}
