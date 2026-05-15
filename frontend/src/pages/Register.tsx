import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.register(form);
      setToken(res.token);
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="app-bg" />
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "radial-gradient(circle at 30% 30%, #c8d7ff, #5B8CFF 50%, #8B5CF6 100%)", boxShadow: "0 0 20px rgba(91,140,255,0.5)", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>Personalife</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-3)", letterSpacing: "0.18em" }}>LIFE · OS · v1.0</div>
          </div>
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 6 }}>Hesap oluştur</h2>
        <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 24 }}>Yaşam işletim sistemine katıl.</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 13 }}>
              {error}
            </div>
          )}
          <div>
            <label className="auth-label">Ad Soyad</label>
            <input className="auth-input" value={form.name} onChange={set("name")} placeholder="İsteğe bağlı" />
          </div>
          <div>
            <label className="auth-label">E-posta</label>
            <input className="auth-input" type="email" value={form.email} onChange={set("email")} required autoFocus placeholder="sen@ornek.com" />
          </div>
          <div>
            <label className="auth-label">Şifre</label>
            <input className="auth-input" type="password" value={form.password} onChange={set("password")} required minLength={8} placeholder="En az 8 karakter" />
          </div>
          <button type="submit" className="btn primary" style={{ width: "100%", justifyContent: "center", height: 44, fontSize: 14 }} disabled={loading}>
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-3)" }}>
          Zaten hesabın var mı?{" "}
          <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
