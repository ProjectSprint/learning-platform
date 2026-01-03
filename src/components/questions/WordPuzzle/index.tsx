import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { Button } from "@/components/ui/button";
import { DraggableWord } from "./DraggableWord";
import { MultiActorLayout } from "./MultiActorLayout";

interface Word {
  id: string;
  label: string;
  tooltip: string;
  category?: string;
}

interface Actor {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

interface WordPuzzleProps {
  actors: Actor[];
  availableWords: Word[];
  onSubmit: (sequences: string[][]) => void;
  isSubmitting?: boolean;
}

export function WordPuzzle({
  actors,
  availableWords,
  onSubmit,
  isSubmitting = false,
}: WordPuzzleProps) {
  // Calculate number of connections (actors - 1)
  const connectionCount = actors.length - 1;

  // State - one sequence per connection
  const [sequences, setSequences] = useState<Word[][]>(
    Array(connectionCount).fill([]).map(() => [])
  );
  const [pool, setPool] = useState<Word[]>(availableWords);
  const [activeWord, setActiveWord] = useState<Word | null>(null);
  const [activeSourceZone, setActiveSourceZone] = useState<number | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [hoveredWord, setHoveredWord] = useState<Word | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Prevent scroll conflicts
        tolerance: 5,
      },
    })
  );

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveWord(active.data.current as Word);

    // Find which zone the word is coming from
    for (let i = 0; i < sequences.length; i++) {
      if (sequences[i].some((w) => w.id === active.id)) {
        setActiveSourceZone(i);
        return;
      }
    }
    setActiveSourceZone(null); // Coming from pool
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveWord(null);
      setActiveSourceZone(null);
      setOverId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping on a drop zone (format: "drop-zone-0", "drop-zone-1", etc.)
    const dropZoneMatch = overId.match(/^drop-zone-(\d+)$/);
    const targetZoneIndex = dropZoneMatch ? parseInt(dropZoneMatch[1], 10) : null;

    // Find which sequence contains the active word
    let sourceZoneIndex: number | null = null;
    for (let i = 0; i < sequences.length; i++) {
      if (sequences[i].some((w) => w.id === activeId)) {
        sourceZoneIndex = i;
        break;
      }
    }

    const isInPool = pool.some((w) => w.id === activeId);

    if (targetZoneIndex !== null) {
      // Dropping on a drop zone
      if (isInPool) {
        // Move from pool to target zone
        const word = pool.find((w) => w.id === activeId);
        if (word) {
          const newSequences = [...sequences];
          newSequences[targetZoneIndex] = [...newSequences[targetZoneIndex], word];
          setSequences(newSequences);
          setPool(pool.filter((w) => w.id !== activeId));
        }
      } else if (sourceZoneIndex !== null) {
        if (sourceZoneIndex === targetZoneIndex) {
          // Reordering within same zone
          const sequence = sequences[sourceZoneIndex];
          const targetWord = sequence.find((w) => w.id === overId);

          if (targetWord) {
            const oldIndex = sequence.findIndex((w) => w.id === activeId);
            const newIndex = sequence.findIndex((w) => w.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
              const newSequences = [...sequences];
              newSequences[sourceZoneIndex] = arrayMove(sequence, oldIndex, newIndex);
              setSequences(newSequences);
            }
          }
        } else {
          // Moving between zones
          const word = sequences[sourceZoneIndex].find((w) => w.id === activeId);
          if (word) {
            const newSequences = [...sequences];
            newSequences[sourceZoneIndex] = newSequences[sourceZoneIndex].filter(
              (w) => w.id !== activeId
            );
            newSequences[targetZoneIndex] = [...newSequences[targetZoneIndex], word];
            setSequences(newSequences);
          }
        }
      }
    } else if (sourceZoneIndex !== null) {
      // Dropping outside zones - return to pool
      const word = sequences[sourceZoneIndex].find((w) => w.id === activeId);
      if (word) {
        const newSequences = [...sequences];
        newSequences[sourceZoneIndex] = newSequences[sourceZoneIndex].filter(
          (w) => w.id !== activeId
        );
        setSequences(newSequences);
        setPool([...pool, word]);
      }
    }

    setActiveWord(null);
    setActiveSourceZone(null);
    setOverId(null);

    // Restore focus (accessibility)
    setTimeout(() => {
      const element = document.querySelector(
        `[data-word-id="${activeId}"]`
      ) as HTMLElement;
      element?.focus();
    }, 0);
  };

  const handleDragCancel = () => {
    setActiveWord(null);
    setActiveSourceZone(null);
    setOverId(null);
  };

  const handleSubmit = () => {
    const sequenceIds = sequences.map((seq) => seq.map((w) => w.id));
    onSubmit(sequenceIds);
  };

  const handleReset = () => {
    setSequences(Array(connectionCount).fill([]).map(() => []));
    setPool(availableWords);
  };

  // Check if any sequence has words
  const hasAnyWords = sequences.some((seq) => seq.length > 0);

  // Determine which zones are being hovered over
  const isOverZones = sequences.map((_, index) => overId === `drop-zone-${index}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up word: ${(active.data.current as Word)?.label}`,
          onDragOver: ({ active, over }) =>
            over
              ? `Moving ${(active.data.current as Word)?.label} over drop zone`
              : "",
          onDragEnd: ({ active, over }) =>
            over
              ? `Placed ${(active.data.current as Word)?.label}`
              : `Returned ${(active.data.current as Word)?.label} to available words`,
          onDragCancel: ({ active }) =>
            `Cancelled dragging ${(active.data.current as Word)?.label}`,
        },
      }}
    >
      <div className="space-y-6">
        {/* Multi-Actor Layout */}
        <MultiActorLayout
          actors={actors}
          sequences={sequences}
          isOverZones={isOverZones}
          isDragging={activeWord !== null}
          onHoverWord={setHoveredWord}
        />

        {/* Available Words Pool */}
        <div>
          <p className="text-sm text-gray-400 mb-3">Available Words:</p>
          <div
            role="region"
            aria-label="Available words to drag"
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            {pool.map((word) => (
              <DraggableWord
                key={word.id}
                word={word}
                onHover={setHoveredWord}
              />
            ))}
          </div>
          {pool.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              All words have been used
            </p>
          )}
        </div>

        {/* Tooltip/Explanation Zone */}
        {hoveredWord && (
          <div className="border border-slate-600 rounded-lg p-4 bg-slate-800">
            <p className="text-sm font-medium text-white mb-1">
              {hoveredWord.label}
            </p>
            <p className="text-sm text-gray-400">{hoveredWord.tooltip}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnyWords}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {isSubmitting ? "Submitting..." : "Submit Answer"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting || !hasAnyWords}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Drag Overlay (ghost preview) */}
      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {activeWord && (
          <div className="bg-slate-800 border-2 border-primary rounded-lg p-3 text-sm font-medium text-white opacity-80 scale-105 shadow-2xl cursor-grabbing">
            {activeWord.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
