import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { clearToken } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/api";
import { format } from "date-fns";

const NAV = [
  { to: "/",           id: "dashboard", icon: "pulse",    label: "Dashboard",   section: "core" },
  { to: "/checkin",    id: "checkin",   icon: "edit",     label: "Check-in",    section: "core" },
  { to: "/schedule",   id: "schedule",  icon: "calendar", label: "Calendar",    section: "core" },
  { to: "/tasks",      id: "tasks",     icon: "tasks",    label: "Tasks",       section: "core" },
  { to: "/analytics",  id: "analytics", icon: "chart",    label: "Analytics",   section: "explore" },
  { to: "/friends",    id: "friends",   icon: "users",    label: "Friends",     section: "explore" },
  { to: "/memory",     id: "memory",    icon: "memory",   label: "Memory",      section: "explore", dot: true },
  { to: "/screen-time",id: "screen",    icon: "phone",    label: "Screen Time", section: "explore" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me, retry: false });

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const core = NAV.filter(n => n.section === "core");
  const explore = NAV.filter(n => n.section === "explore");

  function logout() {
    clearToken();
    navigate("/login");
  }

  const initial = me?.name ? me.name[0].toUpperCase() : me?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <div className="brand-name">Personalife</div>
          <div className="brand-sub">life · OS · v1.0</div>
        </div>
      </div>

      <div className="nav-group-label">Today</div>
      {core.map(n => (
        <button key={n.id}
          className={`nav-item ${isActive(n.to) ? "active" : ""}`}
          onClick={() => navigate(n.to)}
        >
          <span className="nav-icon"><Icon name={n.icon} size={17} /></span>
          <span>{n.label}</span>
        </button>
      ))}

      <div className="nav-group-label">Reflect</div>
      {explore.map(n => (
        <button key={n.id}
          className={`nav-item ${isActive(n.to) ? "active" : ""}`}
          onClick={() => navigate(n.to)}
        >
          <span className="nav-icon"><Icon name={n.icon} size={17} /></span>
          <span>{n.label}</span>
          {n.dot && <span className="nav-badge dot" />}
        </button>
      ))}

      <div className="agent-presence">
        <div className="agent-row">
          <div className="agent-orb" />
          <div className="col" style={{ gap: 1 }}>
            <span className="display fs-12" style={{ fontWeight: 600 }}>Agent · awake</span>
            <span className="mono dim" style={{ fontSize: 9.5, letterSpacing: "0.12em" }}>READING YOUR DAY</span>
          </div>
        </div>
        <div className="agent-meta">
          {format(new Date(), "HH:mm")} · active<br />
          memory synced<br />
          next check-in · 21:00
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initial}</div>
            <span className="mono fs-11" style={{ color: "var(--text-2)" }}>{me?.name ?? me?.email?.split("@")[0] ?? "user"}</span>
          </div>
          <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }} onClick={logout} title="Çıkış">
            <Icon name="logout" size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
