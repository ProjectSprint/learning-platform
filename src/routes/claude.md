# Route Standards (src/routes)
TanStack Router file-based routes and API endpoints.

## Directory Structure

```
routes/
├── __root.tsx          # Root layout
├── index.tsx           # Landing page
├── play/               # Game flow
├── admin/              # Protected admin routes
└── api/                # API endpoints
```

## Standards
- each route should be handled by one file
- if there's a parameter route that live beside a non parameter route but they share the same subpath, always divide them
- routes can directly query to drizzle-orm
- routes 

## Page Routes

### /play — Game Flow

**GET /play** — Start session, redirect to first question

**GET /play/:questionId** — Display question based on type, render appropriate component

**GET /play/summary** — Show session results, XP earned, rank changes

## API Endpoints

### POST /api/submit-answer

Request body:
- sessionId
- questionId
- questionType
- answer (shape varies by type)

Response:
- result (green/yellow/red/pending)
- xpEarned
- newTotalXP
- newRank
- rankChanged

Flow:
1. Validate answer based on question type
2. Calculate XP (baseXP × multiplier)
3. Update user XP in database
4. Recalculate rank
5. Save question attempt
6. Return results

Test:
- request validations 
- not found resources
- grading results
- database updates

### POST /api/grade-answer

Admin only.

Request body:
- submissionId
- rubricScores (map of rubric item ID to points)
- feedback

Flow:
1. Calculate result from rubric percentage
2. Update submission with grading
3. Award XP to user
4. Return result

Test:
- request validations 
- not found resources
- grading results
- database updates


## Validation Rules

### Word Puzzle
- Compare submitted sequence to correct sequence (exact match = green)
- Partial match (≥50% positions correct) = yellow
- Otherwise = red

### Multiple Choice
- Exact match = green
- Wrong = red
- No yellow for multiple choice

### Coding
- Run all test cases
- ≥81% pass = green
- ≥61% pass = yellow
- <61% pass = red
- Runtime error = red
- Timeout = red

### Open Ended
- Always return "pending"
- XP awarded after manual grading

## Error Responses

Return consistent error shape:
- `error` — Human-readable message
- `code` — Machine-readable code (NOT_FOUND, UNAUTHORIZED, etc.)

Use appropriate HTTP status codes, for example:
- 400 — Bad request / validation error
- 401 — Unauthorized
- 404 — Not found
- 500 — Server error

## Authentication
TODO: implement clerk authentication once the requirements are clear and the app core functionality is passed
