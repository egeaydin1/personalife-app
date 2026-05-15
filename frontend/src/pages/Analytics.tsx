import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reports } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatDuration } from "@/lib/utils";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#14b8a6", "#f97316"];

export default function Analytics() {
  const [weekDate] = useState(new Date().toISOString().split("T")[0]);
  const [month] = useState(new Date().toISOString().slice(0, 7));

  const { data: weekly } = useQuery({ queryKey: ["reports", "weekly"], queryFn: () => reports.weekly(weekDate) });
  const { data: monthly } = useQuery({ queryKey: ["reports", "monthly"], queryFn: () => reports.monthly(month) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Analitik</h1>

      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Bu Hafta</TabsTrigger>
          <TabsTrigger value="monthly">Bu Ay</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4 mt-4">
          {weekly && (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-4">
                <SummaryCard label="Check-in" value={`${weekly.checkinsCompleted}/7`} />
                <SummaryCard label="Toplam Aktivite" value={formatDuration(weekly.byCategory?.reduce((s: number, c: any) => s + c.minutes, 0) ?? 0)} />
                <SummaryCard label="Ekran Süresi" value={formatDuration(weekly.screenByApp?.reduce((s: number, c: any) => s + c.minutes, 0) ?? 0)} />
              </div>

              {/* Daily bar chart */}
              {weekly.dailyBreakdown?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Günlük Aktivite (dk)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={weekly.dailyBreakdown}>
                        <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("tr-TR", { weekday: "short" })} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => formatDuration(v)} labelFormatter={(d) => new Date(d).toLocaleDateString("tr-TR")} />
                        <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Category pie */}
              {weekly.byCategory?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Kategori Dağılımı</CardTitle></CardHeader>
                  <CardContent className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={weekly.byCategory} dataKey="minutes" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                          {weekly.byCategory.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatDuration(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1">
                      {weekly.byCategory.map((c: any, i: number) => (
                        <div key={c.name} className="flex items-center gap-2 text-sm">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">{formatDuration(c.minutes)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top screen time apps */}
              {weekly.screenByApp?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">En Çok Kullanılan Uygulamalar</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {weekly.screenByApp.slice(0, 7).map((a: any) => (
                      <div key={a.appName} className="flex items-center justify-between text-sm">
                        <span>{a.appName}</span>
                        <span className="text-muted-foreground">{formatDuration(a.minutes)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4 mt-4">
          {monthly && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SummaryCard label="Toplam Aktivite" value={`${Math.round(monthly.totalActivityHours * 10) / 10}h`} />
                <SummaryCard label="Ekran Süresi" value={`${Math.round(monthly.totalScreenHours * 10) / 10}h`} />
                <SummaryCard label="Check-in" value={`${monthly.checkinsCompleted}`} />
                <SummaryCard label="Görev Tamamlama" value={`${monthly.tasksCompleted}/${monthly.tasksTotal}`} />
              </div>

              {monthly.byCategory?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Kategori Dağılımı</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={monthly.byCategory} layout="vertical">
                        <XAxis type="number" tickFormatter={(v) => formatDuration(v)} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                        <Tooltip formatter={(v: number) => formatDuration(v)} />
                        <Bar dataKey="minutes" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
