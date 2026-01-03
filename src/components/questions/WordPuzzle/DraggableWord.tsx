import { useDraggable } from "@dnd-kit/core";

interface Word {
  id: string;
  label: string;
  tooltip: string;
  category?: string;
}

interface DraggableWordProps {
  word: Word;
  onHover?: (word: Word | null) => void;
}

export function DraggableWord({ word, onHover }: DraggableWordProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: word.id,
    data: word,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`${word.label}. ${word.tooltip}`}
      aria-grabbed={isDragging}
      tabIndex={0}
      onMouseEnter={() => onHover?.(word)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(word)}
      onBlur={() => onHover?.(null)}
      className={`
        border rounded-lg p-3 text-sm font-medium
        transition-all duration-200 ease-in-out
        ${
          isDragging
            ? "opacity-40 cursor-grabbing"
            : "hover:bg-slate-700 cursor-grab"
        }
        bg-slate-800 border-slate-600 text-white
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
      `}
      data-word-id={word.id}
    >
      {word.label}
    </button>
  );
}
