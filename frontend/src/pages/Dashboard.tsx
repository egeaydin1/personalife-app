import { useQuery } from "@tanstack/react-query";
import { reports, tasks, checkins, calendar } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDuration, todayISO } from "@/lib/utils";
import { CheckSquare, Clock, Calendar, MessageSquare, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: daily } = useQuery({ queryKey: ["reports", "daily"], queryFn: () => reports.daily() });
  const { data: activeTasks } = useQuery({ queryKey: ["tasks", "active"], queryFn: () => tasks.list({ status: "TODO" }) });
  const { data: todayCheckin } = useQuery({ queryKey: ["checkin", "today"], queryFn: () => checkins.today() });
  const { data: upcoming } = useQuery({
    queryKey: ["calendar", "upcoming"],
    queryFn: () => {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 86400000).toISOString();
      return calendar.list({ from, to });
    },
  });

  const today = formatDate(todayISO());
  const urgentTasks = activeTasks?.filter((t: any) => t.priority === "URGENT" || t.priority === "HIGH") ?? [];
  const hasCheckin = todayCheckin?.messages?.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      {/* Check-in prompt */}
      {!hasCheckin && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Bugünkü check-in'ini yaptın mı?</p>
                <p className="text-sm text-muted-foreground">Günlük logunı AI agent ile birlikte çıkar</p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/checkin">Başla</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<CheckSquare className="h-4 w-4" />}
          label="Aktif Görev"
          value={activeTasks?.length ?? "—"}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Bugün Aktivite"
          value={daily ? formatDuration(daily.summary?.totalActivityMin ?? 0) : "—"}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Ekran Süresi"
          value={daily ? formatDuration(daily.summary?.totalScreenMin ?? 0) : "—"}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Yaklaşan Etkinlik"
          value={upcoming?.length ?? "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Urgent tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Öncelikli Görevler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Öncelikli görev yok</p>
            ) : (
              urgentTasks.slice(0, 5).map((task: any) => (
                <div key={task.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    {task.course && (
                      <p className="text-xs text-muted-foreground">{task.course.name}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    {task.deadline && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.deadline).toLocaleDateString("tr-TR", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" asChild className="mt-2 w-full">
              <Link to="/tasks">Tüm görevler</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Yaklaşan Etkinlikler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!upcoming || upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu hafta etkinlik yok</p>
            ) : (
              upcoming.slice(0, 5).map((event: any) => (
                <div key={event.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {new Date(event.startAt).getDate()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.startAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" asChild className="mt-2 w-full">
              <Link to="/schedule">Takvimi görüntüle</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    URGENT: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    LOW: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = { URGENT: "Acil", HIGH: "Yüksek", MEDIUM: "Orta", LOW: "Düşük" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[priority] ?? ""}`}>
      {labels[priority] ?? priority}
    </span>
  );
}
