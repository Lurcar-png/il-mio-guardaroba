import type { Item } from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

/** Arranges an outfit's items like a flat-lay: tops, bottoms, shoes in the center, accessories on the side. */
export function OutfitBoard({
  items,
  urls,
  onRemove,
  className,
  compact,
}: {
  items: Item[];
  urls: Record<string, string> | undefined;
  onRemove?: (id: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const tops = items.filter((i) => ["giubbotti", "felpe", "maglie"].includes(i.category));
  const bottoms = items.filter((i) => i.category === "pantaloni");
  const shoes = items.filter((i) => i.category === "scarpe");
  const acc = items.filter((i) => i.category === "accessori");
  const center = [...tops, ...bottoms, ...shoes];

  const Tile = ({ item, big }: { item: Item; big?: boolean }) => (
    <div className={cn("group relative flex items-center justify-center", big ? "flex-1 min-h-0" : "")}>
      {urls?.[item.image_path] ? (
        <img
          src={urls[item.image_path]}
          alt={item.name}
          className={cn("max-h-full max-w-full object-contain drop-shadow-sm", !big && "h-full")}
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full rounded-xl bg-muted" />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs text-background group-hover:flex"
          aria-label={`Rimuovi ${item.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );

  if (items.length === 0) {
    return (
      <div className={cn("flex aspect-[4/5] items-center justify-center rounded-3xl bg-surface p-6 text-center text-sm text-muted-foreground", className)}>
        Scegli i capi dal guardaroba per comporre l'outfit
      </div>
    );
  }

  return (
    <div className={cn("flex aspect-[4/5] gap-3 rounded-3xl bg-surface", compact ? "p-3" : "p-6", className)}>
      <div className="flex min-w-0 flex-[3] flex-col gap-2">
        {center.map((i) => (
          <Tile key={i.id} item={i} big />
        ))}
      </div>
      {acc.length > 0 && (
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          {acc.map((i) => (
            <div key={i.id} className="h-1/4">
              <Tile item={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
