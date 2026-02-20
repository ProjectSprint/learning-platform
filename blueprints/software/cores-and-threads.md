# Parallel & Concurrency Blueprint

Declaration-first blueprint for `parallel-multicore`.
This document mirrors the current implementation in `src/routes/questions/software/cores-and-threads`.

Canonical engine references:
- `src/components/game/doc/README.md`
- `src/components/game/doc/question-definition.md`
- `src/components/game/doc/runtime-api.md`
- `src/components/game/doc/behavior-system.md`
- `src/components/game/doc/components.md`

---

## 0) Reading Protocol

### 0.1 Purpose

Use this blueprint as the implementation-aligned specification for the current cores-and-threads question.

### 0.2 Mandatory Reading Order

1. Section `1) Canonical Term Dictionary`
2. Section `2) Declarative Specification`
3. Section `3) Lifecycle and Logic Specification`
4. Section `4) Transition Matrices`
5. Section `5) Term-to-Logic Link Index`
6. Section `6) Hard Invariants`
7. Section `7) Non-Goals`
8. Section `8) Authoring and Verification Protocol`
9. Section `9) Product Gap Register`

### 0.3 No-Synonym Rule

- If logic references a concept, use the canonical term ID from Section 1.
- If a new concept is required, add it to Section 1 first.

### 0.4 Scope Boundary

- This file captures the behavior currently implemented in code.
- Do not assume planned phases are active unless behavior rules and UI wiring exist.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value | Meaning |
|---|---|---|
| `QUESTION_ID` | `parallel-multicore` | Unique question identifier |
| `QUESTION_TITLE` | `🖥️ Open Apps on a Single Core` | Display title |
| `QUESTION_DESCRIPTION` | `Open apps and see how one core processes execution work in sequence.` | Display description |

### 1.2 Mode Terms

| Term ID | Value | Meaning |
|---|---|---|
| `MODE_SINGLE_CORE` | `single-core` | Only declared runtime phase; sequential execution lesson |
| `MODE_DUAL_CORE_UNLOCKED` | context flag | Milestone state where Core 2 lane can receive whole-app execution |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Meaning |
|---|---|---|---|
| `SPACE_APP_POOL` | `app-pool` | `pool` | Source inventory for draggable apps |
| `SPACE_OPEN` | `open` | `grid` | Drop gate that starts an app pipeline |
| `SPACE_EXECUTION` | `execution` | `grid` | Per-lane execution part queue (`request`, `process`, `compose`) |
| `SPACE_CORE_1` | `core-1` | `path` | Core lane 1 execution path |
| `SPACE_CORE_2` | `core-2` | `path` | Core lane 2 execution path (hidden until unlock in UI) |
| `SPACE_STORAGE` | `storage` | `path` | I/O round-trip path used by `request` part midpoint pause |
| `SPACE_OPENED` | `opened` | `grid` | Destination for fully opened apps |

### 1.4 Pool Semantics Terms

| Term ID | Meaning |
|---|---|
| `POOL_DRAG_GATED_BY_LANE` | App drag from pool is blocked if no enabled lane is free |
| `POOL_ENTITY_SET_STATIC` | App inventory is static; entities move between spaces |

### 1.5 Entity Family Terms

| Term ID | Family | Count | Required Metadata |
|---|---|---|---|
| `ENTITY_APP` | `app` | 5 | `appKey`, `appStatus` |
| `ENTITY_PART` | `subtask` | 3 per active app | `step`, `partStatus`, `laneId`, `ownerAppId`, `pathPauseAtMidpoint`, `pathResumeToken` |
| `ENTITY_IO_REQUEST` | `subtask` | transient | `ioRole`, `ioState`, `ownerPartId`, `ownerAppId`, `laneId` |

### 1.6 App Catalogue

| App ID | App Key | App Name | Status Flow |
|---|---|---|---|
| `APP_WORD` | `word` | `Word Editor` | `ready -> parsing -> allocating -> opened` |
| `APP_CALC` | `calc` | `Calculator` | `ready -> parsing -> allocating -> opened` |
| `APP_PAINT` | `paint` | `Paint` | `ready -> parsing -> allocating -> opened` |
| `APP_MUSIC` | `music` | `Music Player` | `ready -> parsing -> allocating -> opened` |
| `APP_VIDEO` | `video` | `Video Editor` | `ready -> parsing -> allocating -> opened` |

### 1.7 Execution Part Catalogue

| Part Step | Label | Runtime Meaning |
|---|---|---|
| `PART_REQUEST` | `Requesting dependencies` | Starts on core path, pauses at midpoint, dispatches storage request |
| `PART_PROCESS` | `Processing dependencies` | Core execution segment after request resolves |
| `PART_COMPOSE` | `UI composition` | Final core execution segment before app moves to opened |

### 1.8 Status Terms

| Term ID | UI Label | Meaning |
|---|---|---|
| `STATUS_READY` | `Ready` | App sits in pool and can be launched |
| `STATUS_PARSING` | `Parsing` | App is in parse timer stage |
| `STATUS_ALLOCATING` | `Allocating` | App is in allocation timer stage |
| `STATUS_OPENED` | `Opened` | App completed execution and moved to opened grid |
| `STATUS_PART_QUEUED` | `Waiting` | Part is staged in execution grid |
| `STATUS_PART_WAITING_IO` | `Waiting for I/O` | Request part paused until storage response returns |
| `STATUS_PART_EXECUTING` | `Processing` | Part is actively moving in core path |

### 1.9 Phase Terms

| Term ID | Phase Value | Meaning |
|---|---|---|
| `PHASE_SINGLE_CORE` | `single-core` | Only runtime phase used by definition and behaviors |

### 1.10 Modal Terms

| Term ID | Modal ID | Runtime State |
|---|---|---|
| `MODAL_WALL` | `core-wall` | Builder exists but not triggered by current behaviors |
| `MODAL_SCHEDULER` | `scheduler-explain` | Builder exists but not triggered by current behaviors |
| `MODAL_SINGLE_LIMIT` | `single-thread-limit` | Builder exists but not triggered by current behaviors |
| `MODAL_PARALLEL_INTRO` | `parallel-intro` | Builder exists but not triggered by current behaviors |
| `MODAL_CONFLICT` | `parallel-conflict` | Builder exists but not triggered by current behaviors |
| `MODAL_LOCK_INTRO` | `parallel-lock-intro` | Builder exists but not triggered by current behaviors |
| `MODAL_COMPLETE` | `parallel-complete` | Builder exists but not triggered by current behaviors |

### 1.11 Timing Terms

| Term ID | Value | Meaning |
|---|---|---|
| `TIMER_PARSING_MS` | `1000` | Delay before moving from parsing to allocating |
| `TIMER_ALLOCATING_MS` | `1200` | Delay before creating execution parts and starting lane run |
| `TIMER_EXECUTION_SPLIT_SETTLE_MS` | `250` | Delay before first part enters selected lane |
| `TIMER_NOTICE_MS` | `1800` | Auto-clear delay for transient notice text |
| `TIMER_PATH_DURATION_SECONDS` | `6` | Path traversal duration for each core lane |

### 1.12 Event Terms

| Term ID | Meaning |
|---|---|
| `EVENT_APP_ARRIVED_OPEN` | App entity arrives in `SPACE_OPEN` |
| `EVENT_PART_PATH_MIDPOINT` | `ENTITY_UPDATED` with `pathMidpointTick` for part |
| `EVENT_IO_PATH_MIDPOINT` | `ENTITY_UPDATED` with `pathMidpointTick` for storage request |
| `EVENT_ENTITY_LEFT_STORAGE` | `ENTITY_LEFT_SPACE` from `SPACE_STORAGE` |
| `EVENT_ENTITY_LEFT_CORE` | `ENTITY_LEFT_SPACE` from `SPACE_CORE_1` or `SPACE_CORE_2` |

### 1.13 Component Terms

| Term ID | Component/Hook |
|---|---|
| `COMP_GAME_PROVIDER` | `GameProvider` |
| `COMP_GAME_BOARD` | `GameBoard` |
| `COMP_GRID_SPACE` | `GridSpace` |
| `COMP_POOL_SPACE` | `PoolSpace` |
| `COMP_PATH_SPACE` | `PathSpace` |
| `COMP_MODAL` | `Modal` |
| `COMP_HINT` | `ContextualHint` + `useContextualHint` |
| `COMP_DRAG_OVERLAY` | `DragOverlay` |
| `COMP_DRAWER_LAYOUT` | `DrawerLayout` |

### 1.14 Shared Resource Terms

| Term ID | Resource Name | Used By | Meaning |
|---|---|---|---|
| `RESOURCE_STORAGE` | `Storage` | `PART_REQUEST` and `ENTITY_IO_REQUEST` | Simulated dependency request/response round trip |

### 1.15 Counter and Threshold Terms

| Term ID | Value | Meaning |
|---|---|---|
| `COUNT_OPENED_FOR_DUAL_CORE_PROMPT` | `2` | Threshold that sets `dualCorePromptVisible` |

### 1.16 Lane Routing Terms

| Term ID | Meaning |
|---|---|
| `LANE_POLICY_SINGLE` | `first_free` over `SPACE_CORE_1` only |
| `LANE_POLICY_DUAL` | `round_robin` over `SPACE_CORE_1` + `SPACE_CORE_2` when unlocked |

### 1.17 Gap Terms

| Term ID | Meaning |
|---|---|
| `GAP_MODAL_FLOW_WIRING` | Modal builders exist but runtime does not open them |
| `GAP_PARALLEL_AND_LOCK_PHASES` | Parallel split/conflict/lock journey not implemented in behaviors |
| `GAP_COMPLETION_HANDOFF` | `onQuestionComplete` callback is passed but not invoked in page logic |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- `QUESTION_ID` equals `parallel-multicore`.
- `QUESTION_TITLE` and `QUESTION_DESCRIPTION` match constants.

### 2.2 Space Declaration

#### 2.2.1 Space Set

The question declares seven spaces:
- `SPACE_APP_POOL`
- `SPACE_OPEN`
- `SPACE_EXECUTION`
- `SPACE_CORE_1`
- `SPACE_CORE_2`
- `SPACE_STORAGE`
- `SPACE_OPENED`

#### 2.2.2 Space Roles

| Space Term | Role | Allowed Interaction |
|---|---|---|
| `SPACE_APP_POOL` | App source inventory | Drag apps out if lane gate allows |
| `SPACE_OPEN` | Launch gate | Receives app drop to start pipeline |
| `SPACE_EXECUTION` | Queue visualization | Displays generated execution parts |
| `SPACE_CORE_1` | Lane 1 execution path | Processes parts selected for lane 1 |
| `SPACE_CORE_2` | Lane 2 execution path | Processes parts when dual-core unlock is active |
| `SPACE_STORAGE` | I/O path | Handles transient request/response entity |
| `SPACE_OPENED` | Finished app destination | Receives apps after all parts complete |

#### 2.2.3 Space Bootstrap Guard Contract

- UI renders board only when all declared spaces exist in `state.spaces` (`boardReady`).

#### 2.2.4 Space Visibility Rules

| Space Term | Before Dual-Core Unlock | After Dual-Core Unlock |
|---|---|---|
| `SPACE_APP_POOL` | visible | visible |
| `SPACE_OPEN` | visible | visible |
| `SPACE_EXECUTION` | visible | visible |
| `SPACE_CORE_1` | visible | visible |
| `SPACE_CORE_2` | hidden in UI | visible |
| `SPACE_STORAGE` | visible | visible |
| `SPACE_OPENED` | visible | visible |

### 2.3 Entity Declaration

#### 2.3.1 Entity Family Inventory

| Entity Term | Required IDs and Count | Initial Presence |
|---|---|---|
| `ENTITY_APP` | 5 fixed app entities | All in `SPACE_APP_POOL` |
| `ENTITY_PART` | 3 generated part entities per active app | Generated when execution begins |
| `ENTITY_IO_REQUEST` | transient request entity | Generated only on request midpoint |

#### 2.3.2 Entity Metadata Contract

- `ENTITY_APP` carries `appKey` and `appStatus`.
- `ENTITY_PART` carries owner app identity, lane identity, part step, and path pause/resume fields.
- `ENTITY_IO_REQUEST` carries owner part/app and storage request state.

#### 2.3.3 Placement Contract

- App start: `SPACE_APP_POOL`.
- App drop: `SPACE_OPEN`.
- During execution: app removed from open, parts created in `SPACE_EXECUTION`, moved through core lane.
- Completion: app moves to `SPACE_OPENED`.

### 2.4 Pool and Group Declaration

#### 2.4.1 Pool Update Principles

- Drag from pool is denied when no enabled lane is available.
- Entities are moved between spaces rather than recreated for app inventory.

### 2.5 Mode and Phase Declaration

#### 2.5.1 Mode Declaration

| Mode Term | Objective |
|---|---|
| `MODE_SINGLE_CORE` | Teach sequential pipeline behavior |
| `MODE_DUAL_CORE_UNLOCKED` | Expose milestone that allows lane routing to Core 2 |

#### 2.5.2 Active Phase Order

1. `PHASE_SINGLE_CORE`

#### 2.5.3 Milestone Flow Inside `PHASE_SINGLE_CORE`

1. App launch and parse/allocation timers
2. Execution parts run on available lane
3. Opened app counter increments
4. Dual-core prompt flag flips at `COUNT_OPENED_FOR_DUAL_CORE_PROMPT`

### 2.6 Modal Declaration

| Modal Term | Availability Context | Runtime Behavior |
|---|---|---|
| `MODAL_WALL` | modal builder utility | Not opened by behavior rules |
| `MODAL_SCHEDULER` | modal builder utility | Not opened by behavior rules |
| `MODAL_SINGLE_LIMIT` | modal builder utility | Not opened by behavior rules |
| `MODAL_PARALLEL_INTRO` | modal builder utility | Not opened by behavior rules |
| `MODAL_CONFLICT` | modal builder utility | Not opened by behavior rules |
| `MODAL_LOCK_INTRO` | modal builder utility | Not opened by behavior rules |
| `MODAL_COMPLETE` | modal builder utility | Not opened by behavior rules |

### 2.7 Component Declaration

#### 2.7.1 Component Capability Map

| Component Term | Primary Capability |
|---|---|
| `COMP_GAME_PROVIDER` | Runtime context root |
| `COMP_GAME_BOARD` | Board container |
| `COMP_GRID_SPACE` | Open/Execution/Opened grids |
| `COMP_POOL_SPACE` | App drawer pool |
| `COMP_PATH_SPACE` | Core and storage lanes |
| `COMP_MODAL` | Global modal mount |
| `COMP_HINT` | Hint text derived from pipeline state |
| `COMP_DRAG_OVERLAY` | Drag preview |
| `COMP_DRAWER_LAYOUT` | Bottom drawer host for app pool |

#### 2.7.2 Component Behavior Contract

| Component Term | Must Do | Must Not Do |
|---|---|---|
| `COMP_GAME_PROVIDER` | Wrap question runtime consumers | Mount below runtime hook use |
| `COMP_GAME_BOARD` | Render spaces only when `boardReady` | Render partial board before space bootstrap |
| `COMP_POOL_SPACE` | Gate app drag with lane availability callback | Allow drag when all enabled lanes are occupied |
| `COMP_GRID_SPACE` | Display app/part statuses based on entity data | Invent statuses not set in data |
| `COMP_PATH_SPACE` | Render core/storage progression paths | Alter scheduling policy in UI layer |
| `COMP_MODAL` | Stay mounted for future behavior-driven modals | Assume modal flow exists without behavior wiring |

### 2.8 AI Authoring Contract

#### 2.8.1 AI Allowed Actions

- Extend flow only if behavior rules and UI wiring are added together.
- Keep Section 1 terms canonical.

#### 2.8.2 AI Disallowed Assumptions

- Do not assume parallel split/conflict/lock phases are live.
- Do not assume `onQuestionComplete` is currently invoked.

#### 2.8.3 AI Style Contract

- Describe behavior as `state + event -> effect`.
- Keep timing and lane-routing behavior explicit.

#### 2.8.4 AI Gap Handling Contract

- Record planned-but-unwired behavior under Section 9 before adding assumptions.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Runtime bootstraps all declared spaces and app entities.
2. UI computes `boardReady` and renders board only when all spaces are present.
3. User drags app to `SPACE_OPEN`.
4. Behavior rule assigns lane according to unlock state and occupancy.
5. App status advances `ready -> parsing -> allocating` via timers.
6. Execution parts are generated and run through selected core lane.
7. Request part midpoint creates storage request and pauses owner part.
8. Storage response completion resumes owner part and execution continues.
9. After all parts complete, app moves to `SPACE_OPENED`, count increments, and unlock notice may appear.

### 3.2 App Launch and Scheduling Logic

#### 3.2.1 Launch Guard

Entry Conditions:
- Event is `EVENT_APP_ARRIVED_OPEN`.
- Entity is known `ENTITY_APP` with `appStatus=ready`.

Behavior:
- Select lane using `LANE_POLICY_SINGLE` before unlock.
- Select lane using `LANE_POLICY_DUAL` after unlock.
- If no lane is free, move app back to `SPACE_APP_POOL` and show error notice.

#### 3.2.2 Parse and Allocation Stages

Behavior:
- Set app status to `STATUS_PARSING`, wait `TIMER_PARSING_MS`.
- Then set app status to `STATUS_ALLOCATING`, wait `TIMER_ALLOCATING_MS`.
- Start execution bootstrap for selected lane.

#### 3.2.3 Execution Part Creation

Behavior:
- Create/reinitialize three `ENTITY_PART` entities from `PART_REQUEST`, `PART_PROCESS`, `PART_COMPOSE`.
- Place parts into `SPACE_EXECUTION` row 0 for lane 1, row 1 for lane 2.
- Move first part to lane path after `TIMER_EXECUTION_SPLIT_SETTLE_MS`.

### 3.3 Core and Storage Progression Logic

#### 3.3.1 Request Midpoint I/O Pause

Trigger:
- `EVENT_PART_PATH_MIDPOINT` on `PART_REQUEST` while part is on core lane.

Behavior:
- Mark owner part as `STATUS_PART_WAITING_IO`.
- Create `ENTITY_IO_REQUEST` in `SPACE_STORAGE` with `ioState=request`.

#### 3.3.2 Storage Midpoint Response Swap

Trigger:
- `EVENT_IO_PATH_MIDPOINT` for storage request entity.

Behavior:
- Rename entity to `File response` and set `ioState=response`.

#### 3.3.3 Storage Completion Resume

Trigger:
- `EVENT_ENTITY_LEFT_STORAGE` for storage request entity.

Behavior:
- Set owner part back to `STATUS_PART_EXECUTING`.
- Increment owner part `pathResumeToken` to resume path.
- Delete storage request entity.

#### 3.3.4 Part Completion and Next-Part Advance

Trigger:
- `EVENT_ENTITY_LEFT_CORE` for part entity from its assigned lane.

Behavior:
- Delete completed part entity.
- Increment lane part index.
- Move next part to same lane; if none remain, finalize app open.

### 3.4 Opened App Finalization and Unlock Logic

#### 3.4.1 Finalize App

Behavior when lane has no remaining parts:
- Move app to `SPACE_OPENED` and set `STATUS_OPENED`.
- Clear lane active-app context and lane part state.
- Increment `openedCount`.

#### 3.4.2 Dual-Core Prompt Milestone

Behavior:
- If `openedCount >= COUNT_OPENED_FOR_DUAL_CORE_PROMPT` and flag is still false:
  - Set `dualCorePromptVisible=true`.
  - Show info notice: `You now have two opened apps. Next step: introduce dual-core scheduling.`

### 3.5 Hint and Notice Logic

Hint mapping by `pipelineState`:
- `idle` -> `Drag an app into Open to launch it.`
- `parsing` -> `OS is parsing the binary header.`
- `allocating` -> `Preparing execution resources.`
- `executing` -> `Active cores are processing app parts.`

Notice logic:
- Notices are written by behavior rules and auto-cleared after `TIMER_NOTICE_MS`.

---

## 4) Transition Matrices

### 4.1 Launch and Lane Selection Matrix

| Current State | Event | Preconditions | Immediate Effects | Next State |
|---|---|---|---|---|
| `PHASE_SINGLE_CORE` | `EVENT_APP_ARRIVED_OPEN` | app `STATUS_READY`, lane available | choose lane, set active lane app, app -> `STATUS_PARSING` | `pipelineState=parsing` |
| `PHASE_SINGLE_CORE` | `EVENT_APP_ARRIVED_OPEN` | app `STATUS_READY`, no lane available | move app back to pool, show error notice | `pipelineState` unchanged |

### 4.2 Timer-Driven Pipeline Matrix

| Current State | Event | Preconditions | Immediate Effects | Next State |
|---|---|---|---|---|
| `pipelineState=parsing` | parsing timer done | active app still on lane context | app -> `STATUS_ALLOCATING` | `pipelineState=allocating` |
| `pipelineState=allocating` | allocation timer done | active app still on lane context | create parts, queue first part launch | `pipelineState=executing` |

### 4.3 Core/Storage Execution Matrix

| Current State | Event | Preconditions | Immediate Effects | Next State |
|---|---|---|---|---|
| part on core lane | `EVENT_PART_PATH_MIDPOINT` | part step is `PART_REQUEST` | part -> `STATUS_PART_WAITING_IO`, create storage request | waiting for storage response |
| storage request in path | `EVENT_IO_PATH_MIDPOINT` | `ioState=request` | `ioState=response` | continue storage path |
| storage request leaves storage | `EVENT_ENTITY_LEFT_STORAGE` | owner part exists | owner part resumes, delete storage request | part continues in core path |
| part leaves core lane | `EVENT_ENTITY_LEFT_CORE` | part belongs to active lane app | delete part, advance index, move next part | next part or finalize app |

### 4.4 App Finalization Matrix

| Current State | Event | Preconditions | Immediate Effects | Next State |
|---|---|---|---|---|
| lane execution complete | internal next-part check | no remaining part IDs | app -> `SPACE_OPENED`, app -> `STATUS_OPENED`, clear lane active app | lane idle |
| opened count update | internal threshold check | reached `COUNT_OPENED_FOR_DUAL_CORE_PROMPT` first time | set `dualCorePromptVisible=true`, show info notice | dual-core milestone unlocked |

### 4.5 Behavior-Driven Scenario Flow

| Scenario ID | Given | When | Then |
|---|---|---|---|
| `BDD_SINGLE_PIPELINE` | app in pool, no active lane | user drops app to open | app parses, allocates, then executes 3 parts in sequence |
| `BDD_IO_WAIT_LOOP` | request part reaches midpoint | midpoint update event fires | request pauses, storage request/response completes, request resumes |
| `BDD_LANE_BUSY_REJECT` | all enabled lanes occupied | user drops another app | app returns to pool and error notice appears |
| `BDD_DUAL_UNLOCK_PROMPT` | openedCount becomes `2` | second app finishes | dual-core prompt flag turns on and UI reveals Core 2 lane |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms -> Logic Usage

| Space Term | Declared In | Used In Logic Sections |
|---|---|---|
| `SPACE_APP_POOL` | 1.3, 2.2 | 3.2.1, 4.1 |
| `SPACE_OPEN` | 1.3, 2.2 | 3.1, 3.2, 4.1 |
| `SPACE_EXECUTION` | 1.3, 2.2 | 3.2.3 |
| `SPACE_CORE_1` | 1.3, 2.2 | 3.2.1, 3.3, 4.3 |
| `SPACE_CORE_2` | 1.3, 2.2 | 2.2.4, 3.2.1, 4.5 |
| `SPACE_STORAGE` | 1.3, 2.2 | 3.3, 4.3 |
| `SPACE_OPENED` | 1.3, 2.2 | 3.4.1, 4.4 |

### 5.2 Entity Terms -> Logic Usage

| Entity Term | Declared In | Used In Logic Sections |
|---|---|---|
| `ENTITY_APP` | 1.5, 2.3 | 3.2, 3.4, 4.1, 4.4 |
| `ENTITY_PART` | 1.5, 2.3 | 3.2.3, 3.3, 4.3 |
| `ENTITY_IO_REQUEST` | 1.5, 2.3 | 3.3.1, 3.3.2, 3.3.3, 4.3 |

### 5.3 Phase Terms -> Logic Usage

| Phase Term | Declared In | Used In Logic Sections |
|---|---|---|
| `PHASE_SINGLE_CORE` | 1.9, 2.5 | 3.*, 4.* |

### 5.4 Modal Terms -> Logic Usage

| Modal Term | Declared In | Used In Logic Sections |
|---|---|---|
| `MODAL_WALL` | 1.10, 2.6 | 2.6, 9.1 |
| `MODAL_SCHEDULER` | 1.10, 2.6 | 2.6, 9.1 |
| `MODAL_SINGLE_LIMIT` | 1.10, 2.6 | 2.6, 9.1 |
| `MODAL_PARALLEL_INTRO` | 1.10, 2.6 | 2.6, 9.1 |
| `MODAL_CONFLICT` | 1.10, 2.6 | 2.6, 9.1 |
| `MODAL_LOCK_INTRO` | 1.10, 2.6 | 2.6, 9.1 |
| `MODAL_COMPLETE` | 1.10, 2.6 | 2.6, 9.1 |

### 5.5 Timing Terms -> Logic Usage

| Timing Term | Declared In | Used In Logic Sections |
|---|---|---|
| `TIMER_PARSING_MS` | 1.11 | 3.2.2, 4.2 |
| `TIMER_ALLOCATING_MS` | 1.11 | 3.2.2, 4.2 |
| `TIMER_EXECUTION_SPLIT_SETTLE_MS` | 1.11 | 3.2.3 |
| `TIMER_NOTICE_MS` | 1.11 | 3.5 |
| `TIMER_PATH_DURATION_SECONDS` | 1.11 | 2.7, 3.3 |

### 5.6 Counter Terms -> Logic Usage

| Counter Term | Declared In | Used In Logic Sections |
|---|---|---|
| `COUNT_OPENED_FOR_DUAL_CORE_PROMPT` | 1.15 | 2.5.3, 3.4.2, 4.4 |

### 5.7 Lane Routing Terms -> Logic Usage

| Lane Term | Declared In | Used In Logic Sections |
|---|---|---|
| `LANE_POLICY_SINGLE` | 1.16 | 3.2.1 |
| `LANE_POLICY_DUAL` | 1.16 | 3.2.1 |

---

## 6) Hard Invariants

1. The only declared runtime phase is `PHASE_SINGLE_CORE`.
2. App launch processing must require `appStatus=ready` at drop time.
3. Parsing must always precede allocating, and allocating must precede execution part movement.
4. Exactly three execution parts are generated per active app run: request, process, compose.
5. Request midpoint must pause execution and create a storage request entity.
6. Storage completion must resume the paused owner part via `pathResumeToken` increment.
7. Completed parts must be deleted after leaving their assigned core lane.
8. App completion must move app to `SPACE_OPENED` and set `appStatus=opened`.
9. Core 2 must remain unavailable for lane selection until dual-core unlock milestone is reached.
10. Dual-core unlock threshold must use `COUNT_OPENED_FOR_DUAL_CORE_PROMPT`, not literal values in logic.
11. If all enabled lanes are occupied, dropping an app into open must fail fast and return app to pool.

---

## 7) Non-Goals

1. This implementation does not execute modal learning flow in runtime.
2. This implementation does not model explicit multi-phase progression beyond `single-core`.
3. This implementation does not implement manual subtask drag assignment to cores.
4. This implementation does not implement race-condition conflict or lock simulation.
5. This implementation does not invoke question completion callback from gameplay flow.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update Section 1 terms before changing semantics.
2. Keep Section 2 declarations synchronized with runtime definition.
3. Update Section 3 logic for behavior rule changes.
4. Update Section 4 matrices for event/transition changes.
5. Update Section 5 links and Section 6 invariants.
6. Record unfinished behavior under Section 9.

### 8.2 Consistency Checks

- Every referenced `SPACE_*` exists in runtime definition spaces.
- Every behavior event in matrices maps to real behavior triggers/guards.
- Timers in logic map to constants.
- Unlock threshold references `COUNT_OPENED_FOR_DUAL_CORE_PROMPT`.
- If modal flow is documented as active, behavior rules must call modal runtime APIs.

### 8.3 Quality Gates

When code behavior changes, run:
- `pnpm check:biome`
- `pnpm check:tsc`

For docs-only updates:
- Validate section order and term consistency.
- Validate table rows map to current constants/behaviors.

---

## 9) Product Gap Register

### 9.1 `GAP_MODAL_FLOW_WIRING`

- Current default: modal builders are defined but not used by behavior rules.
- Next step options:
  - Wire modal sequence to milestone and phase transitions.
  - Remove unused modal builders until flow is implemented.

### 9.2 `GAP_PARALLEL_AND_LOCK_PHASES`

- Current default: no parallel split, race-condition conflict, or lock mechanism in active behavior rules.
- Next step options:
  - Implement new phases and transitions in behavior context.
  - Keep scope intentionally limited to sequential + unlock teaser.

### 9.3 `GAP_COMPLETION_HANDOFF`

- Current default: route provides `onQuestionComplete`, but gameplay never calls it.
- Next step options:
  - Trigger completion from milestone/modal action.
  - Add explicit completion control in UI.

### 9.4 `GAP_DUAL_CORE_TEACHING_DEPTH`

- Current default: dual-core unlock reveals lane and routing policy, but no dedicated explanatory phase.
- Next step options:
  - Add scripted dual-core demonstration step with visible scheduler explanation.
  - Keep current lightweight notice-only teaching.
