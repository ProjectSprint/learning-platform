import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Word {
  id: string;
  label: string;
  tooltip: string;
  category?: string;
}

interface SortableWordProps {
  word: Word;
  position: number;
  onHover?: (word: Word | null) => void;
}

export function SortableWord({ word, position, onHover }: SortableWordProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: word.id,
    data: word,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-label={`Position ${position}: ${word.label}`}
      aria-describedby={`tooltip-${word.id}`}
      tabIndex={0}
      onMouseEnter={() => onHover?.(word)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(word)}
      onBlur={() => onHover?.(null)}
      className={`
        relative flex items-center gap-2 p-3 rounded-lg
        transition-all duration-200 ease-in-out
        ${
          isDragging
            ? "opacity-50 z-50 cursor-grabbing"
            : "cursor-grab hover:bg-slate-700"
        }
        bg-slate-800 border-2 border-slate-600 text-white
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
      `}
      data-word-id={word.id}
    >
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
        {position}
      </span>
      <span className="text-sm font-medium">{word.label}</span>
      <span id={`tooltip-${word.id}`} className="sr-only">
        {word.tooltip}
      </span>
    </div>
  );
}
