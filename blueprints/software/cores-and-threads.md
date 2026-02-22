# Cores & Threads Blueprint

Declaration-first blueprint for `cores-and-threads`.
This document defines the target design for the web-server-based teaching arc.

Canonical engine references:
- `src/components/game/doc/README.md`
- `src/components/game/doc/question-definition.md`
- `src/components/game/doc/runtime-api.md`
- `src/components/game/doc/behavior-system.md`
- `src/components/game/doc/components.md`

---

## 0) Reading Protocol

### 0.1 Purpose

This blueprint defines the full redesign of the cores-and-threads question around a web server teaching arc. The learner observes a real backend phenomenon — request handling under load — and discovers why threading exists through structured, escalating failure.

### 0.2 Mandatory Reading Order

1. Section `1) Canonical Term Dictionary`
2. Section `2) Teaching Arc`
3. Section `3) Declarative Specification`
4. Section `4) Lifecycle and Logic Specification`
5. Section `5) Transition Matrices`
6. Section `6) Paperclip Character Contract`
7. Section `7) Hard Invariants`
8. Section `8) Non-Goals`
9. Section `9) Authoring and Verification Protocol`
10. Section `10) Product Gap Register`

### 0.3 No-Synonym Rule

- If logic references a concept, use the canonical term ID from Section 1.
- If a new concept is required, add it to Section 1 first.

### 0.4 Scope Boundary

- This blueprint is the target design. Sections marked `GAP_*` track unimplemented behavior.
- Do not assume a phase is active unless behavior rules and UI wiring both exist.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value | Meaning |
|---|---|---|
| `QUESTION_ID` | `cores-and-threads` | Unique question identifier |
| `QUESTION_TITLE` | `🖥️ Your Web Server` | Display title |
| `QUESTION_DESCRIPTION` | `Run a web server and discover why threads exist.` | Display description |

### 1.2 Phase Terms

| Term ID | Value | Meaning |
|---|---|---|
| `PHASE_BOOT` | `boot` | Server is off. Learner starts it. |
| `PHASE_SINGLE_CORE_SUCCESS` | `single-core-success` | One core handles low traffic successfully. |
| `PHASE_OVERLOAD` | `overload` | Traffic spikes. Queue backs up. Requests time out. |
| `PHASE_ADD_CORES` | `add-cores` | Learner adds cores. Traffic handled. |
| `PHASE_IO_WALL` | `io-wall` | Higher traffic exposes cores blocked on IO. |
| `PHASE_THREADS` | `threads` | Learner adds threads. IO wait freed. System snappy. |
| `PHASE_COMPLETE` | `complete` | Mastery demonstrated. Question complete. |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Meaning |
|---|---|---|---|
| `SPACE_REQUEST_QUEUE` | `request-queue` | `pool` | Incoming HTTP requests waiting to be picked up |
| `SPACE_SERVER_LANE` | `server-lane-{n}` | `path` | One webserver listener lane per active core |
| `SPACE_DB_PATH` | `db-path` | `path` | U-shaped path simulating database query + IO wait |
| `SPACE_DISK_PATH` | `disk-path` | `path` | U-shaped path simulating disk read + IO wait |
| `SPACE_IO_WAIT` | `io-wait` | `grid` | Holding grid for requests paused during IO (visible after thread unlock) |
| `SPACE_UPGRADE` | `upgrade` | `grid` | Drop target for core and thread items from inventory |
| `SPACE_INVENTORY` | `inventory` | `pool` | Learner's available upgrade items (cores, threads) |
| `SPACE_COMPLETED` | `completed` | `grid` | Destination for fully served requests |

### 1.4 Entity Family Terms

| Term ID | Family | Meaning |
|---|---|---|
| `ENTITY_REQUEST` | `request` | An HTTP request travelling through the system |
| `ENTITY_IO_SUBTASK` | `io-subtask` | Transient entity travelling the db or disk path |
| `ENTITY_CORE` | `core` | Draggable upgrade item; adds a server lane when dropped |
| `ENTITY_THREAD` | `thread` | Draggable upgrade item; enables IO offloading when dropped |

### 1.5 Request Catalogue

| Request Type | Path | IO Behaviour | Teaching Moment |
|---|---|---|---|
| `GET /` | `SPACE_SERVER_LANE` → `SPACE_DISK_PATH` → `SPACE_COMPLETED` | Pauses at disk IO midpoint | Disk wait halts core |
| `POST /login` | `SPACE_SERVER_LANE` → `SPACE_DB_PATH` → `SPACE_COMPLETED` | Pauses at db IO midpoint | DB query wait halts core |

### 1.6 Request Status Terms

| Term ID | UI Label | Meaning |
|---|---|---|
| `STATUS_QUEUED` | `Queued` | Request is in `SPACE_REQUEST_QUEUE` |
| `STATUS_PROCESSING` | `Processing` | Request is moving through server lane |
| `STATUS_IO_WAIT` | `Waiting for I/O` | Request is paused, IO subtask in flight |
| `STATUS_COMPLETED` | `Done` | Request fully served |
| `STATUS_TIMEOUT` | `Timed out` | Request waited too long in queue and failed |

### 1.7 Upgrade Item Terms

| Term ID | Item ID | Inventory Count | Effect When Dropped |
|---|---|---|---|
| `ITEM_CORE` | `core-{n}` | Starts at 0; given to learner at `PHASE_ADD_CORES` | Adds one `SPACE_SERVER_LANE` path |
| `ITEM_THREAD` | `thread-{n}` | Starts at 0; given to learner at `PHASE_THREADS` | Enables IO offloading for all server lanes |

### 1.8 Metric Terms

| Term ID | Meaning | Used By Gates |
|---|---|---|
| `METRIC_REQUESTS_PER_SEC` | Current throughput | Phase transition condition |
| `METRIC_QUEUE_DEPTH` | Number of requests waiting in `SPACE_REQUEST_QUEUE` | Overload trigger |
| `METRIC_TIMEOUT_COUNT` | Total timed-out requests | Overload failure condition |
| `METRIC_CORE_COUNT` | Number of active server lanes | Unlock and gate conditions |
| `METRIC_THREADS_ENABLED` | Whether thread offloading is active | Phase 5 gate |

### 1.9 Timing Terms

| Term ID | Value | Meaning |
|---|---|---|
| `TIMER_REQUEST_SPAWN_MS` | `1200` | Interval between new requests spawning in phase 1 |
| `TIMER_SPAWN_SPIKE_MS` | `300` | Interval during traffic spike in phase 2 |
| `TIMER_IO_DURATION_MS` | `4000` | Time request spends blocked at IO path |
| `TIMER_IO_OFFLOAD_MS` | `400` | Time IO subtask takes when thread offloading is active |
| `TIMER_TIMEOUT_THRESHOLD_MS` | `3000` | Time in queue before request times out |
| `TIMER_NOTICE_MS` | `2000` | Auto-clear for transient notice text |

### 1.10 Modal Terms

| Term ID | Modal ID | When Triggered |
|---|---|---|
| `MODAL_BOOT_PROMPT` | `boot-prompt` | `PHASE_BOOT` start |
| `MODAL_OVERLOAD_HIT` | `overload-hit` | First timeout event |
| `MODAL_CORES_INTRO` | `cores-intro` | `PHASE_ADD_CORES` entry |
| `MODAL_IO_WALL_HIT` | `io-wall-hit` | IO wall failure condition met |
| `MODAL_THREADS_INTRO` | `threads-intro` | `PHASE_THREADS` entry |
| `MODAL_COMPLETE` | `complete` | Mastery gate passed |

### 1.11 Paperclip Character Terms

| Term ID | Meaning |
|---|---|
| `CLIP_LINE` | A single paperclip character dialogue line |
| `CLIP_TRIGGER` | The game event that causes the line to appear |
| `CLIP_TONE` | `observe` / `question` / `diagnose` / `affirm` |

### 1.12 Component Terms

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
| `COMP_PAPERCLIP` | `PaperclipCharacter` — renders dialogue bubble |
| `COMP_METRICS_BAR` | `MetricsBar` — displays live `METRIC_*` counters |

---

## 2) Teaching Arc

This section is the canonical narrative. Implementation must honour this arc exactly.

### 2.1 Arc Summary

The learner runs a web server. They start it, watch it succeed, watch it break under load, add cores to partially fix it, discover cores alone cannot solve IO blocking, then add threads to solve the root problem. Each phase ends when the learner either causes or witnesses a specific consequence that makes the next concept necessary.

### 2.2 Phase 1 — Boot (`PHASE_BOOT`)

**Goal:** Give the learner ownership over the system before anything breaks.

The screen shows a dark, idle server. No requests are flowing. A terminal-style prompt reads `./start-server`. The learner clicks or interacts with it. This is the only action they can take.

On boot, `PHASE_SINGLE_CORE_SUCCESS` begins automatically.

**Why this matters:** The learner must feel they turned it on. When it breaks later, it is their server that broke.

### 2.3 Phase 2 — Single Core Success (`PHASE_SINGLE_CORE_SUCCESS`)

**Goal:** Establish the mental model of how requests travel through the system before anything fails.

Requests arrive in `SPACE_REQUEST_QUEUE` one at a time at `TIMER_REQUEST_SPAWN_MS` intervals. The single `SPACE_SERVER_LANE` picks them up automatically. Each request routes to either `SPACE_DISK_PATH` (GET /) or `SPACE_DB_PATH` (POST /login) for IO, pauses visibly during IO, then completes and moves to `SPACE_COMPLETED`.

The learner does nothing except observe. The IO pause is visible — the request stops mid-path, a subtask entity travels the U-shape and returns, then the request continues.

`METRIC_REQUESTS_PER_SEC` counter is visible and green. `METRIC_QUEUE_DEPTH` stays at 0 or 1.

After a short success window (configurable, ~8 seconds), the system automatically enters `PHASE_OVERLOAD`.

**What the learner sees:** Requests flow smoothly. IO causes a visible pause. One request at a time through the lane. This is normal.

### 2.4 Phase 3 — Overload (`PHASE_OVERLOAD`)

**Goal:** Make the learner feel the failure, not just see it. The failure must be caused by the architecture they just watched succeed, not by an arbitrary event.

Request spawn interval drops to `TIMER_SPAWN_SPIKE_MS`. The queue fills faster than the single lane can process. Because requests block on IO, the lane is frozen while new requests pile up behind it.

After `TIMER_TIMEOUT_THRESHOLD_MS`, queued requests begin timing out. Their status flips to `STATUS_TIMEOUT` and they disappear from the queue with a visual failure state.

`METRIC_TIMEOUT_COUNT` climbs. `METRIC_QUEUE_DEPTH` is deep and red. The paperclip character reacts.

The learner has no action available during this phase. They watch. The helplessness is intentional — it surfaces the architectural question.

`MODAL_OVERLOAD_HIT` fires on the first timeout. The modal names the problem: the single core is blocking on IO and everything else waits. It presents the option to add cores. On acknowledgement, `PHASE_ADD_CORES` begins.

**What the learner feels:** Their server is failing and they can do nothing. They need a lever.

### 2.5 Phase 4 — Add Cores (`PHASE_ADD_CORES`)

**Goal:** Let the learner fix the immediate problem and feel the win — but plant the seed of the next problem.

One or two `ENTITY_CORE` items appear in `SPACE_INVENTORY`. The learner can drag a core to `SPACE_UPGRADE`. Each dropped core adds one `SPACE_SERVER_LANE` path.

With more lanes, requests are distributed and the queue clears. `METRIC_TIMEOUT_COUNT` stops climbing. The system feels fast again.

However, cores visually freeze during IO wait. The lanes are occupied but not processing. If the learner watches long enough — or if the system runs another small traffic ramp — cores pile up on IO waits and the queue starts backing up again.

The paperclip notices aloud that the cores are just sitting there waiting.

`PHASE_IO_WALL` begins when `METRIC_TIMEOUT_COUNT` increments again after cores were added, or after a scripted observation window.

**What the learner discovers:** More cores helped but the cores themselves are the bottleneck when they block on IO. The problem is not how many cores, it's what the cores do while waiting.

### 2.6 Phase 5 — IO Wall (`PHASE_IO_WALL`)

**Goal:** Sharpen the diagnosis. The learner must see that the cores are idle-but-occupied during IO, not overworked.

`MODAL_IO_WALL_HIT` fires. It names the observation: every core is waiting for IO. The CPU is free but the lanes are blocked. It introduces the concept of a thread — something that lets the core hand off the IO wait and pick up the next request instead.

`SPACE_IO_WAIT` grid becomes visible on screen. This is where a request will park while its IO completes, freeing the lane.

`PHASE_THREADS` begins on modal acknowledgement.

**What the learner understands:** The bottleneck is not throughput capacity — it is blocked waiting time. A different tool is needed.

### 2.7 Phase 6 — Threads (`PHASE_THREADS`)

**Goal:** Let the learner apply the solution and observe the before/after difference through the same system they already know.

`ENTITY_THREAD` items appear in `SPACE_INVENTORY`. The learner drags a thread item to `SPACE_UPGRADE`. `METRIC_THREADS_ENABLED` flips to true.

With threads enabled, when a request reaches IO mid-path instead of freezing the lane, it moves to `SPACE_IO_WAIT`. The IO subtask travels its path independently. The lane immediately picks up the next request from the queue. When IO completes, the waiting request returns to an available lane and finishes.

The queue stays shallow. Cores stay busy with real work. `METRIC_TIMEOUT_COUNT` stops. The system is visibly more efficient.

`MODAL_COMPLETE` fires once the mastery gate passes. The paperclip character affirms the discovery.

**What the learner experiences:** The same traffic load that broke the system is now handled cleanly. The only difference is that cores no longer wait — they hand off blocking work and keep moving.

---

## 3) Declarative Specification

### 3.1 Meta Declaration

- `QUESTION_ID` equals `cores-and-threads`.
- `QUESTION_TITLE` and `QUESTION_DESCRIPTION` match constants.

### 3.2 Space Declaration

#### 3.2.1 Space Set

| Space Term | Phase Visibility |
|---|---|
| `SPACE_REQUEST_QUEUE` | All phases from `PHASE_SINGLE_CORE_SUCCESS` |
| `SPACE_SERVER_LANE` (1 initially) | All phases from `PHASE_SINGLE_CORE_SUCCESS` |
| `SPACE_DISK_PATH` | All phases from `PHASE_SINGLE_CORE_SUCCESS` |
| `SPACE_DB_PATH` | All phases from `PHASE_SINGLE_CORE_SUCCESS` |
| `SPACE_IO_WAIT` | Revealed at `PHASE_IO_WALL` |
| `SPACE_UPGRADE` | Revealed at `PHASE_ADD_CORES` |
| `SPACE_INVENTORY` | Revealed at `PHASE_ADD_CORES` |
| `SPACE_COMPLETED` | All phases from `PHASE_SINGLE_CORE_SUCCESS` |

#### 3.2.2 Space Roles

| Space Term | Role | Allowed Interaction |
|---|---|---|
| `SPACE_REQUEST_QUEUE` | Incoming request buffer | No manual drag. System-spawned only. |
| `SPACE_SERVER_LANE` | Request processing path | No manual drag. Automatic pickup from queue. |
| `SPACE_DISK_PATH` | Disk IO simulation path (U-shape) | No manual drag. Triggered by GET / requests. |
| `SPACE_DB_PATH` | Database IO simulation path (U-shape) | No manual drag. Triggered by POST /login requests. |
| `SPACE_IO_WAIT` | Parked IO-waiting requests | No manual drag. Populated by thread offload behavior. |
| `SPACE_UPGRADE` | Upgrade drop target | Learner drops `ENTITY_CORE` and `ENTITY_THREAD` here. |
| `SPACE_INVENTORY` | Learner upgrade inventory | Learner drags items from here to `SPACE_UPGRADE`. |
| `SPACE_COMPLETED` | Finished requests | No manual drag. System-assigned on completion. |

### 3.3 Entity Declaration

#### 3.3.1 Entity Inventory

| Entity Term | Count | Initial Placement | Lifecycle |
|---|---|---|---|
| `ENTITY_REQUEST` | Spawned by system | `SPACE_REQUEST_QUEUE` | queue → lane → IO path → completed or timeout |
| `ENTITY_IO_SUBTASK` | Transient, one per IO pause | spawned into IO path | travels IO path, deleted on return |
| `ENTITY_CORE` | 1–2 given at `PHASE_ADD_CORES` | `SPACE_INVENTORY` | dragged to `SPACE_UPGRADE`, consumed |
| `ENTITY_THREAD` | 1 given at `PHASE_THREADS` | `SPACE_INVENTORY` | dragged to `SPACE_UPGRADE`, consumed |

#### 3.3.2 Request Routing Contract

- `GET /` requests route to `SPACE_DISK_PATH` for IO.
- `POST /login` requests route to `SPACE_DB_PATH` for IO.
- IO routing is determined at request creation time, not at lane entry.

#### 3.3.3 Request Metadata Contract

- `ENTITY_REQUEST` carries: `requestType`, `requestStatus`, `spawnTime`, `ioPath`, `ownerLaneId`.
- `ENTITY_IO_SUBTASK` carries: `ownerRequestId`, `ioPath`, `ioState` (`pending` / `returning`).

### 3.4 Phase Declaration

#### 3.4.1 Phase Order

1. `PHASE_BOOT`
2. `PHASE_SINGLE_CORE_SUCCESS`
3. `PHASE_OVERLOAD`
4. `PHASE_ADD_CORES`
5. `PHASE_IO_WALL`
6. `PHASE_THREADS`
7. `PHASE_COMPLETE`

#### 3.4.2 Phase Transition Conditions

| From | To | Condition |
|---|---|---|
| `PHASE_BOOT` | `PHASE_SINGLE_CORE_SUCCESS` | Learner activates start-server command |
| `PHASE_SINGLE_CORE_SUCCESS` | `PHASE_OVERLOAD` | Auto after success window (~8s) |
| `PHASE_OVERLOAD` | `PHASE_ADD_CORES` | Learner acknowledges `MODAL_OVERLOAD_HIT` |
| `PHASE_ADD_CORES` | `PHASE_IO_WALL` | `METRIC_TIMEOUT_COUNT` increments again after core was added, or observation window ends |
| `PHASE_IO_WALL` | `PHASE_THREADS` | Learner acknowledges `MODAL_IO_WALL_HIT` |
| `PHASE_THREADS` | `PHASE_COMPLETE` | Mastery gate: `METRIC_THREADS_ENABLED=true` and `METRIC_TIMEOUT_COUNT` has not incremented for 10 seconds |

### 3.5 Upgrade Mechanic Declaration

- `SPACE_UPGRADE` accepts `ENTITY_CORE` and `ENTITY_THREAD` drops.
- Dropping `ENTITY_CORE` adds one `SPACE_SERVER_LANE` to the system. `METRIC_CORE_COUNT` increments.
- Dropping `ENTITY_THREAD` sets `METRIC_THREADS_ENABLED=true`. All server lanes gain IO offload behavior.
- Each upgrade item is consumed on drop and removed from inventory.

---

## 4) Lifecycle and Logic Specification

### 4.1 Boot Phase Logic

1. Screen shows idle server, no spawning, no animation.
2. Start-server command UI is the only interactive element.
3. Learner activates it. `PHASE_SINGLE_CORE_SUCCESS` begins.
4. `MODAL_BOOT_PROMPT` fires before learner can interact, framing the scenario.

### 4.2 Request Spawn Logic

- In `PHASE_SINGLE_CORE_SUCCESS`: spawn one request every `TIMER_REQUEST_SPAWN_MS`.
- In `PHASE_OVERLOAD` and beyond: spawn one request every `TIMER_SPAWN_SPIKE_MS`.
- Request type alternates or is pseudo-randomly selected between `GET /` and `POST /login`.
- Spawned request appears in `SPACE_REQUEST_QUEUE` with `STATUS_QUEUED`.

### 4.3 Lane Pickup Logic

- Each `SPACE_SERVER_LANE` runs a pickup loop: if not occupied, take the first `STATUS_QUEUED` request from `SPACE_REQUEST_QUEUE`.
- When `METRIC_THREADS_ENABLED=false` (no threads): lane is occupied until IO completes and request reaches `SPACE_COMPLETED`.
- When `METRIC_THREADS_ENABLED=true` (threads active): lane is freed when request offloads to `SPACE_IO_WAIT`, available to pick up next request immediately.

### 4.4 IO Path Logic

#### 4.4.1 Without Threads

1. Request travels `SPACE_SERVER_LANE` and pauses at IO midpoint.
2. `ENTITY_IO_SUBTASK` is created and travels IO path (`SPACE_DISK_PATH` or `SPACE_DB_PATH`).
3. Owner request status set to `STATUS_IO_WAIT`. Lane is blocked.
4. IO subtask returns. Owner request resumes. Lane stays blocked throughout.
5. Request completes, moves to `SPACE_COMPLETED`. Lane freed.

#### 4.4.2 With Threads

1. Request travels `SPACE_SERVER_LANE` and reaches IO point.
2. Request moves to `SPACE_IO_WAIT`. Lane is immediately freed.
3. `ENTITY_IO_SUBTASK` is created and travels IO path.
4. Lane picks up next queued request immediately.
5. IO subtask returns. Request moves from `SPACE_IO_WAIT` back to any free lane.
6. Request completes, moves to `SPACE_COMPLETED`.

### 4.5 Timeout Logic

- Every `ENTITY_REQUEST` in `SPACE_REQUEST_QUEUE` tracks `spawnTime`.
- If `now - spawnTime > TIMER_TIMEOUT_THRESHOLD_MS`, request status flips to `STATUS_TIMEOUT`.
- Timed-out request is removed from queue with a visible failure animation.
- `METRIC_TIMEOUT_COUNT` increments.

### 4.6 Metrics Logic

- `METRIC_REQUESTS_PER_SEC`: rolling count of requests reaching `SPACE_COMPLETED` in last second.
- `METRIC_QUEUE_DEPTH`: live count of entities in `SPACE_REQUEST_QUEUE`.
- `METRIC_TIMEOUT_COUNT`: cumulative count of `STATUS_TIMEOUT` events.
- `METRIC_CORE_COUNT`: count of active `SPACE_SERVER_LANE` spaces.
- `METRIC_THREADS_ENABLED`: boolean, flipped by thread upgrade drop.

All metrics are read from behavior context. `COMP_METRICS_BAR` renders them.

---

## 5) Transition Matrices

### 5.1 Phase Transition Matrix

| Current Phase | Trigger | Condition | Next Phase |
|---|---|---|---|
| `PHASE_BOOT` | Learner action | start-server activated | `PHASE_SINGLE_CORE_SUCCESS` |
| `PHASE_SINGLE_CORE_SUCCESS` | Timer | success window elapsed | `PHASE_OVERLOAD` |
| `PHASE_OVERLOAD` | Modal action | `MODAL_OVERLOAD_HIT` acknowledged | `PHASE_ADD_CORES` |
| `PHASE_ADD_CORES` | Metric or timer | second timeout after core added | `PHASE_IO_WALL` |
| `PHASE_IO_WALL` | Modal action | `MODAL_IO_WALL_HIT` acknowledged | `PHASE_THREADS` |
| `PHASE_THREADS` | Mastery gate | threads enabled + no timeout for 10s | `PHASE_COMPLETE` |

### 5.2 Request Lifecycle Matrix

| Current State | Event | Condition | Effect | Next State |
|---|---|---|---|---|
| `STATUS_QUEUED` | Lane pickup | lane free | request enters lane | `STATUS_PROCESSING` |
| `STATUS_QUEUED` | Timeout check | age > `TIMER_TIMEOUT_THRESHOLD_MS` | removed, `METRIC_TIMEOUT_COUNT++` | `STATUS_TIMEOUT` |
| `STATUS_PROCESSING` | IO midpoint reached | threads disabled | lane blocked, IO subtask spawned | `STATUS_IO_WAIT` |
| `STATUS_PROCESSING` | IO midpoint reached | threads enabled | request parks in `SPACE_IO_WAIT`, lane freed | `STATUS_IO_WAIT` |
| `STATUS_IO_WAIT` | IO subtask returns | owner request found | request resumes in lane | `STATUS_PROCESSING` |
| `STATUS_PROCESSING` | Lane end reached | all steps done | moved to `SPACE_COMPLETED` | `STATUS_COMPLETED` |

### 5.3 Upgrade Drop Matrix

| Item Dropped | Space | Condition | Effect |
|---|---|---|---|
| `ENTITY_CORE` | `SPACE_UPGRADE` | `PHASE_ADD_CORES` active | add one `SPACE_SERVER_LANE`, `METRIC_CORE_COUNT++`, consume item |
| `ENTITY_THREAD` | `SPACE_UPGRADE` | `PHASE_THREADS` active | `METRIC_THREADS_ENABLED=true`, consume item |

---

## 6) Paperclip Character Contract

The paperclip character speaks in reactions and questions. It never gives instructions. It models the learner's own confusion back at them and names what is observable — not what to do about it.

### 6.1 Dialogue Script

| `CLIP_TRIGGER` | `CLIP_TONE` | `CLIP_LINE` |
|---|---|---|
| `PHASE_SINGLE_CORE_SUCCESS` start | `observe` | "Smooth. Requests are flowing." |
| First IO pause visible | `observe` | "Huh. It stopped. Waiting for something." |
| `PHASE_OVERLOAD` start | `observe` | "The queue is growing." |
| First `STATUS_TIMEOUT` | `question` | "Users are complaining. But why is everything just... waiting?" |
| Core added in `PHASE_ADD_CORES` | `observe` | "More lanes. That helped." |
| Core visibly frozen on IO | `question` | "That core isn't doing anything. It's just... sitting there." |
| `PHASE_IO_WALL` trigger | `diagnose` | "More cores, same problem. The cores aren't the bottleneck." |
| Thread added in `PHASE_THREADS` | `observe` | "The lane didn't stop. It just handed the wait off." |
| Mastery gate passed | `affirm` | "Now the cores work while they wait. That's the trick." |

### 6.2 Dialogue Rules

- One line per trigger. Never more than one line at a time.
- Never repeat the same line in the same session.
- Dialogue does not appear during modal display.
- Tone must follow the arc: observe → question → diagnose → affirm. Never jump to affirm early.

---

## 7) Hard Invariants

1. The learner must boot the server manually before any requests spawn.
2. `PHASE_OVERLOAD` must begin automatically — the learner takes no action to cause the spike.
3. No upgrade items are available before their designated phase.
4. `ENTITY_CORE` drops must each add exactly one `SPACE_SERVER_LANE`.
5. `ENTITY_THREAD` drop must set `METRIC_THREADS_ENABLED=true` globally for all lanes.
6. Without threads, a lane occupied by a request in `STATUS_IO_WAIT` must not accept new requests.
7. With threads, a lane must free immediately when a request moves to `SPACE_IO_WAIT`.
8. `METRIC_TIMEOUT_COUNT` must be cumulative and never reset between phases.
9. The paperclip character must never give instructions — only observations, questions, and diagnoses.
10. `onQuestionComplete` must only be called after mastery gate conditions are met in `PHASE_COMPLETE`.
11. Request routing to IO path (`disk` vs `db`) is fixed at spawn time by request type.
12. Phases must advance in declared order. No phase may be skipped.

---

## 8) Non-Goals

1. This design does not simulate multi-threaded race conditions or locking.
2. This design does not model OS-level thread scheduling internals.
3. This design does not allow the learner to manually route requests.
4. This design does not include a performance scoring system.
5. This design does not simulate actual network latency or TCP behaviour.
6. The IO path duration is deliberately exaggerated for visibility. It does not represent real IO timing.

---

## 9) Authoring and Verification Protocol

### 9.1 Authoring Steps

1. Update Section 1 terms before changing semantics.
2. Keep Section 3 declarations synchronized with runtime definition.
3. Update Section 4 logic for behavior rule changes.
4. Update Section 5 matrices for event/transition changes.
5. Update Section 6 paperclip script when new triggers are added.
6. Record unfinished behavior under Section 10.

### 9.2 Consistency Checks

- Every referenced `SPACE_*` exists in runtime definition spaces.
- Every phase in Section 3.4.1 has a corresponding transition row in Section 5.1.
- Every modal in Section 1.10 has a defined trigger condition.
- Paperclip lines in Section 6.1 map to real game events.
- Upgrade effects in Section 3.5 match Section 5.3 matrix rows.

### 9.3 Quality Gates

When code behavior changes, run:
- `pnpm check:biome`
- `pnpm check:tsc`

For docs-only updates:
- Validate section order and term consistency.
- Validate table rows map to current constants and behaviors.

---

## 10) Product Gap Register

### 10.1 `GAP_FULL_IMPLEMENTATION`

- Current state: this blueprint defines target design. No implementation exists yet.
- Previous implementation (`parallel-multicore`) used apps and a single-core lane model.
- Migration requires: new space definitions, request entity model, spawn behavior, IO path behavior, upgrade mechanic, metrics bar, paperclip component, and phase state machine.

### 10.2 `GAP_PAPERCLIP_COMPONENT`

- `COMP_PAPERCLIP` is specified but not yet implemented.
- Requires: dialogue state in behavior context, render component, trigger wiring in behavior rules.

### 10.3 `GAP_METRICS_BAR`

- `COMP_METRICS_BAR` is specified but not yet implemented.
- Requires: live reads from behavior context for all `METRIC_*` values.

### 10.4 `GAP_THREAD_OFFLOAD_PATH`

- `SPACE_IO_WAIT` grid and thread-offload lane behavior are specified but not yet implemented.
- This is the most complex new behavior: freeing lanes mid-request and re-routing after IO completes.

### 10.5 `GAP_MASTERY_GATE`

- Mastery gate condition (threads enabled + no timeout for 10s) is specified but not yet wired to `onQuestionComplete`.
