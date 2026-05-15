import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, CheckSquare, Calendar,
  Users, Smartphone, BarChart2, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/checkin", icon: MessageSquare, label: "Check-in" },
  { to: "/tasks", icon: CheckSquare, label: "Görevler" },
  { to: "/schedule", icon: Calendar, label: "Ders Programı" },
  { to: "/friends", icon: Users, label: "Arkadaşlar" },
  { to: "/screen-time", icon: Smartphone, label: "Ekran Süresi" },
  { to: "/analytics", icon: BarChart2, label: "Analitik" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold tracking-tight">Personalife</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Çıkış
        </Button>
      </div>
    </aside>
  );
}
