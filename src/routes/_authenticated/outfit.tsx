import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Shirt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useImageUrls, useItems, useOutfits } from "@/lib/wardrobe";
import { OutfitBoard } from "@/components/OutfitBoard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/outfit")({
  head: () => ({
    meta: [
      { title: "I miei outfit — Armadio" },
      { name: "description", content: "Gli outfit che hai salvato." },
      { property: "og:title", content: "I miei outfit — Armadio" },
      { property: "og:description", content: "Gli outfit che hai salvato." },
    ],
  }),
  component: OutfitsPage,
});

function OutfitsPage() {
  const qc = useQueryClient();
  const { data: outfits, isLoading } = useOutfits();
  const { data: items } = useItems();
  const { data: urls } = useImageUrls(items);

  async function wear(id: string, count: number) {
    const { error } = await supabase.from("outfits").update({ worn_count: count + 1, last_worn: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Segnato come indossato oggi");
    qc.invalidateQueries({ queryKey: ["outfits"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("outfits").delete().eq("id", id);
    if (error) { toast.error("Errore"); return; }
    qc.invalidateQueries({ queryKey: ["outfits"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">I miei outfit</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{outfits?.length ?? 0} outfit salvati</p>
        </div>
        <Button asChild className="h-11 rounded-full px-6 font-bold">
          <Link to="/crea-outfit">Crea outfit</Link>
        </Button>
      </div>

      {isLoading ? null : !outfits?.length ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-12 text-center">
          <p className="font-bold text-foreground">Ancora nessun outfit</p>
          <p className="mt-1 text-sm text-muted-foreground">Creane uno a mano o chiedi alla Chat AI.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((o) => {
            const its = (items ?? []).filter((i) => o.item_ids.includes(i.id));
            return (
              <article key={o.id} className="overflow-hidden rounded-3xl border border-border bg-card p-3">
                <OutfitBoard items={its} urls={urls} compact />
                <div className="px-2 pb-1 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-extrabold text-foreground">{o.name}</h2>
                      {o.occasion && (
                        <span className="mt-1 inline-block rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground">{o.occasion}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link to="/crea-outfit" search={{ id: o.id }} aria-label="Modifica" className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button aria-label="Elimina" className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare "{o.name}"?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full">Annulla</AlertDialogCancel>
                            <AlertDialogAction className="rounded-full bg-destructive text-destructive-foreground" onClick={() => remove(o.id)}>Elimina</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>
                      Indossato {o.worn_count} {o.worn_count === 1 ? "volta" : "volte"}
                      {o.last_worn ? ` · ultima ${new Date(o.last_worn).toLocaleDateString("it-IT")}` : ""}
                    </span>
                    <button onClick={() => wear(o.id, o.worn_count)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 font-bold text-foreground hover:border-primary">
                      <Shirt className="h-3.5 w-3.5" /> Oggi
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
