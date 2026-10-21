import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { CATEGORIES, saveOutfit, useImageUrls, useItems, useOutfits, type Category } from "@/lib/wardrobe";
import { OutfitBoard } from "@/components/OutfitBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/crea-outfit")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Crea Outfit — Armadio" },
      { name: "description", content: "Combina i tuoi capi e salva un nuovo outfit." },
      { property: "og:title", content: "Crea Outfit — Armadio" },
      { property: "og:description", content: "Combina i tuoi capi e salva un nuovo outfit." },
    ],
  }),
  component: CreateOutfit,
});

function CreateOutfit() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: items } = useItems();
  const { data: outfits } = useOutfits();
  const { data: urls } = useImageUrls(items);
  const [cat, setCat] = useState<Category | "tutti">("tutti");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [saving, setSaving] = useState(false);

  const editing = outfits?.find((o) => o.id === id);
  useEffect(() => {
    if (editing) {
      setSelected(editing.item_ids);
      setName(editing.name);
      setOccasion(editing.occasion ?? "");
    }
  }, [editing]);

  const list = useMemo(() => (items ?? []).filter((i) => cat === "tutti" || i.category === cat), [items, cat]);
  const chosen = useMemo(() => (items ?? []).filter((i) => selected.includes(i.id)), [items, selected]);

  const toggle = (itemId: string) =>
    setSelected((s) => (s.includes(itemId) ? s.filter((x) => x !== itemId) : [...s, itemId]));

  async function save() {
    if (!name.trim()) return toast.error("Dai un nome all'outfit");
    if (selected.length < 2) return toast.error("Scegli almeno 2 capi");
    setSaving(true);
    try {
      await saveOutfit({ id, name: name.trim().slice(0, 80), occasion: occasion.trim().slice(0, 60) || null, item_ids: selected });
      toast.success("Outfit salvato");
      qc.invalidateQueries({ queryKey: ["outfits"] });
      navigate({ to: "/outfit" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{editing ? "Modifica outfit" : "Crea outfit"}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="order-2 lg:order-1">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {[{ value: "tutti" as const, label: "Tutti" }, ...CATEGORIES].map((p) => (
              <button
                key={p.value}
                onClick={() => setCat(p.value)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-bold",
                  cat === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">Nessun capo in questa categoria.</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {list.map((i) => {
                const on = selected.includes(i.id);
                return (
                  <button
                    key={i.id}
                    onClick={() => toggle(i.id)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border-2 bg-surface p-2 text-left transition",
                      on ? "border-primary" : "border-transparent hover:border-border",
                    )}
                  >
                    <div className="aspect-square">
                      {urls?.[i.image_path] && <img src={urls[i.image_path]} alt={i.name} className="h-full w-full object-contain" />}
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-foreground dark:text-background">{i.name}</p>
                    {on && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="order-1 space-y-3 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          <OutfitBoard items={chosen} urls={urls} onRemove={toggle} />
          <Input placeholder="Nome outfit" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-11 rounded-full px-5" />
          <Input placeholder="Occasione (es. pranzo informale)" value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={60} className="h-11 rounded-full px-5" />
          <Button onClick={save} disabled={saving} className="h-12 w-full rounded-full text-base font-bold">
            {saving ? "Salvataggio…" : "Salva outfit"}
          </Button>
        </aside>
      </div>
    </div>
  );
}
