# Hook Standards (src/hooks)

Custom React hooks for state management and data fetching.

## Workflow
For new features or architectural changes, propose updates to this file first. Wait for approval before implementing.

## Required Hooks

### useSession

Manages game session lifecycle.

Responsibilities:
- Create new session on start
- Track session XP accumulation
- End session and return summary

### useRank

Tracks user rank and progression.

Responsibilities:
- Fetch user's current XP and rank
- Calculate XP to next rank
- Track if rank changed during session (for animations)

### useQuestionSubmit

Handles answer submission.

Responsibilities:
- POST answer to API
- Return result (green/yellow/red/pending)
- Return XP earned and new totals
- Invalidate relevant queries on success

### useCodeExecution

Executes code in sandbox.

Responsibilities:
- POST code to execution API
- Return test results (per test case)
- Handle timeout and errors
- Hide details for hidden test cases

## Data Fetching Patterns

Use TanStack Query for all data fetching.

### Queries (GET)

- Use `useQuery` for fetching data
- Define query keys consistently: `['entity', id]`
- Handle loading and error states

### Mutations (POST/PUT/DELETE)

- Use `useMutation` for state changes
- Invalidate related queries on success
- Optimistically update UI where appropriate

### After Submission

1. Call mutation
2. On success, invalidate `['user']` to refresh rank
3. Update session query data with new XP
4. Return result for UI feedback

## Error Handling

- Wrap API calls in try/catch
- Set error state for UI display
- Don't throw — return null or error object
- Log errors for debugging

## Hook Composition

Hooks can use other hooks. Example flow:

```
useQuestionSubmit
  └── uses useMutation
  └── on success, invalidates useRank's query
  └── returns result for component to display
```

## Naming Conventions

- Prefix with `use`
- Name describes the resource or action
- Return object with clear property names
- Include `isLoading`, `error` states where relevant
