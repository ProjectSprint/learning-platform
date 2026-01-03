# ProjectSprint Lingo - Lingo for Software Developers

> An RPG-style learning platform where developers level up their skills through interactive puzzles, coding challenges, and assessments.

## Project Overview

DevLingo gamifies software development learning with:
- Real-time rank progression with intentional oscillation (adds tension)
- Multiple question types: word puzzles, coding challenges, multiple choice, open-ended
- Session-based scoring with weighted answers
- RPG-inspired ranking system

## Tech Stack

- **Framework**: TanStack Start (React + Vite)
- **Database**: Drizzle ORM (PostgreSQL)
- **Auth**: Clerk (todo)
- **Data Fetching**: TanStack Query
- **UI**: shadcn/ui components
- **Code Execution**: Sandboxed environment (isolated-vm, Docker, or external service)
- **Testing**: Vitest

## Quick Reference Commands

```bash
# Start development
npm run dev

# Database operations
npm run db:generate   # Generate migrations
npm run db:push       # Push schema changes
npm run db:studio     # Open Drizzle Studio

# Testing
npm run test          # Run tests
npm run test:watch    # Watch mode

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Directory Structure

```
src/
├── components/      # React components (see components/claude.md)
├── db/              # Database schema & queries (see db/claude.md)
├── hooks/           # Custom React hooks (see hooks/claude.md)
├── lib/             # Core utilities & business logic (see lib/claude.md)
├── routes/          # TanStack Router routes & API endpoints (see routes/claude.md)
└── utils/           # Generic utilities
```

## Core Domain Concepts

### Ranks (Highest to Lowest)

| Rank | XP Required | Description |
|------|-------------|-------------|
| Shaman | 30,000 | Mastery achieved |
| Master | 10,000 | Deep expertise |
| Medior | 3,000 | Solid understanding |
| Junior | 1,000 | Learning fundamentals |
| Newcomer | 0 | Just started |

**Note**: Rank oscillation at boundaries is intentional — it creates tension and makes achievements feel earned.

### Scoring Results

| Result | XP Multiplier | Color |
|--------|---------------|-------|
| Green (optimal) | 100% | `#22c55e` |
| Yellow (acceptable) | 50% | `#eab308` |
| Red (wrong) | 0% | `#ef4444` |

### Question Types

1. **Word Puzzles** — Drag words to connect actors or achieve goals
2. **Coding Challenges** — Fill placeholders to pass test cases (sandboxed)
3. **Multiple Choice** — Single selection, image+text support
4. **Open Ended** — Free text (2000 char limit), manual rubric grading

## Key Business Rules

1. **Scoring is per-session** — No negative scores, resets each session
2. **Rank calculated real-time** — Updates immediately after each answer
3. **Save on completion only** — No auto-save, no drafts
4. **One correct answer per puzzle** — Question creators ensure this
5. **Order matters in word puzzles** — Sequence is validated
6. **Code execution must be sandboxed** — Security critical
7. **Open-ended = manual grading** — No AI grading, rubric-based
8. **2000 char is soft limit** — Warn user, don't prevent submission

## Accessibility Requirements

- `alt` text on all images
- `aria-label` on interactive elements
- Full keyboard navigation
- Visible focus indicators
- Sufficient color contrast (4.5:1 minimum)
- Don't rely solely on color for meaning

## Important Reminders for AI Assistants

1. **Always sandbox code execution** — Security critical
2. **Rank oscillation is intentional** — Don't add grace periods
3. **50% XP for yellow** — Consistent across all question types
4. **Tests are required** — See `lib/claude.md` for testing patterns
5. **Check specific claude.md files** — Each directory has detailed guidance
6. Code execution **must** be sandboxed. No filesystem access, no network access, memory limits, time limits.

## Directory-Specific Guidance

Each major directory has its own `claude.md` with specific standards:
- `src/lib/claude.md` — Business logic patterns and testing requirements
- `src/db/claude.md` — Schema design and query patterns
- `src/components/claude.md` — Component structure and UX rules
- `src/hooks/claude.md` — Hook patterns and data fetching
- `src/routes/claude.md` — API design and validation
