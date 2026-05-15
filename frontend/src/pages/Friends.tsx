import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { friends } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, ChevronRight, ArrowLeft, Trash2, PlusCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function Friends() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <FriendDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <FriendList onSelect={setSelectedId} />;
}

function FriendList({ onSelect }: { onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", relationshipType: "", proximityLabel: "" });

  const { data: friendList = [] } = useQuery({ queryKey: ["friends"], queryFn: friends.list });

  const createMutation = useMutation({
    mutationFn: (data: any) => friends.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friends"] }); setShowForm(false); setForm({ name: "", description: "", relationshipType: "", proximityLabel: "" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => friends.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arkadaşlar</h1>
          <p className="text-muted-foreground">Sosyal hafızan</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> Kişi Ekle
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Yeni Kişi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>İsim *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>İlişki Tipi</Label>
                <Input placeholder="yakın arkadaş, sınıf arkadaşı..." value={form.relationshipType} onChange={(e) => setForm((f) => ({ ...f, relationshipType: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Kısa Tanım</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="min-h-[60px]" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!form.name || createMutation.isPending} onClick={() => createMutation.mutate(form)}>Kaydet</Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {friendList.length === 0 && <p className="text-sm text-muted-foreground">Henüz kişi eklenmedi</p>}
        {friendList.map((f: any) => (
          <div key={f.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onSelect(f.id)}>
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {f.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.relationshipType ?? "Arkadaş"}
                {f.lastContactAt ? ` · son görüşme: ${formatDate(f.lastContactAt)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{f._count?.memories ?? 0} anı</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [memForm, setMemForm] = useState({ content: "", date: new Date().toISOString().slice(0, 16), tags: "" });

  const { data: friendList = [] } = useQuery({ queryKey: ["friends"], queryFn: friends.list });
  const friend = (friendList as any[]).find((f: any) => f.id === id);

  const { data: memories = [] } = useQuery({
    queryKey: ["friends", id, "memories"],
    queryFn: () => friends.memories(id),
  });

  const addMemoryMutation = useMutation({
    mutationFn: (data: any) => friends.addMemory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends", id, "memories"] });
      setShowMemoryForm(false);
      setMemForm({ content: "", date: new Date().toISOString().slice(0, 16), tags: "" });
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: (memId: string) => friends.removeMemory(id, memId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends", id, "memories"] }),
  });

  if (!friend) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{friend.name}</h1>
          <p className="text-muted-foreground">{friend.relationshipType ?? "Arkadaş"}</p>
        </div>
      </div>

      {friend.description && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">{friend.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Anılar & Notlar</h2>
        <Button size="sm" onClick={() => setShowMemoryForm(!showMemoryForm)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Anı Ekle
        </Button>
      </div>

      {showMemoryForm && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label>Not / Anı *</Label>
              <Textarea value={memForm.content} onChange={(e) => setMemForm((f) => ({ ...f, content: e.target.value }))} className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tarih</Label>
                <Input type="datetime-local" value={memForm.date} onChange={(e) => setMemForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Etiketler (virgülle ayır)</Label>
                <Input value={memForm.tags} onChange={(e) => setMemForm((f) => ({ ...f, tags: e.target.value }))} placeholder="buluşma, proje, film..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!memForm.content || addMemoryMutation.isPending}
                onClick={() => addMemoryMutation.mutate({
                  content: memForm.content,
                  date: new Date(memForm.date).toISOString(),
                  tags: memForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
                })}>
                Kaydet
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowMemoryForm(false)}>İptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(memories as any[]).length === 0 && <p className="text-sm text-muted-foreground">Henüz anı eklenmedi</p>}
        {(memories as any[]).map((mem: any) => (
          <div key={mem.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm">{mem.content}</p>
              <button onClick={() => deleteMemoryMutation.mutate(mem.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted-foreground">{formatDate(mem.date)}</span>
              {mem.tags?.map((tag: string) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
