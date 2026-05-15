import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { screenTime } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Clock, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatDuration, todayISO } from "@/lib/utils";

export default function ScreenTime() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(todayISO());
  const [uploading, setUploading] = useState(false);

  const { data: uploads = [] } = useQuery({
    queryKey: ["screen-time"],
    queryFn: () => screenTime.list(),
    refetchInterval: (data) => {
      const hasPending = (data as any[])?.some((u: any) => u.status === "PENDING" || u.status === "PROCESSING");
      return hasPending ? 3000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => screenTime.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screen-time"] }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await screenTime.upload(file, date);
      qc.invalidateQueries({ queryKey: ["screen-time"] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const totalByApp = (uploads as any[])
    .flatMap((u: any) => u.entries ?? [])
    .reduce((acc: Record<string, number>, e: any) => {
      acc[e.appName] = (acc[e.appName] ?? 0) + e.durationMin;
      return acc;
    }, {});

  const sorted = Object.entries(totalByApp).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxMin = sorted[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ekran Süresi</h1>

      {/* Upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ekran Görüntüsü Yükle</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
            <p className="text-sm">{uploading ? "Yükleniyor..." : "Ekran görüntüsünü buraya tıkla veya sürükle"}</p>
            <p className="text-xs">PNG, JPG (maks 10 MB)</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </CardContent>
      </Card>

      {/* App breakdown */}
      {sorted.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Uygulama Kullanımı (Toplam)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sorted.map(([app, min]) => (
              <div key={app} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{app}</span>
                  <span className="text-muted-foreground">{formatDuration(min)}</span>
                </div>
                <Progress value={(min / maxMin) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload history */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Yükleme Geçmişi</h2>
        {(uploads as any[]).length === 0 && <p className="text-sm text-muted-foreground">Henüz yükleme yok</p>}
        {(uploads as any[]).map((u: any) => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <StatusIcon status={u.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{u.filename}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(u.date).toLocaleDateString("tr-TR")} · {u.entries?.length ?? 0} uygulama
              </p>
            </div>
            <button onClick={() => deleteMutation.mutate(u.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "DONE") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "FAILED") return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
}
