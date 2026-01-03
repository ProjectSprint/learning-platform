import { DropZone } from "./DropZone";
import { ConnectionIndicator } from "@/components/game/ConnectionIndicator";

interface Actor {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

interface Word {
  id: string;
  label: string;
  tooltip: string;
  category?: string;
}

interface MultiActorLayoutProps {
  actors: Actor[];
  sequences: Word[][]; // Array of sequences, one per connection
  isOverZones?: boolean[]; // Array of booleans, one per drop zone
  isDragging?: boolean;
  onHoverWord?: (word: Word | null) => void;
}

export function MultiActorLayout({
  actors,
  sequences,
  isOverZones = [],
  isDragging,
  onHoverWord,
}: MultiActorLayoutProps) {
  const actorCount = actors.length;

  // Actor Card component
  const ActorCard = ({ actor, size = "normal" }: { actor: Actor; size?: "normal" | "small" }) => (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg ${size === "small" ? "p-3" : "p-4"}`}>
      {actor.imageUrl && (
        <img
          src={actor.imageUrl}
          alt={actor.description}
          className={`w-full ${size === "small" ? "h-24" : "h-32"} object-cover rounded mb-3`}
          loading="lazy"
        />
      )}
      <h3 className={`font-semibold ${size === "small" ? "text-base" : "text-lg"} text-white mb-1`}>
        {actor.name}
      </h3>
      <p className={`${size === "small" ? "text-xs" : "text-sm"} text-gray-400`}>{actor.description}</p>
    </div>
  );

  // Connection with drop zone
  const Connection = ({ index, horizontal = false }: { index: number; horizontal?: boolean }) => {
    const hasSequence = sequences[index]?.length > 0;

    return (
      <div className={`relative ${horizontal ? "" : "flex flex-col items-center gap-3"}`}>
        {horizontal ? (
          <>
            {/* Left connection indicator */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 hidden md:flex items-center gap-2">
              <div className="text-cyan-400 text-2xl">←</div>
              <ConnectionIndicator
                result={hasSequence ? "neutral" : "neutral"}
                size="md"
                className={isDragging ? "animate-pulse" : ""}
              />
            </div>

            {/* Drop Zone */}
            <DropZone
              id={`drop-zone-${index}`}
              words={sequences[index] || []}
              isOver={isOverZones[index]}
              onHoverWord={onHoverWord}
            />

            {/* Right connection indicator */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 hidden md:flex items-center gap-2">
              <ConnectionIndicator
                result={hasSequence ? "neutral" : "neutral"}
                size="md"
                className={isDragging ? "animate-pulse" : ""}
              />
              <div className="text-cyan-400 text-2xl">→</div>
            </div>
          </>
        ) : (
          <>
            {/* Vertical connection */}
            <div className="flex items-center gap-2">
              <div className="text-cyan-400 text-2xl">↓</div>
              <ConnectionIndicator
                result={hasSequence ? "neutral" : "neutral"}
                size="md"
                className={isDragging ? "animate-pulse" : ""}
              />
            </div>
            <DropZone
              id={`drop-zone-${index}`}
              words={sequences[index] || []}
              isOver={isOverZones[index]}
              onHoverWord={onHoverWord}
            />
          </>
        )}
      </div>
    );
  };

  // 2 Actors: Side by side (horizontal)
  if (actorCount === 2) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <ActorCard actor={actors[0]} />
          <Connection index={0} horizontal />
          <ActorCard actor={actors[1]} />
        </div>
      </div>
    );
  }

  // 3 Actors: Reverse triangle (1 top, 2 bottom)
  if (actorCount === 3) {
    return (
      <div className="mb-8">
        <div className="flex flex-col gap-4">
          {/* Top actor */}
          <div className="flex justify-center">
            <div className="w-full max-w-xs">
              <ActorCard actor={actors[0]} size="small" />
            </div>
          </div>

          {/* Connection from actor 1 to actor 2 */}
          <div className="flex justify-center">
            <Connection index={0} />
          </div>

          {/* Bottom two actors with connection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <ActorCard actor={actors[1]} size="small" />
            <Connection index={1} horizontal />
            <ActorCard actor={actors[2]} size="small" />
          </div>
        </div>
      </div>
    );
  }

  // 4 Actors: Square (2x2 grid)
  if (actorCount === 4) {
    return (
      <div className="mb-8">
        <div className="flex flex-col gap-4">
          {/* Top row: Actor 1 → Actor 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <ActorCard actor={actors[0]} size="small" />
            <Connection index={0} horizontal />
            <ActorCard actor={actors[1]} size="small" />
          </div>

          {/* Connection from actor 2 to actor 3 */}
          <div className="flex justify-center md:justify-end md:pr-12">
            <Connection index={1} />
          </div>

          {/* Bottom row: Actor 3 → Actor 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <ActorCard actor={actors[2]} size="small" />
            <Connection index={2} horizontal />
            <ActorCard actor={actors[3]} size="small" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback for invalid actor count
  return (
    <div className="mb-8 p-4 bg-red-900/20 border border-red-700 rounded-lg">
      <p className="text-red-400">
        Invalid number of actors ({actorCount}). Must be between 2 and 4.
      </p>
    </div>
  );
}
