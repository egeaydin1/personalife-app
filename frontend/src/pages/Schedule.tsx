import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courses, calendar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const FULL_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export default function Schedule() {
  const qc = useQueryClient();
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: "", teacher: "", room: "", color: "#6366f1",
    daysOfWeek: [] as number[], startTime: "09:00", endTime: "10:30",
    semesterStart: "", semesterEnd: "",
  });

  const { data: courseList = [] } = useQuery({ queryKey: ["courses"], queryFn: courses.list });

  const createCourseMutation = useMutation({
    mutationFn: (data: any) => courses.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses"] }); setShowCourseForm(false); },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => courses.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });

  function toggleDay(d: number) {
    setCourseForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d],
    }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ders Programı & Takvim</h1>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Dersler</TabsTrigger>
          <TabsTrigger value="calendar">Takvim</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4 mt-4">
          <Button size="sm" onClick={() => setShowCourseForm(!showCourseForm)}>
            <Plus className="mr-2 h-4 w-4" /> Ders Ekle
          </Button>

          {showCourseForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">Yeni Ders</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Ders Adı *</Label>
                    <Input value={courseForm.name} onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Öğretmen</Label>
                    <Input value={courseForm.teacher} onChange={(e) => setCourseForm((f) => ({ ...f, teacher: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Sınıf / Yer</Label>
                    <Input value={courseForm.room} onChange={(e) => setCourseForm((f) => ({ ...f, room: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Renk</Label>
                    <Input type="color" value={courseForm.color} onChange={(e) => setCourseForm((f) => ({ ...f, color: e.target.value }))} className="h-10 cursor-pointer" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Günler</Label>
                  <div className="flex gap-1">
                    {DAYS.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          courseForm.daysOfWeek.includes(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Başlangıç</Label>
                    <Input type="time" value={courseForm.startTime} onChange={(e) => setCourseForm((f) => ({ ...f, startTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Bitiş</Label>
                    <Input type="time" value={courseForm.endTime} onChange={(e) => setCourseForm((f) => ({ ...f, endTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Dönem Başlangıç</Label>
                    <Input type="date" value={courseForm.semesterStart} onChange={(e) => setCourseForm((f) => ({ ...f, semesterStart: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Dönem Bitiş</Label>
                    <Input type="date" value={courseForm.semesterEnd} onChange={(e) => setCourseForm((f) => ({ ...f, semesterEnd: e.target.value }))} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" disabled={!courseForm.name || createCourseMutation.isPending}
                    onClick={() => createCourseMutation.mutate({
                      ...courseForm,
                      semesterStart: courseForm.semesterStart ? new Date(courseForm.semesterStart).toISOString() : new Date().toISOString(),
                      semesterEnd: courseForm.semesterEnd ? new Date(courseForm.semesterEnd).toISOString() : new Date(Date.now() + 180 * 86400000).toISOString(),
                    })}>
                    Kaydet
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCourseForm(false)}>İptal</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {courseList.length === 0 && <p className="text-sm text-muted-foreground">Henüz ders eklenmedi</p>}
            {courseList.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color ?? "#6366f1" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.daysOfWeek.map((d: number) => DAYS[d]).join(", ")} · {c.startTime}–{c.endTime}
                    {c.room ? ` · ${c.room}` : ""}
                    {c.teacher ? ` · ${c.teacher}` : ""}
                  </p>
                </div>
                <button onClick={() => deleteCourseMutation.mutate(c.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <CalendarTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CalendarTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", startAt: "", endAt: "" });

  const now = new Date();
  const { data: events = [] } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => calendar.list({
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString(),
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => calendar.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); setShowForm(false); },
  });

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm(!showForm)}>
        <Plus className="mr-2 h-4 w-4" /> Etkinlik Ekle
      </Button>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label>Başlık *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Başlangıç *</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Bitiş *</Label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!form.title || !form.startAt || !form.endAt || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() })}>
                Kaydet
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {events.length === 0 && <p className="text-sm text-muted-foreground">Takvim boş</p>}
        {events.map((e: any) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10">
              <span className="text-xs text-primary">{new Date(e.startAt).toLocaleDateString("tr-TR", { month: "short" })}</span>
              <span className="text-sm font-bold text-primary">{new Date(e.startAt).getDate()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.startAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} –{" "}
                {new Date(e.endAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
