import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type Category } from "@/lib/wardrobe";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddItemDialog({
  open,
  onOpenChange,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultCategory?: Category | undefined;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>(defaultCategory ?? "maglie");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null); setPreview(null); setName(""); setColor(""); setStyle("");
      setCategory(defaultCategory ?? "maglie");
    }
  }, [open, defaultCategory]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Scegli una foto"); return; }
    if (!name.trim()) { toast.error("Dai un nome al capo"); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non sei collegato");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("wardrobe").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("items").insert({
        name: name.trim().slice(0, 80),
        category,
        color: color.trim().slice(0, 40) || null,
        style: style.trim().slice(0, 40) || null,
        image_path: path,
      });
      if (error) {
        await supabase.storage.from("wardrobe").remove([path]);
        throw error;
      }
      toast.success("Capo aggiunto");
      qc.invalidateQueries({ queryKey: ["items"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold">Aggiungi vestiti</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-surface">
            {preview ? (
              <img src={preview} alt="Anteprima" className="h-full w-full object-contain p-4" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImagePlus className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm font-bold">Carica una foto</p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-bold",
                  category === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Input placeholder="Nome (es. Felpa grigia oversize)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-11 rounded-full px-5" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Colore" value={color} onChange={(e) => setColor(e.target.value)} maxLength={40} className="h-11 rounded-full px-5" />
            <Input placeholder="Stile (es. casual)" value={style} onChange={(e) => setStyle(e.target.value)} maxLength={40} className="h-11 rounded-full px-5" />
          </div>
          <Button type="submit" disabled={saving} className="h-12 w-full rounded-full text-base font-bold">
            {saving ? "Salvataggio…" : "Salva capo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
