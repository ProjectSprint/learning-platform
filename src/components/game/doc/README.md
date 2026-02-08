# Game Engine Documentation

## Start Here

- Architecture contract: `contracts/architecture-spec.md`
- Action contracts: `contracts/actions.md`
- Event contracts: `contracts/events.md`
- State usage guide: `guides/state-management.md`
- Networking migration flow: `src/routes/questions/networking/MIGRATION_GUIDE.md`

## Core Principles

1. Question-owned explicit world setup.
2. Engine forwards interaction context.
3. Space validates and commits placement.
4. World mutations use fact-style action names.
5. Intent-style commands are limited to modal/terminal/drawer channels.

## Document Index

### Concepts

- `concepts/overview.md`
- `concepts/architecture.md`
- `concepts/core-concepts.md`

### Contracts

- `contracts/types.md`
- `contracts/actions.md`
- `contracts/events.md`
- `contracts/functions.md`
- `contracts/validation.md`
- `contracts/architecture-spec.md`

### Guides

- `guides/state-management.md`
- `guides/immer-patterns.md`
- `guides/engines.md`
- `guides/building-questions.md`

## Notes for Contributors

- `GridSpace`/`PoolSpace` do not create spaces on mount.
- Bootstrap spaces/entities in each question's init path.
- Use `useEngineEvents(...).ack()` for deterministic event consumption.
- Keep docs and code aligned whenever action/event contracts change.

