# Library Standards (src/lib)

This directory contains core business logic and utilities.

## Workflow
For new features or architectural changes, propose updates to this file first. Wait for approval before implementing.

## Required Files

### rank.ts

Implement rank calculation utilities:
- `RANK_THRESHOLDS` — Constants for XP thresholds (0, 1000, 3000, 10000, 30000)
- `calculateRank(totalXP)` — Returns rank based on XP
- `calculateXPMultiplier(result)` — Returns 1.0 for green, 0.5 for yellow, 0 for red
- `getXPToNextRank(currentXP)` — Returns next rank and XP needed

### scoring.ts

Implement scoring utilities:
- `calculateXPEarned(baseXP, result)` — Apply multiplier, floor the result
- `calculateCodingResult(passedTests, totalTests)` — Green if ≥81%, yellow if ≥61%, red otherwise

### sandbox.ts

Implement sandboxed code execution. Choose one approach:
- isolated-vm (V8 isolates)
- Docker containers with limits
- External service (Judge0, Piston)

Requirements:
- Max memory: 128MB
- Max runtime: configurable per challenge
- No filesystem access
- No network access

## Testing Requirements

**Every function must have tests.** Create `{filename}.test.ts` alongside each file.

### What to Test

For `rank.ts`:
- Exact threshold boundaries (0, 1000, 3000, 10000, 30000)
- Values between thresholds
- Boundary oscillation (999→1000→999 should change rank both ways)
- Edge cases (negative XP, very large numbers)

For `scoring.ts`:
- Each result type (green/yellow/red)
- Fractional XP (should floor)
- Test case percentage boundaries (60%, 61%, 80%, 81%)

### Test Structure

```
describe('functionName', () => {
  describe('category', () => {
    it('specific behavior', () => {
      // arrange, act, assert
    });
  });
});
```

## Code Style

- Use TypeScript strict mode
- Export types alongside functions
- Pure functions where possible (no side effects)
- Use `as const` for constant objects
