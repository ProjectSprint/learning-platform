# Component Standards (src/components)

React components for the DevLingo UI.

## Workflow
For new features or architectural changes, propose updates to this file first. Wait for approval before implementing.

## Directory Structure

Organize by domain:
- `ui/` — shadcn/ui primitives (don't modify)
- `questions/` — Question type components
- `game/` — Rank, XP, session UI
- `grading/` — Admin grading interface

## Question Components

### Word Puzzle

Drag-and-drop interface for arranging words in sequence. Uses @dnd-kit/core for modern, accessible interactions.

- Visual layout: `Actor A Card ← [Drop Zone: Word Sequence] → Actor B Card`
- Two actors positioned on sides (left and right)
- Center drop zone for word sequence that connects both actors
- Connection indicators shown on both sides of drop zone
- Example: "Database ← [SQL, Query, API] → Frontend"
- Two actors is neeeded at minimum
- For 3+ actors: Use vertical stack layout or circular arrangement

#### Drag-and-Drop Requirements

**Library:** @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
- Modern, TypeScript-first, React 19 compatible
- Built-in accessibility features

**Interaction Modes:**
1. **Mouse**: 8px activation distance (prevents accidental drags)
2. **Touch**: 250ms delay + 5px tolerance (prevents scroll conflicts)
3. **Keyboard**: Full arrow key reordering + Space/Enter for pick/drop

**Drop Zone:**
- Visual states: empty (dashed border), drag-over (cyan glow), populated (solid border)
- Shows insertion indicator (blue vertical line) when dragging between words
- Supports reordering within sequence (horizontal sortable container)
- Displays position numbers (1, 2, 3...) for each word in sequence
- Wraps on long sequences with `flex-wrap`

**Word Chips:**
- Draggable from available pool
- Sortable within drop zone sequence
- Show tooltip on hover (label + explanation)
- Visual states: idle, dragging (opacity 0.4 at source), focused (ring-2)
- Drag overlay: ghost preview with rotation + shadow

#### Accessibility (WCAG 2.1 AA)

**Keyboard Navigation:**
- Tab/Shift+Tab: Navigate between words and controls
- Space/Enter: Pick up or drop word (toggle)
- Arrow keys:
  - In available pool: Navigate between words
  - In sequence: Reorder words (uses `sortableKeyboardCoordinates`)
- Escape: Cancel drag operation, return word to original position

**ARIA Attributes:**
```typescript
// Available Words Pool
<div role="region" aria-label="Available words to drag">
  <DraggableWord
    role="button"
    aria-label="{word.label}. {word.tooltip}"
    aria-grabbed={isDragging}
    tabIndex={0}
  />
</div>

// Drop Zone (Sequence)
<SortableContext
  role="region"
  aria-label="Word sequence (order matters)"
  aria-live="polite"
  aria-atomic="true"
>
  <SortableWord
    role="listitem"
    aria-label="Position {index}: {word.label}"
    aria-describedby="tooltip-{word.id}"
  />
</SortableContext>
```

**Screen Reader Announcements:**
- Drag start: "Picked up word: {label}"
- Drag over: "Moving {label} over drop zone"
- Drag end: "Placed {label} in position {number}" or "Returned to available words"
- Drag cancel: "Cancelled dragging {label}"
- Sequence update: "Sequence updated: {word1}, {word2}, {word3}"

**Focus Management:**
- Maintain focus on dragged word after drop
- Visible focus indicators: `focus-visible:ring-2 ring-primary` with 2px offset
- Focus trap within DndContext during keyboard drag

#### Visual Polish

**Animations (CSS Transitions):**
- Word chips: `transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)`
- Drop zone: `transition: border-color 200ms, background-color 200ms, box-shadow 200ms`
- Reorder (automatic via @dnd-kit): `transition: transform 250ms ease`

**Connection Indicators:**
- Position between drop zone and goal/actors
- Neutral gray before submission
- Pulse animation during active drag: `animation: pulse-connection 2s ease-in-out infinite`
- Use existing `ConnectionIndicator` component with size="lg"

**Drop Zone Highlights:**
```css
idle: border-2 border-dashed border-slate-600 bg-slate-800/30
dragOver: border-2 border-solid border-cyan-400 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.3)]
populated: border-2 border-solid border-slate-500 bg-slate-800/50
```

**Drag Ghost/Overlay:**
- Opacity: 0.8
- Transform: `rotate-2 scale-105`
- Shadow: `shadow-2xl`
- Cursor: `cursor-grabbing`

#### Data Structure

**Actor Interface:**
```typescript
interface Actor {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  goal?: string;  // Deprecated: was used for single-actor mode
}
```

**Word Interface:**
```typescript
interface Word {
  id: string;
  label: string;
  tooltip: string;
  category?: string;  // e.g., "hooks", "lifecycle", "commands"
}
```

**Component Props:**
```typescript
interface WordPuzzleProps {
  actors: Actor[];
  availableWords: Word[];
  onSubmit: (sequence: string[]) => void;  // Array of word IDs
  isSubmitting?: boolean;
}
```

#### Validation

Order matters — sequence validation is positional:
- Submit sequence as array of word IDs: `["word-mount", "word-useState", "word-render"]`
- Validation compares submitted sequence to `correctSequence` (exact match)
- Scoring: Green (exact match), Yellow (≥50% positions correct), Red (<50%)

#### Implementation Notes

- Component directory: `src/components/questions/WordPuzzle/`
- Subcomponents: `DraggableWord.tsx`, `SortableWord.tsx`, `DropZone.tsx`, `OneActorLayout.tsx`, `TwoActorLayout.tsx`
- Main component wraps all in `<DndContext>` with sensors and accessibility announcements
- State management: Local `useState` for sequence and available pool
- No global state needed (drag state is ephemeral)
- Maintain existing validation logic in `src/lib/scoring.ts`

### Multiple Choice

- Single selection only (radio behavior)
- Support image above text for both question and options
- Implement image fallback for failed loads

## Accessibility Requirements

All question components must implement:

1. **Keyboard navigation** — Arrow keys, Enter/Space to select
2. **Focus indicators** — Visible outline on focused elements
3. **ARIA attributes**:
   - `role="radiogroup"` on multiple choice container
   - `role="radio"` + `aria-checked` on options
   - `aria-label` on buttons and interactive elements
4. **Image alt text** — Use `imageFallback` field
5. **Color independence** — Use icons/text alongside colors

## Game UI Components

### Rank Badge

- Display current rank with distinctive styling per rank
- Suggested themes: Newcomer (gray), Junior (bronze), Medior (silver), Master (gold), Shaman (purple/gold)

### XP Progress

- Show progress bar to next rank
- Display XP needed
- Handle max rank (Shaman) — show "Max rank achieved"

### Connection Indicator

For word puzzles:
- Green (#22c55e) — valid connection
- Yellow (#eab308) — suboptimal
- Red (#ef4444) — invalid
- Gray — neutral (before submission)

## Animation Guidelines

- **Rank up**: Celebratory (confetti, glow, bounce)
- **Rank down**: Subtle, non-punishing (gentle fade)
- **XP gain**: Float numbers upward, add to total
- **Result feedback**: Smooth color transitions

## Styling Rules

- Use shadcn/ui primitives from `ui/`
- Use Tailwind for custom styling
- Maintain 4.5:1 contrast ratio minimum
- Add `focus-visible:` styles for keyboard users
