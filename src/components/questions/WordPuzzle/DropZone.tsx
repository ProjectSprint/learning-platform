import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableWord } from "./SortableWord";

interface Word {
  id: string;
  label: string;
  tooltip: string;
  category?: string;
}

interface DropZoneProps {
  id?: string;
  words: Word[];
  isOver?: boolean;
  onHoverWord?: (word: Word | null) => void;
}

export function DropZone({ id = "drop-zone", words, isOver, onHoverWord }: DropZoneProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  const isEmpty = words.length === 0;

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label="Word sequence (order matters)"
      aria-live="polite"
      aria-atomic="true"
      className={`
        min-h-[120px] p-4 rounded-lg
        transition-all duration-200 ease-in-out
        ${
          isEmpty
            ? "border-2 border-dashed border-slate-600 bg-slate-800/30"
            : "border-2 border-solid border-slate-500 bg-slate-800/50"
        }
        ${
          isOver
            ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            : ""
        }
      `}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-400">
            Drag words here to build your sequence
          </p>
        </div>
      ) : (
        <SortableContext
          items={words.map((w) => w.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-2">
            {words.map((word, index) => (
              <SortableWord
                key={word.id}
                word={word}
                position={index + 1}
                onHover={onHoverWord}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
