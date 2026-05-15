import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasks } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = { TODO: "Yapılacak", IN_PROGRESS: "Devam Ediyor", DONE: "Tamamlandı", CANCELLED: "İptal" };
const PRIORITY_LABELS: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" };
const PRIORITY_COLORS: Record<string, string> = { LOW: "secondary", MEDIUM: "secondary", HIGH: "default", URGENT: "destructive" };

export default function Tasks() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", deadline: "" });

  const { data: taskList = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasks.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => tasks.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setForm({ title: "", description: "", priority: "MEDIUM", deadline: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function toggleStatus(task: any) {
    const next = task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : "TODO";
    updateMutation.mutate({ id: task.id, data: { status: next } });
  }

  const grouped = {
    active: taskList.filter((t: any) => t.status === "TODO" || t.status === "IN_PROGRESS"),
    done: taskList.filter((t: any) => t.status === "DONE" || t.status === "CANCELLED"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Görevler</h1>
          <p className="text-muted-foreground">{grouped.active.length} aktif görev</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Görev
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Yeni Görev Ekle</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Başlık *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Öncelik</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Deadline</Label>
                <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate({ ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined })} disabled={!form.title || createMutation.isPending}>
                Kaydet
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {grouped.active.length === 0 && <p className="text-sm text-muted-foreground">Aktif görev yok</p>}
        {grouped.active.map((task: any) => (
          <TaskRow key={task.id} task={task} onToggle={() => toggleStatus(task)} onDelete={() => deleteMutation.mutate(task.id)} />
        ))}
      </div>

      {grouped.done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Tamamlananlar ({grouped.done.length})
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {grouped.done.map((task: any) => (
              <TaskRow key={task.id} task={task} onToggle={() => toggleStatus(task)} onDelete={() => deleteMutation.mutate(task.id)} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: any; onToggle: () => void; onDelete: () => void }) {
  const done = task.status === "DONE" || task.status === "CANCELLED";
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <button onClick={onToggle} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary">
        {done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", done && "line-through text-muted-foreground")}>{task.title}</p>
        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
        <div className="mt-1 flex flex-wrap gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            { LOW: "bg-gray-100 text-gray-600", MEDIUM: "bg-blue-100 text-blue-700", HIGH: "bg-orange-100 text-orange-700", URGENT: "bg-red-100 text-red-700" }[task.priority as string] ?? ""
          }`}>
            {{ LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" }[task.priority as string] ?? task.priority}
          </span>
          {task.deadline && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {new Date(task.deadline).toLocaleDateString("tr-TR")}
            </span>
          )}
          {task.course && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{task.course.name}</span>
          )}
        </div>
      </div>
      <button onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
