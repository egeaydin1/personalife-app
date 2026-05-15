import { Link, Navigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { isAuthenticated } from "@/lib/auth";

const FEATURES = [
  {
    icon: "pulse",
    title: "Yaşamını izleyen pulse",
    desc: "Okul, sosyal, dijital ve odak verilerini tek bir nabız skoruna dönüştürür. Her gün momentumunu görürsün.",
    color: "#5B8CFF",
  },
  {
    icon: "edit",
    title: "Sohbetle check-in",
    desc: "Günlük serbest yazdığın metni AI agent ayrıştırır: aktivite, kişi, ruh hali, süre — hepsi yapılandırılır.",
    color: "#22D3EE",
  },
  {
    icon: "memory",
    title: "Hafızası olan agent",
    desc: "memory.md ile agent zamanla seni tanır. Hangi derste zorlandığını, kiminle iyi gittiğini bilir.",
    color: "#8B5CF6",
  },
  {
    icon: "users",
    title: "Sosyal hafıza",
    desc: "Sıradan bir kişi listesi değil — yaşadığın anılar, ilişki yakınlığı ve zamanla değişen bağlar.",
    color: "#F472B6",
  },
  {
    icon: "calendar",
    title: "Takvim entegrasyonu",
    desc: "Google Calendar bağla, iCal URL'iyle her takvime sync. Dersler ve etkinlikler otomatik takip edilir.",
    color: "#A3E635",
  },
  {
    icon: "chart",
    title: "Trend & örüntü analizi",
    desc: "Sayılar değil ilişkiler. Spor günleri odağı nasıl etkiliyor, hangi alışkanlık seni geriye çekiyor?",
    color: "#F59E0B",
  },
];

export default function Landing() {
  // Already logged in? Skip the landing.
  if (isAuthenticated()) return <Navigate to="/" replace />;

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "auto", background: "var(--bg-0)" }}>
      <div className="app-bg" />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 80 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "radial-gradient(circle at 30% 30%, #c8d7ff, #5B8CFF 50%, #8B5CF6 100%)", boxShadow: "0 0 16px rgba(91,140,255,0.5)" }} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>Personalife</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.18em" }}>LIFE · OS · v1.0</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/login" className="btn ghost" style={{ textDecoration: "none" }}>Giriş yap</Link>
            <Link to="/register" className="btn primary" style={{ textDecoration: "none" }}>Hesap oluştur</Link>
          </div>
        </header>

        {/* Hero */}
        <section style={{ textAlign: "center", marginBottom: 96 }}>
          <div className="toast-pill" style={{ marginBottom: 24, display: "inline-flex" }}>
            <span className="pulse-dot" />Erken erişim · davetli kullanıcılar
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(40px, 7vw, 72px)",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            margin: 0,
            background: "linear-gradient(180deg, #f1f4ff, #8a93b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Hayatına bakan
            <br />
            kişisel işletim sistemi.
          </h1>
          <p style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-2)",
            fontSize: 18,
            lineHeight: 1.5,
            maxWidth: 620,
            margin: "24px auto 0",
          }}>
            Günlük loglarını, takvimini, sosyal hayatını ve dijital alışkanlıklarını tek bir yerde topla.
            AI agent seni zamanla tanır, bağlamı görür, doğru zamanda doğru soruyu sorar.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <Link to="/register" className="btn primary" style={{ textDecoration: "none", height: 48, padding: "0 24px", fontSize: 14 }}>
              <Icon name="sparkles" size={16} />Hesap oluştur
            </Link>
            <Link to="/login" className="btn ghost" style={{ textDecoration: "none", height: 48, padding: "0 24px", fontSize: 14 }}>
              Zaten hesabım var
            </Link>
          </div>
        </section>

        {/* Visual: orb preview */}
        <section style={{ marginBottom: 96, display: "grid", placeItems: "center", height: 320, position: "relative" }}>
          <div className="orbit" style={{ width: 320, height: 320 }} />
          <div className="orbit outer" style={{ width: 420, height: 420 }} />
          <div className="pulse-orb" style={{ width: 140, height: 140 }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "white", textAlign: "center" }}>
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.7 }}>PULSE</div>
                <div className="display" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>82</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section style={{ marginBottom: 96 }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginBottom: 8,
          }}>
            Sayı toplamaz, örüntü gösterir.
          </h2>
          <p style={{ color: "var(--text-2)", textAlign: "center", marginBottom: 48, fontSize: 15 }}>
            Personalife sadece veri biriktirmek için değil — anlamlandırmak için tasarlandı.
          </p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card" style={{
                background: `linear-gradient(180deg, ${f.color}08, transparent), var(--grad-card)`,
                borderColor: `${f.color}22`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${f.color}1A`, color: f.color,
                  display: "grid", placeItems: "center",
                  border: `1px solid ${f.color}33`,
                  marginBottom: 16,
                }}>
                  <Icon name={f.icon} size={20} />
                </div>
                <h3 className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.01em" }}>
                  {f.title}
                </h3>
                <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ marginBottom: 96 }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginBottom: 48,
          }}>
            Nasıl çalışır?
          </h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {[
              { num: "01", title: "Tanışma", desc: "Kısa bir setup ile agent seni tanır: ritim, hedefler, odak alanları." },
              { num: "02", title: "Günlük check-in", desc: "Yazdığın şeyi yapılandırılmış loglara dönüştürür, hafızana ekler." },
              { num: "03", title: "Sürekli içgörü", desc: "Örüntüleri fark eder, doğru zamanda doğru soruyu sorar." },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: "left" }}>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  color: "var(--primary)",
                  marginBottom: 12,
                }}>
                  STEP {step.num}
                </div>
                <h3 className="display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.02em" }}>
                  {step.title}
                </h3>
                <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.55 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="card glow" style={{
          textAlign: "center",
          padding: "48px 24px",
          background: "linear-gradient(180deg, rgba(91,140,255,0.1), rgba(139,92,246,0.05))",
          borderColor: "rgba(91,140,255,0.3)",
        }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}>
            Hayatına bakmaya bugün başla.
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: 15, marginBottom: 24 }}>
            5 dakikada kurulum. Sonra sadece günlük yazıyorsun, geri kalan AI'ye kalmış.
          </p>
          <Link to="/register" className="btn primary" style={{ textDecoration: "none", height: 48, padding: "0 28px", fontSize: 14 }}>
            <Icon name="arrow-right" size={16} />Ücretsiz başla
          </Link>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 80, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.18em", marginBottom: 6 }}>PERSONALIFE · LIFE OS · v1.0</div>
          <div>Açık kaynak · kişisel proje</div>
        </footer>
      </div>
    </div>
  );
}
