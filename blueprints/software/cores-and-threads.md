# Parallel & Concurrency Blueprint

Declaration-first blueprint for `parallel-multicore`.
This document is intentionally verbose and term-linked so an AI can map declarations to logic without guessing synonyms.

Canonical engine references:
- `src/components/game/doc/README.md`
- `src/components/game/doc/question-definition.md`
- `src/components/game/doc/runtime-api.md`
- `src/components/game/doc/behavior-system.md`
- `src/components/game/doc/components.md`

---

## 0) Reading Protocol

### 0.1 Purpose

Use this blueprint as the **starting specification** for creating and updating the parallel & concurrency question.
Use the game docs for API/type mechanics.

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

- If a logic sentence uses a concept, it must use the exact canonical term ID from Section 1.
- Avoid alternate labels (for example, do not swap `PHASE_SINGLE_EXECUTE` with "single core running phase").
- If a new term is needed, add it to Section 1 first, then use it.

### 0.4 Scope Boundary

- This file is a **starting-point blueprint**, not a generated reference from implementation files.
- AI authors must treat this blueprint + game docs as the source of truth for authoring.
- If behavior is not fully specified here, do not invent implicit behavior; add a `GAP_*` item in Section 9 first.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value | Meaning |
|---|---|---|
| `QUESTION_ID` | `parallel-multicore` | Unique question identifier |
| `QUESTION_TITLE` | `🖥️ Boot up your desktop` | Display title |
| `QUESTION_DESCRIPTION` | `You have a brand new PC. Open apps, manage tasks, and discover why one core isn't enough.` | Display description |

### 1.2 Mode Terms

| Term ID | Value | Meaning |
|---|---|---|
| `MODE_SINGLE_CORE` | `single-core` | Single-core execution stage |
| `MODE_DUAL_CORE` | `dual-core` | Dual-core execution stage |
| `MODE_PARALLEL` | `parallel` | Parallel task-splitting stage |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Meaning |
|---|---|---|---|
| `SPACE_APP_POOL` | `app-pool` | `pool` | Available apps the user can choose to open |
| `SPACE_OPEN` | `open` | `grid` | Drop target where user drags an app to initiate opening |
| `SPACE_BREAKDOWN` | `breakdown` | `custom` | Displays the sub-task breakdown of the app being opened |
| `SPACE_CORE_1` | `core-1` | `custom` | Execution lane for Core 1 |
| `SPACE_CORE_2` | `core-2` | `custom` | Execution lane for Core 2 (hidden in `MODE_SINGLE_CORE`) |
| `SPACE_OPENED_APPS` | `opened-apps` | `pool` | Apps that have been successfully opened |

### 1.4 Pool Semantics Terms

| Term ID | Meaning |
|---|---|
| `POOL_MUTATION_SCOPED` | Pool writes modify only affected app subsets |
| `POOL_MUTATION_INCREMENTAL` | Pool writes add/remove targeted items, not full replacement |
| `POOL_PRESERVE_UNAFFECTED` | Unaffected app items remain visible |

### 1.5 Entity Family Terms

| Term ID | Family | Count | Required Metadata |
|---|---|---|---|
| `ENTITY_APP` | `app` | 5 (Word, Calculator, Paint, Music, Video) | `appId`, `appName`, `weight` |
| `ENTITY_SUBTASK` | `subtask` | variable per app | `appId`, `subtaskId`, `subtaskName`, `durationMs`, `dependsOn` |

### 1.6 App Catalogue

| App ID | App Name | Icon | Weight | Meaning |
|---|---|---|---|---|
| `APP_WORD` | `Word Editor` | 📝 | `light` | Lightweight app, fast to open |
| `APP_CALC` | `Calculator` | 🧮 | `light` | Lightweight app, fast to open |
| `APP_PAINT` | `Paint` | 🎨 | `medium` | Medium app, moderate sub-tasks |
| `APP_MUSIC` | `Music Player` | 🎵 | `medium` | Medium app, moderate sub-tasks |
| `APP_VIDEO` | `Video Editor` | 🎬 | `heavy` | Heavy app, many sub-tasks, long execution — designed to trigger frustration in single-core |

### 1.7 Subtask Catalogue

Each app decomposes into ordered sub-tasks when dragged into `SPACE_OPEN`. Sub-tasks feed into the execution lane(s) one by one.

#### APP_WORD subtasks

| Subtask ID | Name | Duration (ms) | Depends On |
|---|---|---|---|
| `WORD_LOCATE` | `Locate binary` | `800` | none |
| `WORD_PARSE` | `Parse config` | `600` | `WORD_LOCATE` |
| `WORD_RENDER` | `Render UI` | `1000` | `WORD_PARSE` |

#### APP_CALC subtasks

| Subtask ID | Name | Duration (ms) | Depends On |
|---|---|---|---|
| `CALC_LOCATE` | `Locate binary` | `500` | none |
| `CALC_PARSE` | `Parse config` | `400` | `CALC_LOCATE` |
| `CALC_RENDER` | `Render UI` | `600` | `CALC_PARSE` |

#### APP_PAINT subtasks

| Subtask ID | Name | Duration (ms) | Depends On |
|---|---|---|---|
| `PAINT_LOCATE` | `Locate binary` | `800` | none |
| `PAINT_PARSE` | `Parse config` | `600` | `PAINT_LOCATE` |
| `PAINT_LOAD_BRUSH` | `Load brush engine` | `1200` | `PAINT_PARSE` |
| `PAINT_RENDER` | `Render canvas` | `1500` | `PAINT_LOAD_BRUSH` |

#### APP_MUSIC subtasks

| Subtask ID | Name | Duration (ms) | Depends On |
|---|---|---|---|
| `MUSIC_LOCATE` | `Locate binary` | `700` | none |
| `MUSIC_PARSE` | `Parse config` | `500` | `MUSIC_LOCATE` |
| `MUSIC_LOAD_CODEC` | `Load audio codec` | `1000` | `MUSIC_PARSE` |
| `MUSIC_RENDER` | `Render player UI` | `1200` | `MUSIC_LOAD_CODEC` |

#### APP_VIDEO subtasks

| Subtask ID | Name | Duration (ms) | Depends On |
|---|---|---|---|
| `VIDEO_LOCATE` | `Locate binary` | `1000` | none |
| `VIDEO_PARSE` | `Parse config` | `800` | `VIDEO_LOCATE` |
| `VIDEO_LOAD_CODEC` | `Load video codec` | `1500` | `VIDEO_PARSE` |
| `VIDEO_LOAD_GPU` | `Initialize GPU link` | `1200` | `VIDEO_PARSE` |
| `VIDEO_LOAD_TIMELINE` | `Load timeline engine` | `2000` | `VIDEO_LOAD_CODEC` |
| `VIDEO_RENDER` | `Render workspace` | `2500` | `VIDEO_LOAD_TIMELINE`, `VIDEO_LOAD_GPU` |

> Note: `VIDEO_LOAD_CODEC` and `VIDEO_LOAD_GPU` both depend only on `VIDEO_PARSE`, not on each other. This makes them **parallelizable** — the key teaching moment in `MODE_PARALLEL`. `VIDEO_RENDER` depends on both, so it must wait for both to finish.

### 1.8 Status Terms

| Term ID | UI Label | Meaning |
|---|---|---|
| `STATUS_QUEUED` | `Queued` | Sub-task is waiting to enter execution |
| `STATUS_PROCESSING` | `Processing` | Sub-task is actively executing on a core |
| `STATUS_DONE` | `Done` | Sub-task completed |
| `STATUS_BLOCKED` | `Blocked` | Sub-task waiting on dependency |
| `STATUS_IDLE` | `Idle` | Core has no work assigned |
| `STATUS_CONFLICT` | `⚠️ Conflict` | Two cores accessed shared resource simultaneously during `PHASE_PARALLEL_CONFLICT` |
| `STATUS_LOCKED` | `🔒 Locked` | Resource is locked by another core |

### 1.9 Phase Terms

| Term ID | Phase Value | Mode | Meaning |
|---|---|---|---|
| `PHASE_SINGLE_EXPLORE` | `single-explore` | `MODE_SINGLE_CORE` | User opens first app freely, learns the flow |
| `PHASE_SINGLE_EXECUTE` | `single-execute` | `MODE_SINGLE_CORE` | Sub-tasks process one-by-one on Core 1, drag is blocked |
| `PHASE_SINGLE_PAIN` | `single-pain` | `MODE_SINGLE_CORE` | User opens multiple apps, waits through each sequentially |
| `PHASE_SINGLE_WALL` | `single-wall` | `MODE_SINGLE_CORE` | Frustration modal — offer to add a second core |
| `PHASE_DUAL_IDLE` | `dual-idle` | `MODE_DUAL_CORE` | Second core visible but idle — apps still route to Core 1 only |
| `PHASE_DUAL_SCHEDULER` | `dual-scheduler` | `MODE_DUAL_CORE` | OS scheduler enabled — whole apps route to free cores |
| `PHASE_DUAL_LIMIT` | `dual-limit` | `MODE_DUAL_CORE` | Heavy single-threaded app saturates Core 1, Core 2 idle |
| `PHASE_PARALLEL_INTRO` | `parallel-intro` | `MODE_PARALLEL` | Introduce task-splitting concept |
| `PHASE_PARALLEL_SPLIT` | `parallel-split` | `MODE_PARALLEL` | User manually splits independent subtasks across cores |
| `PHASE_PARALLEL_CONFLICT` | `parallel-conflict` | `MODE_PARALLEL` | Shared resource conflict occurs |
| `PHASE_PARALLEL_LOCK` | `parallel-lock` | `MODE_PARALLEL` | User learns to apply locks to shared resources |
| `PHASE_PARALLEL_COMPLETE` | `parallel-complete` | `MODE_PARALLEL` | Completion checkpoint |

### 1.10 Modal Terms

| Term ID | Modal ID | Action ID | Purpose |
|---|---|---|---|
| `MODAL_FIRST_APP_DONE` | `first-app-done` | implicit continue | Celebrate first app opened, encourage opening more |
| `MODAL_WALL` | `wall` | `add-core` | "Tired of waiting?" — offer second core |
| `MODAL_CORE_ADDED` | `core-added` | implicit continue | Second core added, but explain nothing changed yet |
| `MODAL_SCHEDULER_EXPLAIN` | `scheduler-explain` | `enable-scheduler` | Explain OS scheduler concept, enable auto-routing |
| `MODAL_SINGLE_THREAD_LIMIT` | `single-thread-limit` | `continue` | Heavy app still slow — one thread can't use two cores |
| `MODAL_PARALLEL_INTRO` | `parallel-intro` | `enable-splitting` | Introduce manual task splitting |
| `MODAL_CONFLICT` | `conflict` | `continue` | Explain what went wrong with shared resource |
| `MODAL_LOCK_INTRO` | `lock-intro` | `enable-locks` | Introduce lock mechanism |
| `MODAL_COMPLETE` | `complete` | `complete` | Final success and summary |

### 1.11 Timing Terms

| Term ID | Value (ms) | Meaning |
|---|---|---|
| `TIMER_SUBTASK_BASE_MS` | per subtask catalogue | Each subtask has its own duration |
| `TIMER_QUEUE_POLL_MS` | `300` | Interval at which the execution lane checks for next queued subtask |
| `TIMER_CONFLICT_FLASH_MS` | `2000` | Duration conflict warning is visible |
| `TIMER_LOCK_WAIT_MS` | `1500` | Duration a core waits when resource is locked |

### 1.12 Event Terms

| Term ID | Meaning |
|---|---|
| `EVENT_DROP_TO_OPEN` | User drags an app from `SPACE_APP_POOL` into `SPACE_OPEN` |
| `EVENT_SUBTASK_START` | A subtask begins processing on a core |
| `EVENT_SUBTASK_DONE` | A subtask finishes processing |
| `EVENT_ALL_SUBTASKS_DONE` | All subtasks for an app are complete |
| `EVENT_DRAG_TO_CLOSE` | User drags app from `SPACE_OPENED_APPS` back to `SPACE_APP_POOL` |
| `EVENT_MODAL_SUBMIT_ADD_CORE` | Submit `MODAL_WALL` with action `add-core` |
| `EVENT_MODAL_SUBMIT_ENABLE_SCHEDULER` | Submit `MODAL_SCHEDULER_EXPLAIN` with action `enable-scheduler` |
| `EVENT_MODAL_SUBMIT_ENABLE_SPLITTING` | Submit `MODAL_PARALLEL_INTRO` with action `enable-splitting` |
| `EVENT_MODAL_SUBMIT_ENABLE_LOCKS` | Submit `MODAL_LOCK_INTRO` with action `enable-locks` |
| `EVENT_MODAL_SUBMIT_COMPLETE` | Submit `MODAL_COMPLETE` with action `complete` |
| `EVENT_USER_ASSIGN_SUBTASK` | User manually drags a subtask to a specific core (in `MODE_PARALLEL`) |
| `EVENT_CONFLICT_DETECTED` | Two cores execute subtasks accessing the same shared resource simultaneously |

### 1.13 Component Terms

| Term ID | Component/Hook |
|---|---|
| `COMP_GAME_PROVIDER` | `GameProvider` |
| `COMP_GAME_BOARD` | `GameBoard` |
| `COMP_GRID_SPACE` | `GridSpace` |
| `COMP_POOL_SPACE` | `PoolSpace` |
| `COMP_CUSTOM_SPACE` | `CustomSpace` |
| `COMP_MODAL` | `Modal` |
| `COMP_HINT` | `ContextualHint` + `useContextualHint` |
| `COMP_ARROWS` | `useBoardArrows` |
| `COMP_DRAG_OVERLAY` | `DragOverlay` |
| `COMP_DRAWER_LAYOUT` | `DrawerLayout` |
| `COMP_CPU_MONITOR` | `CpuMonitor` — displays per-core utilization percentage |

### 1.14 Shared Resource Terms

| Term ID | Resource Name | Used By | Meaning |
|---|---|---|---|
| `RESOURCE_FILESYSTEM` | `File System` | all apps' `Locate binary` subtask | Disk access — only one core can read at a time in conflict scenario |
| `RESOURCE_GPU` | `GPU` | `VIDEO_LOAD_GPU`, `PAINT_RENDER` | GPU access — used in `PHASE_PARALLEL_CONFLICT` scenario |

### 1.15 Counter and Threshold Terms

| Term ID | Value | Meaning |
|---|---|---|
| `COUNT_APPS_TO_TRIGGER_WALL` | `3` | Number of total opened apps required to enter `PHASE_SINGLE_WALL` |
| `COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO` | `2` | Number of overlapping app executions required before forcing `APP_VIDEO` single-thread limit demonstration |
| `COUNT_CONFLICT_APPS` | `2` | Number of apps in the lock/conflict replay scenario (`APP_VIDEO` + `APP_PAINT`) |

### 1.16 Arrow Terms

| Term ID | Meaning |
|---|---|
| `ARROW_DEPENDENCY` | Visual arrow from prerequisite `ENTITY_SUBTASK` to dependent `ENTITY_SUBTASK` in `SPACE_BREAKDOWN` |
| `ARROW_CORE_ASSIGNMENT` | Visual arrow from queued `ENTITY_SUBTASK` to assigned `SPACE_CORE_1` or `SPACE_CORE_2` |
| `ARROW_RESOURCE_LOCK` | Visual arrow from core lane to shared `RESOURCE_*` indicator when lock is acquired |

### 1.17 Gap Terms

| Term ID | Meaning |
|---|---|
| `GAP_TIMING_TUNING` | Final pedagogical timings for frustration pacing and lock wait |
| `GAP_FAILURE_RECOVERY` | Exact retry/recovery UX when user repeatedly assigns blocked subtasks |
| `GAP_SCORING` | Whether to expose optional score/grade metrics beyond completion |
| `GAP_ACCESSIBILITY_COPY` | Final screen-reader narration and reduced-motion fallbacks |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- `QUESTION_ID` must equal `parallel-multicore`.
- `QUESTION_TITLE` must equal `🖥️ Boot up your desktop`.
- `QUESTION_DESCRIPTION` must describe single-core limitation discovery and multi-core progression.

### 2.2 Space Declaration

#### 2.2.1 Space Set

The question must declare all six canonical spaces:
- `SPACE_APP_POOL`
- `SPACE_OPEN`
- `SPACE_BREAKDOWN`
- `SPACE_CORE_1`
- `SPACE_CORE_2`
- `SPACE_OPENED_APPS`

#### 2.2.2 Space Roles

| Space Term | Role | Allowed Gameplay Interaction |
|---|---|---|
| `SPACE_APP_POOL` | App source pool | Select and drag apps out |
| `SPACE_OPEN` | Open trigger zone | Drop target for apps |
| `SPACE_BREAKDOWN` | Subtask visualization | Display-only (shows subtask queue for current app) |
| `SPACE_CORE_1` | Execution lane 1 | Display-only in `MODE_SINGLE_CORE` and `MODE_DUAL_CORE`; drop target for subtasks in `MODE_PARALLEL` |
| `SPACE_CORE_2` | Execution lane 2 | Hidden in `MODE_SINGLE_CORE`; display-only in `MODE_DUAL_CORE`; drop target for subtasks in `MODE_PARALLEL` |
| `SPACE_OPENED_APPS` | Completed apps | Drag back to `SPACE_APP_POOL` to close |

#### 2.2.3 Space Bootstrap Guard Contract

- Any UI that renders `COMP_CUSTOM_SPACE` or `COMP_GRID_SPACE` for these spaces must ensure runtime bootstrap completion.
- Rendering before bootstrap can produce missing-space warnings.
- Required guard intent: `boardReady` style predicate over declared spaces.

#### 2.2.4 Space Visibility Rules

| Space Term | `MODE_SINGLE_CORE` | `MODE_DUAL_CORE` | `MODE_PARALLEL` |
|---|---|---|---|
| `SPACE_APP_POOL` | visible | visible | visible |
| `SPACE_OPEN` | visible | visible | visible |
| `SPACE_BREAKDOWN` | visible | visible | visible |
| `SPACE_CORE_1` | visible | visible | visible |
| `SPACE_CORE_2` | **hidden** | visible | visible |
| `SPACE_OPENED_APPS` | visible | visible | visible |

### 2.3 Entity Declaration

#### 2.3.1 Entity Family Inventory

| Entity Term | Required IDs and Count | Initial Presence |
|---|---|---|
| `ENTITY_APP` | 5 apps per catalogue (1.6) | All visible in `SPACE_APP_POOL` |
| `ENTITY_SUBTASK` | Per app catalogue (1.7) | Generated dynamically when an app enters `SPACE_OPEN` |

#### 2.3.2 Entity Metadata Contract

For every entity declaration:
- `ENTITY_APP` must have stable `id`, `appId`, `appName`, `weight`.
- `ENTITY_SUBTASK` must have stable `id`, `appId`, `subtaskId`, `subtaskName`, `durationMs`, `dependsOn`.

#### 2.3.3 Placement Contract

- `ENTITY_APP` begins in `SPACE_APP_POOL`.
- `ENTITY_SUBTASK` is generated into `SPACE_BREAKDOWN` when its parent `ENTITY_APP` is dropped into `SPACE_OPEN`.
- On `EVENT_ALL_SUBTASKS_DONE`, the `ENTITY_APP` moves to `SPACE_OPENED_APPS`.
- On `EVENT_DRAG_TO_CLOSE`, the `ENTITY_APP` returns to `SPACE_APP_POOL`.

### 2.4 Pool and Group Declaration

#### 2.4.1 Pool Update Principles

Every pool mutation must satisfy:
- `POOL_MUTATION_SCOPED`
- `POOL_MUTATION_INCREMENTAL`
- `POOL_PRESERVE_UNAFFECTED`

### 2.5 Mode and Phase Declaration

#### 2.5.1 Mode Declaration

| Mode Term | Objective |
|---|---|
| `MODE_SINGLE_CORE` | Experience sequential execution bottleneck — feel the pain |
| `MODE_DUAL_CORE` | Discover that a second core needs software awareness to be useful |
| `MODE_PARALLEL` | Learn to split work across cores and handle shared-resource hazards |

#### 2.5.2 Single-Core Phase Order

1. `PHASE_SINGLE_EXPLORE`
2. `PHASE_SINGLE_EXECUTE`
3. `PHASE_SINGLE_PAIN`
4. `PHASE_SINGLE_WALL`

#### 2.5.3 Dual-Core Phase Order

5. `PHASE_DUAL_IDLE`
6. `PHASE_DUAL_SCHEDULER`
7. `PHASE_DUAL_LIMIT`

#### 2.5.4 Parallel Phase Order

8. `PHASE_PARALLEL_INTRO`
9. `PHASE_PARALLEL_SPLIT`
10. `PHASE_PARALLEL_CONFLICT`
11. `PHASE_PARALLEL_LOCK`
12. `PHASE_PARALLEL_COMPLETE`

### 2.6 Modal Declaration

| Modal Term | Availability Context | Must Trigger |
|---|---|---|
| `MODAL_FIRST_APP_DONE` | First app fully opened | Positive feedback, nudge to open more |
| `MODAL_WALL` | Total opened apps reaches `COUNT_APPS_TO_TRIGGER_WALL` and user felt sequential wait | Offer `add-core` action |
| `MODAL_CORE_ADDED` | After `EVENT_MODAL_SUBMIT_ADD_CORE` | Explain: core added, but nothing changed |
| `MODAL_SCHEDULER_EXPLAIN` | After user tries to open app in `PHASE_DUAL_IDLE` and sees Core 2 idle | Explain OS scheduler, offer `enable-scheduler` |
| `MODAL_SINGLE_THREAD_LIMIT` | Heavy app finishes on Core 1 while Core 2 sat idle | Explain single-threaded limitation |
| `MODAL_PARALLEL_INTRO` | After `MODAL_SINGLE_THREAD_LIMIT` | Introduce task-splitting, offer `enable-splitting` |
| `MODAL_CONFLICT` | `EVENT_CONFLICT_DETECTED` fires | Explain shared resource corruption |
| `MODAL_LOCK_INTRO` | After `MODAL_CONFLICT` | Introduce lock mechanism, offer `enable-locks` |
| `MODAL_COMPLETE` | All parallel phases finished | Summary and `complete` action |

### 2.7 Component Declaration

#### 2.7.1 Component Capability Map

| Component Term | Primary Capability | Important Properties |
|---|---|---|
| `COMP_GAME_PROVIDER` | Required context root | `children`, optional `initialState` |
| `COMP_GAME_BOARD` | Board surface root | children layout tree |
| `COMP_GRID_SPACE` | Grid render + drop/click integration | `id/config`, `ctx`, `title`, `responsiveSize`, `onEntityClick`, `isEntityClickable`, `getEntityLabel`, `getEntityStatus` |
| `COMP_POOL_SPACE` | Pool render + drag start | `id/config`, `ctx`, `title` |
| `COMP_CUSTOM_SPACE` | Display-only, arrow targetable panel | `id`, `children` |
| `COMP_MODAL` | Modal stack renderer | no required props |
| `COMP_HINT` | Hint emission + display | hook + presentational component |
| `COMP_ARROWS` | Board-level arrow rendering | arrow entries with `id`, `from`, `to`, `color`, `label` |
| `COMP_DRAG_OVERLAY` | Drag ghost/preview | `getEntityLabel` |
| `COMP_DRAWER_LAYOUT` | Responsive panel shell | `drawerId`, `children` |
| `COMP_CPU_MONITOR` | Per-core utilization bar | `coreId`, `utilization` |

#### 2.7.2 Component Behavior Contract

| Component Term | Must Do | Must Not Do |
|---|---|---|
| `COMP_GAME_PROVIDER` | Wrap the whole question page so runtime hooks are valid | Mount below question subtree or conditionally unmount mid-session |
| `COMP_GAME_BOARD` | Be the parent for all board spaces and arrow surface | Be omitted when any `SPACE_*` is rendered |
| `COMP_GRID_SPACE` | Render `SPACE_OPEN` and accept drop for `ENTITY_APP` only | Auto-create missing spaces or silently swallow invalid drops |
| `COMP_POOL_SPACE` | Render `SPACE_APP_POOL` and `SPACE_OPENED_APPS` with drag source behavior | Replace full inventory snapshot when only one app changes |
| `COMP_CUSTOM_SPACE` | Render `SPACE_BREAKDOWN`, `SPACE_CORE_1`, `SPACE_CORE_2` after bootstrap guard passes | Render before bootstrap readiness or hold draggable state directly |
| `COMP_MODAL` | Render modal stack driven by canonical `MODAL_*` IDs | Encode branching logic outside modal submit actions |
| `COMP_HINT` | Display phase-correct hints driven by canonical phase/mode state | Introduce contradictory copy not tied to `PHASE_*` |
| `COMP_ARROWS` | Render `ARROW_DEPENDENCY`, `ARROW_CORE_ASSIGNMENT`, and `ARROW_RESOURCE_LOCK` during applicable phases | Render stale arrows that reference non-visible spaces |
| `COMP_DRAG_OVERLAY` | Show drag preview label for `ENTITY_APP` and draggable `ENTITY_SUBTASK` | Display interaction affordance when drag is blocked |
| `COMP_DRAWER_LAYOUT` | Host responsive pools consistently across breakpoints | Change game semantics based on viewport |
| `COMP_CPU_MONITOR` | Reflect 0/100 utilization based on active `STATUS_PROCESSING`/idle states | Invent intermediate utilization values not tied to runtime execution |

### 2.8 AI Authoring Contract

#### 2.8.1 AI Allowed Actions

- Extend declaration and logic as long as Section 1 terms remain canonical.
- Introduce new terms only by first updating Section 1.
- Refactor logic to reduce side effects while preserving transition semantics.

#### 2.8.2 AI Disallowed Assumptions

- Do not assume second core automatically routes tasks.
- Do not assume subtasks can be parallelized unless `dependsOn` permits it.
- Do not assume bootstrap spaces exist at first render.
- Do not treat synonyms as canonical terms.

#### 2.8.3 AI Style Contract

- Use declarative and functional decomposition.
- Express transitions as `state + event -> next state`.
- Keep side effects at boundaries (timer callback, modal callback, runtime API call).
- Keep mutation scope app-targeted and explicit.

#### 2.8.4 AI Gap Handling Contract

- If any design decision is unresolved, record it under Section 9 with a `GAP_*` term.
- Do not silently choose a behavior for unresolved pedagogy constraints.
- Use explicit defaults only when Section 9 marks the default as approved.

---

## 3) Lifecycle and Logic Specification

This section uses canonical terms only.

### 3.1 Runtime Lifecycle Sequence

1. Runtime validates declaration from Section 2.
2. Runtime bootstraps all `SPACE_*` declarations and initial entities.
3. UI checks bootstrap readiness before rendering dependent `COMP_*` panels.
4. `SPACE_CORE_2` is hidden initially.
5. User emits `EVENT_DROP_TO_OPEN` to begin gameplay.
6. Timer events, subtask completions, and modal submit events drive phase progression.
7. Final completion occurs through `EVENT_MODAL_SUBMIT_COMPLETE`.

### 3.2 Single-Core Logic by Phase

#### 3.2.1 `PHASE_SINGLE_EXPLORE`

Entry Conditions:
- `MODE_SINGLE_CORE` active.
- No apps have been opened yet.

Behavior:
- All 5 apps visible in `SPACE_APP_POOL`.
- User drags any `ENTITY_APP` into `SPACE_OPEN`.
- On `EVENT_DROP_TO_OPEN`:
  - Generate `ENTITY_SUBTASK` entities for that app into `SPACE_BREAKDOWN`.
  - Subtasks display as a vertical queue with `STATUS_QUEUED` badges.
  - **Block all dragging** from `SPACE_APP_POOL`.
  - Transition to `PHASE_SINGLE_EXECUTE`.

Hint:
- "Drag an app to the Open zone to launch it."

#### 3.2.2 `PHASE_SINGLE_EXECUTE`

Entry Conditions:
- An app's subtasks have been generated in `SPACE_BREAKDOWN`.

Behavior:
- Subtasks feed into `SPACE_CORE_1` **one at a time**, respecting `dependsOn` order.
- Current subtask shows `STATUS_PROCESSING` badge on `SPACE_CORE_1`.
- `COMP_CPU_MONITOR` for Core 1 shows utilization at 100% while processing.
- Each subtask waits its `durationMs` then fires `EVENT_SUBTASK_DONE`.
- On `EVENT_SUBTASK_DONE`:
  - Mark subtask `STATUS_DONE` in `SPACE_BREAKDOWN`.
  - Next subtask (if any) enters `SPACE_CORE_1`.
- On `EVENT_ALL_SUBTASKS_DONE`:
  - Move `ENTITY_APP` from `SPACE_OPEN` to `SPACE_OPENED_APPS`.
  - `COMP_CPU_MONITOR` for Core 1 drops to 0%.
  - **Unblock dragging**.
  - If this is the first app opened: present `MODAL_FIRST_APP_DONE`.
  - Transition to `PHASE_SINGLE_PAIN`.

Drag Lock Rule:
- While any subtask has `STATUS_PROCESSING` or `STATUS_QUEUED`, all drag from `SPACE_APP_POOL` is disabled. Attempting to drag shows a shake animation and hint: "CPU is busy — please wait."

#### 3.2.3 `PHASE_SINGLE_PAIN`

Entry Conditions:
- At least one app has been opened.
- Dragging is unblocked.

Behavior:
- User can drag another app to `SPACE_OPEN`.
- On `EVENT_DROP_TO_OPEN`: same flow as `PHASE_SINGLE_EXECUTE` — block, process sequentially, unblock.
- Each subsequent app open repeats the full wait cycle.
- After total opened apps reaches `COUNT_APPS_TO_TRIGGER_WALL`, transition to `PHASE_SINGLE_WALL`.
- The app opened at threshold hit should be guided to `APP_VIDEO` to maximize frustration consistency.

Pain Amplification:
- During execution of the threshold-trigger app (`APP_VIDEO` in canonical path), the hint text updates progressively:
  - At `VIDEO_LOAD_CODEC`: "This is taking a while..."
  - At `VIDEO_LOAD_TIMELINE`: "Still going... your CPU is at 100% but there's so much to do."
  - At `VIDEO_RENDER`: "Almost there... wouldn't it be nice if you could do something else while waiting?"

#### 3.2.4 `PHASE_SINGLE_WALL`

Entry Conditions:
- App that satisfies `COUNT_APPS_TO_TRIGGER_WALL` threshold has finished opening (or is about to finish).

Behavior:
- Present `MODAL_WALL`.
- Modal content: "Your single core is working as hard as it can, but tasks have to wait in line. What if you had another core?"
- Modal action: `add-core`.

Exit Rule:
- On `EVENT_MODAL_SUBMIT_ADD_CORE`:
  - Switch `MODE_SINGLE_CORE` -> `MODE_DUAL_CORE`.
  - Reveal `SPACE_CORE_2` with `STATUS_IDLE` badge and 0% utilization.
  - Enter `PHASE_DUAL_IDLE`.

### 3.3 Dual-Core Logic by Phase

#### 3.3.1 `PHASE_DUAL_IDLE`

Entry Conditions:
- `MODE_DUAL_CORE` active.
- `SPACE_CORE_2` now visible.

Behavior:
- User drags an app to `SPACE_OPEN`.
- Subtasks are generated and begin processing on `SPACE_CORE_1` as before.
- `SPACE_CORE_2` remains `STATUS_IDLE` and at 0% utilization.
- **Nothing changed** — the second core just sits there.
- On `EVENT_ALL_SUBTASKS_DONE`:
  - Present `MODAL_CORE_ADDED`.
  - Modal content: "You added a second core, but your apps still only use Core 1. The system doesn't automatically split work — it needs a scheduler to assign tasks to available cores."
  - Remain in `PHASE_DUAL_IDLE` until scheduler enable action is submitted.
- Present `MODAL_SCHEDULER_EXPLAIN`.
  - Modal content: "An OS scheduler can detect which core is free and route new apps there. Enable it?"
  - Action: `enable-scheduler`.

Exit Rule:
- On `EVENT_MODAL_SUBMIT_ENABLE_SCHEDULER`: enter `PHASE_DUAL_SCHEDULER`.

#### 3.3.2 `PHASE_DUAL_SCHEDULER`

Entry Conditions:
- Scheduler is enabled.

Behavior:
- User can now open **two apps simultaneously**.
- On `EVENT_DROP_TO_OPEN`:
  - If `SPACE_CORE_1` is idle: route subtasks to Core 1.
  - If `SPACE_CORE_1` is busy and `SPACE_CORE_2` is idle: route subtasks to Core 2.
- If both busy: block drag with hint "Both cores are busy."
- Both cores process their respective app's subtasks independently and simultaneously.
- `COMP_CPU_MONITOR` shows both cores active — user sees real parallelism for the first time.
- Hint: "Both cores working at the same time! This is what two cores give you."
- After the user has completed `COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO` overlapping app executions:
  - System prompts user to open `APP_VIDEO` specifically.
  - `APP_VIDEO` subtasks route to Core 1 (it's a single-threaded app).
  - While `APP_VIDEO` processes, Core 2 is visibly idle at 0%.
  - Transition to `PHASE_DUAL_LIMIT`.

#### 3.3.3 `PHASE_DUAL_LIMIT`

Entry Conditions:
- `APP_VIDEO` is processing on Core 1.
- Core 2 is idle.

Behavior:
- User sees the familiar long wait — `APP_VIDEO` subtasks execute sequentially on Core 1.
- `COMP_CPU_MONITOR` shows: Core 1 at 100%, Core 2 at 0%.
- Hint: "Core 2 is idle, but Video Editor can't use it — all its tasks are in a single thread on Core 1."
- On `EVENT_ALL_SUBTASKS_DONE` for `APP_VIDEO`:
  - Present `MODAL_SINGLE_THREAD_LIMIT`.
  - Modal content: "A second core helps when running multiple apps. But a single heavy app still bottlenecks on one core — unless it can split its work into pieces that run in parallel."
- Present `MODAL_PARALLEL_INTRO`.
  - Modal content: "Some tasks inside an app don't depend on each other. If you could assign independent tasks to different cores, both cores would stay busy. Want to try?"
  - Action: `enable-splitting`.

Exit Rule:
- On `EVENT_MODAL_SUBMIT_ENABLE_SPLITTING`:
  - Switch `MODE_DUAL_CORE` -> `MODE_PARALLEL`.
  - Enter `PHASE_PARALLEL_INTRO`.

### 3.4 Parallel Logic by Phase

#### 3.4.1 `PHASE_PARALLEL_INTRO`

Entry Conditions:
- `MODE_PARALLEL` active.

Behavior:
- System resets `APP_VIDEO` back to `SPACE_APP_POOL` (user must re-open it).
- `SPACE_CORE_1` and `SPACE_CORE_2` are now **drop targets** — user can drag subtasks to either core.
- Hint: "This time, YOU are the scheduler. Drag the app to open it, then assign each subtask to a core."
- On `EVENT_DROP_TO_OPEN` with `APP_VIDEO`:
  - Generate subtasks in `SPACE_BREAKDOWN`.
  - Render `ARROW_DEPENDENCY` for each `dependsOn` relation.
  - Independent subtasks (no shared dependency) are highlighted as parallelizable.
  - Enter `PHASE_PARALLEL_SPLIT`.

#### 3.4.2 `PHASE_PARALLEL_SPLIT`

Entry Conditions:
- `APP_VIDEO` subtasks visible in `SPACE_BREAKDOWN`.

Behavior:
- Subtasks with met dependencies become draggable.
- User drags a subtask to `SPACE_CORE_1` or `SPACE_CORE_2` via `EVENT_USER_ASSIGN_SUBTASK`.
- On `EVENT_USER_ASSIGN_SUBTASK`:
  - If subtask's `dependsOn` are all `STATUS_DONE`: accept, mark `STATUS_PROCESSING`.
  - If accepted, render `ARROW_CORE_ASSIGNMENT` from that subtask to selected core lane while processing.
  - If subtask's `dependsOn` are not met: reject with `STATUS_BLOCKED` hint: "This task depends on [dependency name] — it must finish first."
- Key moment: after `VIDEO_PARSE` completes, both `VIDEO_LOAD_CODEC` and `VIDEO_LOAD_GPU` become available simultaneously.
  - Hint: "These two tasks don't depend on each other! Assign one to each core."
  - If user assigns one to Core 1 and one to Core 2: both process simultaneously. Visible speedup.
  - If user assigns both to the same core: they process sequentially. Hint nudges: "You could use both cores here."
- `VIDEO_RENDER` only becomes available when BOTH `VIDEO_LOAD_CODEC` and `VIDEO_LOAD_GPU` are `STATUS_DONE`.

Conflict Trigger:
- After `APP_VIDEO` completes via parallel split, system auto-queues a scenario with `COUNT_CONFLICT_APPS`: user must open `APP_VIDEO` and `APP_PAINT` simultaneously, with both needing `RESOURCE_GPU` at the same time.
- When `VIDEO_LOAD_GPU` and `PAINT_RENDER` are both `STATUS_PROCESSING` on different cores: fire `EVENT_CONFLICT_DETECTED`.
- Enter `PHASE_PARALLEL_CONFLICT`.

#### 3.4.3 `PHASE_PARALLEL_CONFLICT`

Entry Conditions:
- `EVENT_CONFLICT_DETECTED` has fired.

Behavior:
- Both cores flash `STATUS_CONFLICT`.
- `COMP_CPU_MONITOR` shows warning state.
- One of the tasks produces a corrupted result (e.g., `PAINT_RENDER` output shows "⚠️ Corrupted" instead of `STATUS_DONE`).
- Present `MODAL_CONFLICT`.
  - Modal content: "Both cores tried to use the GPU at the same time. When two cores access the same resource without coordination, the result can be corrupted. This is called a race condition."
- Present `MODAL_LOCK_INTRO`.
  - Modal content: "A lock ensures only one core can access a shared resource at a time. The other core waits until the lock is released. Want to enable locks?"
  - Action: `enable-locks`.

Exit Rule:
- On `EVENT_MODAL_SUBMIT_ENABLE_LOCKS`: enter `PHASE_PARALLEL_LOCK`.

#### 3.4.4 `PHASE_PARALLEL_LOCK`

Entry Conditions:
- Locks are enabled.

Behavior:
- System replays the conflict scenario.
- This time, when a subtask accesses a shared resource (`RESOURCE_GPU`), a lock icon appears on that resource.
- This time, when a subtask accesses a shared resource (`RESOURCE_GPU`), render `ARROW_RESOURCE_LOCK` from active core lane to resource indicator and show lock icon.
- If the other core tries to process a subtask that needs the same resource:
  - That subtask shows `STATUS_LOCKED` with badge "🔒 Waiting for GPU..."
  - The core's `COMP_CPU_MONITOR` drops to 0% while waiting.
  - After `TIMER_LOCK_WAIT_MS` (or when the first core releases the resource), the waiting subtask resumes.
- Both tasks complete correctly — no corruption.
- Hint: "Locks prevent corruption, but notice — the waiting core was idle. Locks trade correctness for some speed."

Exit Rule:
- On completion of both apps: enter `PHASE_PARALLEL_COMPLETE`.

#### 3.4.5 `PHASE_PARALLEL_COMPLETE`

Behavior:
- Present `MODAL_COMPLETE`.
- Modal content summarizes the journey:
  - "You started with one core processing everything in sequence."
  - "You added a second core, but software had to know how to use it."
  - "You learned to split independent work across cores — real parallelism."
  - "You discovered that shared resources need locks to prevent corruption."
  - "This is why multi-core CPUs exist and why parallel programming matters."
- Mark question progress complete.

Exit Rule:
- On `EVENT_MODAL_SUBMIT_COMPLETE`, execute completion handoff callback.

### 3.5 Hint and Progress Logic

Hint source inputs:
- active mode (`MODE_SINGLE_CORE`, `MODE_DUAL_CORE`, or `MODE_PARALLEL`)
- active phase (`PHASE_*`)
- current app being opened
- core utilization states

CPU Monitor Logic:
- Core utilization = 100% when `STATUS_PROCESSING` subtask is active, 0% when `STATUS_IDLE`.
- In `PHASE_PARALLEL_LOCK`, utilization drops to 0% during lock-wait.

---

## 4) Transition Matrices

### 4.1 Single-Core Event-to-Transition Matrix

| Current Phase | Event Term | Preconditions | Immediate Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_SINGLE_EXPLORE` | `EVENT_DROP_TO_OPEN` | no app currently processing | generate subtasks, block drag | `PHASE_SINGLE_EXECUTE` |
| `PHASE_SINGLE_EXECUTE` | `EVENT_SUBTASK_DONE` | subtask was processing | mark done, start next subtask | `PHASE_SINGLE_EXECUTE` |
| `PHASE_SINGLE_EXECUTE` | `EVENT_ALL_SUBTASKS_DONE` | all subtasks done | move app to opened, unblock drag | `PHASE_SINGLE_PAIN` (if first app) |
| `PHASE_SINGLE_PAIN` | `EVENT_DROP_TO_OPEN` | drag unblocked | generate subtasks, block drag, process sequentially | `PHASE_SINGLE_EXECUTE` (loops back) |
| `PHASE_SINGLE_PAIN` | `EVENT_ALL_SUBTASKS_DONE` | total opened apps reaches `COUNT_APPS_TO_TRIGGER_WALL` | present `MODAL_WALL` | `PHASE_SINGLE_WALL` |
| `PHASE_SINGLE_WALL` | `EVENT_MODAL_SUBMIT_ADD_CORE` | modal open | reveal Core 2, switch mode | `PHASE_DUAL_IDLE` |

### 4.2 Dual-Core Event-to-Transition Matrix

| Current Phase | Event Term | Preconditions | Immediate Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_DUAL_IDLE` | `EVENT_DROP_TO_OPEN` | no app processing | subtasks route to Core 1 only | `PHASE_DUAL_IDLE` |
| `PHASE_DUAL_IDLE` | `EVENT_ALL_SUBTASKS_DONE` | app finished on Core 1, Core 2 was idle | present `MODAL_CORE_ADDED` then `MODAL_SCHEDULER_EXPLAIN` | `PHASE_DUAL_IDLE` |
| `PHASE_DUAL_IDLE` | `EVENT_MODAL_SUBMIT_ENABLE_SCHEDULER` | modal open | enable dual-core routing | `PHASE_DUAL_SCHEDULER` |
| `PHASE_DUAL_SCHEDULER` | `EVENT_DROP_TO_OPEN` | at least one core idle | route to free core | `PHASE_DUAL_SCHEDULER` |
| `PHASE_DUAL_SCHEDULER` | `EVENT_ALL_SUBTASKS_DONE` | overlapping completions count reaches `COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO` | prompt `APP_VIDEO`, route to Core 1 | `PHASE_DUAL_LIMIT` |
| `PHASE_DUAL_LIMIT` | `EVENT_ALL_SUBTASKS_DONE` | `APP_VIDEO` done, Core 2 was idle throughout | present `MODAL_SINGLE_THREAD_LIMIT` then `MODAL_PARALLEL_INTRO` | `PHASE_DUAL_LIMIT` |
| `PHASE_DUAL_LIMIT` | `EVENT_MODAL_SUBMIT_ENABLE_SPLITTING` | modal open | switch mode, enable subtask dragging | `PHASE_PARALLEL_INTRO` |

### 4.3 Parallel Event-to-Transition Matrix

| Current Phase | Event Term | Preconditions | Immediate Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_PARALLEL_INTRO` | `EVENT_DROP_TO_OPEN` with `APP_VIDEO` | `MODE_PARALLEL` active | generate subtasks with dependency visualization | `PHASE_PARALLEL_SPLIT` |
| `PHASE_PARALLEL_SPLIT` | `EVENT_USER_ASSIGN_SUBTASK` | dependencies met | assign to target core, mark processing | `PHASE_PARALLEL_SPLIT` |
| `PHASE_PARALLEL_SPLIT` | `EVENT_USER_ASSIGN_SUBTASK` | dependencies NOT met | reject with `STATUS_BLOCKED` | `PHASE_PARALLEL_SPLIT` |
| `PHASE_PARALLEL_SPLIT` | `EVENT_ALL_SUBTASKS_DONE` for `APP_VIDEO` | all video subtasks done | queue conflict scenario | `PHASE_PARALLEL_CONFLICT` setup |
| `PHASE_PARALLEL_CONFLICT` | `EVENT_CONFLICT_DETECTED` | two cores access same resource | flash conflict, show corruption | `PHASE_PARALLEL_CONFLICT` |
| `PHASE_PARALLEL_CONFLICT` | `EVENT_MODAL_SUBMIT_ENABLE_LOCKS` | conflict modal acknowledged | enable lock mechanism | `PHASE_PARALLEL_LOCK` |
| `PHASE_PARALLEL_LOCK` | `EVENT_USER_ASSIGN_SUBTASK` | resource locked by other core | show `STATUS_LOCKED`, wait | `PHASE_PARALLEL_LOCK` |
| `PHASE_PARALLEL_LOCK` | `EVENT_ALL_SUBTASKS_DONE` | all apps in lock scenario done | present `MODAL_COMPLETE` | `PHASE_PARALLEL_COMPLETE` |
| `PHASE_PARALLEL_COMPLETE` | `EVENT_MODAL_SUBMIT_COMPLETE` | modal open | execute completion handoff | terminal state |

### 4.4 Modal Action Matrix

| Modal Term | Action | State Mutation Scope | Follow-up |
|---|---|---|---|
| `MODAL_FIRST_APP_DONE` | implicit continue | none | resume `PHASE_SINGLE_PAIN` |
| `MODAL_WALL` | `add-core` | reveal Core 2, switch mode | enter `PHASE_DUAL_IDLE` |
| `MODAL_CORE_ADDED` | implicit continue | none | present `MODAL_SCHEDULER_EXPLAIN` |
| `MODAL_SCHEDULER_EXPLAIN` | `enable-scheduler` | enable dual-core routing logic | enter `PHASE_DUAL_SCHEDULER` |
| `MODAL_SINGLE_THREAD_LIMIT` | `continue` | none | present `MODAL_PARALLEL_INTRO` |
| `MODAL_PARALLEL_INTRO` | `enable-splitting` | switch mode, enable subtask dragging | enter `PHASE_PARALLEL_INTRO` |
| `MODAL_CONFLICT` | `continue` | none | present `MODAL_LOCK_INTRO` |
| `MODAL_LOCK_INTRO` | `enable-locks` | enable lock mechanic | enter `PHASE_PARALLEL_LOCK` |
| `MODAL_COMPLETE` | `complete` | progress completion scope | exit question callback |

### 4.5 Behavior-Driven Scenario Flow

| Scenario ID | Given | When | Then |
|---|---|---|---|
| `BDD_SINGLE_BOTTLENECK` | `MODE_SINGLE_CORE` and `PHASE_SINGLE_EXPLORE` | user triggers `EVENT_DROP_TO_OPEN` | enter `PHASE_SINGLE_EXECUTE`, drag lock engages, Core 1 only |
| `BDD_SINGLE_WALL` | total opened apps equals `COUNT_APPS_TO_TRIGGER_WALL` | current app completes (`EVENT_ALL_SUBTASKS_DONE`) | show `MODAL_WALL`, gate progress on `EVENT_MODAL_SUBMIT_ADD_CORE` |
| `BDD_DUAL_IDLE_SURPRISE` | `MODE_DUAL_CORE` and `PHASE_DUAL_IDLE` | user opens app and waits to complete | Core 2 remains idle, show `MODAL_CORE_ADDED` + `MODAL_SCHEDULER_EXPLAIN` |
| `BDD_DUAL_ROUTING_WIN` | `PHASE_DUAL_SCHEDULER` | user overlaps `COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO` app executions | both cores utilized, then force heavy single-thread example |
| `BDD_PARALLEL_SPLIT` | `MODE_PARALLEL` and `APP_VIDEO` opened | user assigns independent subtasks to different cores | concurrent processing plus visible `ARROW_CORE_ASSIGNMENT` |
| `BDD_RACE_CONFLICT` | conflict setup active with `COUNT_CONFLICT_APPS` apps | two `RESOURCE_GPU` subtasks process on different cores | fire `EVENT_CONFLICT_DETECTED`, show `MODAL_CONFLICT` |
| `BDD_LOCK_RECOVERY` | `PHASE_PARALLEL_LOCK` and lock enabled | second core requests locked `RESOURCE_GPU` | second task becomes `STATUS_LOCKED`, resumes after wait, no corruption |
| `BDD_COMPLETION` | all parallel lock scenario tasks done | user submits `EVENT_MODAL_SUBMIT_COMPLETE` | question completion callback executes |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms -> Logic Usage

| Space Term | Declared In | Used In Logic Sections |
|---|---|---|
| `SPACE_APP_POOL` | 1.3, 2.2 | 3.2.1, 3.2.3, 3.4.1 |
| `SPACE_OPEN` | 1.3, 2.2 | 3.2.1, 3.2.2, 3.3.1, 3.3.2, 3.4.1 |
| `SPACE_BREAKDOWN` | 1.3, 2.2 | 3.2.1, 3.2.2, 3.4.1, 3.4.2 |
| `SPACE_CORE_1` | 1.3, 2.2 | 3.2.2, 3.3.1, 3.3.2, 3.4.2, 3.4.4 |
| `SPACE_CORE_2` | 1.3, 2.2 | 3.3.1, 3.3.2, 3.3.3, 3.4.2, 3.4.4 |
| `SPACE_OPENED_APPS` | 1.3, 2.2 | 3.2.2, 3.2.3 |

### 5.2 Entity Terms -> Logic Usage

| Entity Term | Declared In | Used In Logic Sections |
|---|---|---|
| `ENTITY_APP` | 1.5, 2.3 | 3.2.1, 3.2.2, 3.2.3, 3.3.1, 3.3.2, 3.4.1 |
| `ENTITY_SUBTASK` | 1.5, 2.3 | 3.2.1, 3.2.2, 3.4.2, 3.4.3, 3.4.4 |

### 5.3 Phase Terms -> Logic Usage

| Phase Term | Declared In | Used In Logic Sections |
|---|---|---|
| `PHASE_SINGLE_EXPLORE` | 1.9, 2.5 | 3.2.1, 4.1 |
| `PHASE_SINGLE_EXECUTE` | 1.9, 2.5 | 3.2.2, 4.1 |
| `PHASE_SINGLE_PAIN` | 1.9, 2.5 | 3.2.3, 4.1 |
| `PHASE_SINGLE_WALL` | 1.9, 2.5 | 3.2.4, 4.1 |
| `PHASE_DUAL_IDLE` | 1.9, 2.5 | 3.3.1, 4.2 |
| `PHASE_DUAL_SCHEDULER` | 1.9, 2.5 | 3.3.2, 4.2 |
| `PHASE_DUAL_LIMIT` | 1.9, 2.5 | 3.3.3, 4.2 |
| `PHASE_PARALLEL_INTRO` | 1.9, 2.5 | 3.4.1, 4.3 |
| `PHASE_PARALLEL_SPLIT` | 1.9, 2.5 | 3.4.2, 4.3 |
| `PHASE_PARALLEL_CONFLICT` | 1.9, 2.5 | 3.4.3, 4.3 |
| `PHASE_PARALLEL_LOCK` | 1.9, 2.5 | 3.4.4, 4.3 |
| `PHASE_PARALLEL_COMPLETE` | 1.9, 2.5 | 3.4.5, 4.3 |

### 5.4 Modal Terms -> Logic Usage

| Modal Term | Declared In | Used In Logic Sections |
|---|---|---|
| `MODAL_FIRST_APP_DONE` | 1.10, 2.6 | 3.2.2 |
| `MODAL_WALL` | 1.10, 2.6 | 3.2.4, 4.1 |
| `MODAL_CORE_ADDED` | 1.10, 2.6 | 3.3.1 |
| `MODAL_SCHEDULER_EXPLAIN` | 1.10, 2.6 | 3.3.1, 4.2 |
| `MODAL_SINGLE_THREAD_LIMIT` | 1.10, 2.6 | 3.3.3, 4.2 |
| `MODAL_PARALLEL_INTRO` | 1.10, 2.6 | 3.3.3, 4.2 |
| `MODAL_CONFLICT` | 1.10, 2.6 | 3.4.3, 4.3 |
| `MODAL_LOCK_INTRO` | 1.10, 2.6 | 3.4.3, 4.3 |
| `MODAL_COMPLETE` | 1.10, 2.6 | 3.4.5, 4.3 |

### 5.5 Timing Terms -> Logic Usage

| Timing Term | Declared In | Used In Logic Sections |
|---|---|---|
| `TIMER_SUBTASK_BASE_MS` | 1.11 | 3.2.2, 3.3.2, 3.4.2 |
| `TIMER_QUEUE_POLL_MS` | 1.11 | 3.2.2 |
| `TIMER_CONFLICT_FLASH_MS` | 1.11 | 3.4.3 |
| `TIMER_LOCK_WAIT_MS` | 1.11 | 3.4.4 |

### 5.6 Counter Terms -> Logic Usage

| Counter Term | Declared In | Used In Logic Sections |
|---|---|---|
| `COUNT_APPS_TO_TRIGGER_WALL` | 1.15 | 2.6, 3.2.3, 4.1, 4.5 |
| `COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO` | 1.15 | 3.3.2, 4.2, 4.5 |
| `COUNT_CONFLICT_APPS` | 1.15 | 3.4.2, 4.5 |

### 5.7 Arrow Terms -> Logic Usage

| Arrow Term | Declared In | Used In Logic Sections |
|---|---|---|
| `ARROW_DEPENDENCY` | 1.16 | 3.4.1 |
| `ARROW_CORE_ASSIGNMENT` | 1.16 | 3.4.2, 4.5 |
| `ARROW_RESOURCE_LOCK` | 1.16 | 3.4.4 |

---

## 6) Hard Invariants

All implementations derived from this blueprint must preserve every invariant below.

1. In `MODE_SINGLE_CORE`, all subtasks must execute sequentially on `SPACE_CORE_1` only. `SPACE_CORE_2` must be hidden.
2. Dragging from `SPACE_APP_POOL` must be blocked while any subtask is `STATUS_PROCESSING` or `STATUS_QUEUED` (in `MODE_SINGLE_CORE` and `MODE_DUAL_CORE`).
3. In `PHASE_DUAL_IDLE`, all subtasks must route to `SPACE_CORE_1` regardless of `SPACE_CORE_2` availability.
4. In `PHASE_DUAL_SCHEDULER`, the scheduler must route entire app subtask chains to one core — subtasks of the same app do not split across cores.
5. In `MODE_PARALLEL`, subtask assignment to a core must validate `dependsOn` — reject if any dependency is not `STATUS_DONE`.
6. `EVENT_CONFLICT_DETECTED` must fire only when two subtasks accessing the same `RESOURCE_*` are both `STATUS_PROCESSING` on different cores simultaneously.
7. Lock mechanism must prevent `STATUS_CONFLICT` by forcing `STATUS_LOCKED` wait on the second accessor.
8. `APP_VIDEO` subtasks `VIDEO_LOAD_CODEC` and `VIDEO_LOAD_GPU` must have no mutual dependency — they must be independently assignable.
9. `VIDEO_RENDER` must depend on both `VIDEO_LOAD_CODEC` and `VIDEO_LOAD_GPU` — it must not become available until both are `STATUS_DONE`.
10. Pool mutation must satisfy `POOL_MUTATION_SCOPED`, `POOL_MUTATION_INCREMENTAL`, and `POOL_PRESERVE_UNAFFECTED` at all times.
11. `PHASE_SINGLE_WALL` trigger threshold must be controlled by `COUNT_APPS_TO_TRIGGER_WALL`, not ad hoc numeric literals.
12. Dual-core routing demonstration threshold must be controlled by `COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO`.
13. Conflict scenario must involve exactly `COUNT_CONFLICT_APPS` active apps in the canonical design path.
14. `ARROW_*` overlays must only reference currently rendered `SPACE_*` IDs.

---

## 7) Non-Goals

1. This blueprint does not implement time-slicing or context switching on a single core.
2. This blueprint does not implement hyper-threading (SMT). Core 2 Duo did not have it.
3. This blueprint does not mandate behavior-rule-only architecture.
4. This blueprint does not define visual theme or typography decisions.
5. This blueprint does not require decorative arrows beyond canonical `ARROW_*` semantics.
6. This blueprint does not simulate deadlock — only simple resource conflict and locking.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update Section 1 if new concepts are introduced.
2. Update Section 2 declarations for structural changes.
3. Update Section 3 logic with canonical terms only.
4. Update Section 4 transition matrices.
5. Update Section 5 term-link index.
6. Re-check Section 6 invariants.
7. Update Section 9 for any unresolved decisions.

### 8.2 Consistency Checks

- Each logic sentence should reference at least one canonical ID family (`PHASE_*`, `ENTITY_*`, `SPACE_*`, `EVENT_*`, `MODAL_*`, `TIMER_*`, `MODE_*`).
- No undeclared synonyms should appear in transition-critical paragraphs.
- Every `PHASE_*` used in Sections 3 and 4 must exist in Section 1.9.
- Every modal action used in Section 4.4 must exist in Section 1.10.
- Every timer mentioned in logic must exist in Section 1.11.
- Every `dependsOn` reference in subtask catalogues must point to a valid subtask ID within the same app.
- Every numeric progression threshold in logic must map to a `COUNT_*` term in Section 1.15.
- Every arrow usage in logic must map to an `ARROW_*` term in Section 1.16.

### 8.3 Quality Gates

When code behavior changes, run:
- `pnpm check:biome`
- `pnpm check:tsc`

For docs-only updates:
- Validate section order and internal references.
- Validate all tables preserve one-to-one declaration-to-logic mapping.

---

## 9) Product Gap Register

This section is mandatory for unresolved product decisions. Items here are intentionally close-ended.

### 9.1 `GAP_TIMING_TUNING`

- Current default: keep subtask durations from Section 1.7 and keep `TIMER_LOCK_WAIT_MS=1500`.
- Owner must confirm:
  - Keep current durations as-is.
  - Reduce all durations by a global multiplier (for example `0.75x`).
  - Increase all durations by a global multiplier (for example `1.25x`).

### 9.2 `GAP_FAILURE_RECOVERY`

- Current default: unlimited retries for blocked subtask assignments with hint-only feedback.
- Owner must confirm:
  - Keep unlimited retries.
  - Limit to a fixed retry count before guided auto-correction.
  - Always auto-correct after the first invalid assignment.

### 9.3 `GAP_SCORING`

- Current default: no numeric score; completion is binary.
- Owner must confirm:
  - Keep binary completion.
  - Add optional star rating (speed + correctness + lock usage).
  - Add explicit numeric score.

### 9.4 `GAP_ACCESSIBILITY_COPY`

- Current default: canonical hints and modal text only.
- Owner must confirm:
  - Keep current copy only.
  - Add reduced-motion copy variants.
  - Add screen-reader-specific narration lines for `STATUS_*` transitions.
