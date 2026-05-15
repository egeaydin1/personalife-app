import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import { auth } from "@/lib/api";
import Layout from "@/components/layout/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import CheckIn from "@/pages/CheckIn";
import Tasks from "@/pages/Tasks";
import Schedule from "@/pages/Schedule";
import Friends from "@/pages/Friends";
import ScreenTime from "@/pages/ScreenTime";
import Analytics from "@/pages/Analytics";
import Memory from "@/pages/Memory";
import Settings from "@/pages/Settings";

function PrivateRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;

  // Check onboarding status via /me
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: auth.me,
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-0)" }}>
        <div className="app-bg" />
        <div style={{ position: "relative", zIndex: 1, color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.2em" }}>YÜKLENİYOR...</div>
      </div>
    );
  }

  // No user (token invalid) → login
  if (!me) return <Navigate to="/login" replace />;

  if (requireOnboarding && !me.onboardingCompletedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={
          <PrivateRoute requireOnboarding={false}>
            <Onboarding />
          </PrivateRoute>
        } />
        <Route
          path="/"
          element={
            isAuthenticated()
              ? <PrivateRoute><Layout /></PrivateRoute>
              : <Navigate to="/welcome" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="friends" element={<Friends />} />
          <Route path="screen-time" element={<ScreenTime />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="memory" element={<Memory />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
