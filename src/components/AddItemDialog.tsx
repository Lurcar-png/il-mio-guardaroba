import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Wand2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type Category } from "@/lib/wardrobe";
import { streamImage } from "@/lib/stream-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shrinks big phone photos before sending them to the AI (faster, cheaper). */
async function resizeImage(file: File, max = 1536): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/jpeg", 0.9));
}

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
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiFinal, setAiFinal] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [category, setCategory] = useState<Category>(defaultCategory ?? "maglie");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null); setPreview(null); setAiImage(null); setAiFinal(false); setUseAi(true);
      setName(""); setBrand(""); setColor(""); setStyle("");
      setCategory(defaultCategory ?? "maglie");
    }
  }, [open, defaultCategory]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setAiImage(null);
    setAiFinal(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function makeCatalogPhoto() {
    if (!file) return;
    setGenerating(true);
    setAiFinal(false);
    try {
      const { data } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("image", await resizeImage(file), "capo.jpg");
      form.append("name", name.trim());
      form.append("brand", brand.trim());
      form.append("category", category);
      await streamImage(
        "/api/clean-image",
        form,
        (src, isFinal) => {
          setAiImage(src);
          setAiFinal(isFinal);
        },
        undefined,
        { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      );
      setUseAi(true);
    } catch (err) {
      console.error(err);
      setAiImage(null);
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("402") ? "Crediti AI esauriti" : msg.includes("429") ? "Troppe richieste, riprova tra poco" : "Non sono riuscito a creare la foto, puoi usare l'originale",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Scegli una foto"); return; }
    if (!name.trim()) { toast.error("Dai un nome al capo"); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non sei collegato");
      const useCatalog = useAi && aiFinal && aiImage;
      const body: Blob = useCatalog ? await (await fetch(aiImage)).blob() : await resizeImage(file, 1600);
      const ext = useCatalog ? "png" : "jpg";
      const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("wardrobe").upload(path, body, { contentType: useCatalog ? "image/png" : "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await supabase.from("items").insert({
        name: name.trim().slice(0, 80),
        brand: brand.trim().slice(0, 40) || null,
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

  const shown = useAi && aiImage ? aiImage : preview;

  return (
    <Dialog open={open} onOpenChange={(o) => !generating && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold">Aggiungi vestiti</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
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
          <Input placeholder="Marchio (es. Nike, Zara…)" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={40} className="h-11 rounded-full px-5" />

          <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-surface">
            {shown ? (
              <img
                src={shown}
                alt="Anteprima"
                className={cn(
                  "h-full w-full object-contain p-4 transition-[filter] duration-500",
                  useAi && aiImage && !aiFinal ? "blur-2xl" : "blur-0",
                )}
              />
            ) : (
              <div className="text-center text-surface-foreground/60">
                <ImagePlus className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm font-bold">Carica una foto</p>
              </div>
            )}
            {generating && (
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
                Creo la foto da catalogo…
              </span>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={generating} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          {file && (
            <div className="flex flex-wrap gap-2">
              {!aiImage || !aiFinal ? (
                <Button type="button" onClick={makeCatalogPhoto} disabled={generating} className="h-11 flex-1 rounded-full font-bold">
                  <Wand2 className="mr-1 h-4 w-4" /> {generating ? "Attendi…" : "Crea foto da catalogo con AI"}
                </Button>
              ) : (
                <>
                  <div className="flex flex-1 rounded-full bg-secondary p-1">
                    {[true, false].map((v) => (
                      <button
                        type="button"
                        key={String(v)}
                        onClick={() => setUseAi(v)}
                        className={cn(
                          "flex-1 rounded-full py-2 text-sm font-bold",
                          useAi === v ? "bg-primary text-primary-foreground" : "text-secondary-foreground",
                        )}
                      >
                        {v ? "Foto AI" : "Originale"}
                      </button>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={makeCatalogPhoto} className="h-11 rounded-full font-bold" aria-label="Rifai foto AI">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
          {file && !aiImage && !generating && (
            <p className="text-xs text-muted-foreground">
              Inserisci nome e marchio prima: l'AI scontorna il capo, lo stira e lo mette in posa come nelle foto dei negozi online.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Colore" value={color} onChange={(e) => setColor(e.target.value)} maxLength={40} className="h-11 rounded-full px-5" />
            <Input placeholder="Stile (es. casual)" value={style} onChange={(e) => setStyle(e.target.value)} maxLength={40} className="h-11 rounded-full px-5" />
          </div>
          <Button type="submit" disabled={saving || generating} className="h-12 w-full rounded-full text-base font-bold">
            {saving ? "Salvataggio…" : "Salva capo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
