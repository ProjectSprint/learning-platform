# Database Standards (src/db)

This directory contains Drizzle ORM schema and database utilities.

## Schema Design

### Required Tables

**users**
- Link to Clerk via `clerkId`
- Store `totalXP` (never negative)
- Store `currentRank` as enum
- Track `createdAt` and `updatedAt`

**sessions**
- Belongs to user
- Track `sessionXP` (XP earned this session only)
- Track `startedAt` and `completedAt`

**question_attempts**
- Belongs to session
- Store question reference and type
- Store answer as JSONB
- Store result (green/yellow/red/pending)
- Store XP earned

**Question tables** (one per type):
- `word_puzzles` — actors, available words, correct sequence (order matters)
- `coding_challenges` — templates per language, test cases, max runtime
- `multiple_choice_questions` — question content, options, correct option ID
- `open_ended_questions` — prompt, rubric items

**open_ended_submissions**
- Separate from attempts (supports pending grading state)
- Store grader info, rubric scores, feedback

### Enum Values

**rank**: newcomer, junior, medior, master, shaman

**question_type**: word-puzzle, coding, multiple-choice, open-ended

**result**: green, yellow, red, pending

## Query Patterns

### After Answer Submission

1. Calculate result based on question type
2. Calculate XP earned (baseXP × multiplier)
3. Update user's totalXP
4. Recalculate rank using `calculateRank()`
5. Save question attempt
6. Return new totals to client

### Rank Recalculation

Always recalculate rank from `totalXP` — don't increment/decrement rank directly. This ensures oscillation works correctly.

## Constraints

- User XP cannot go negative (enforce at application level)
- Foreign keys for referential integrity
- Use UUIDs for IDs (use `text` type with generated UUIDs)

## Migration Strategy

- Use `npm run db:generate` to create migrations from schema changes
- Use `npm run db:push` for development only
- Test migrations in staging before production
