# Event Acknowledgment System Refactoring Plan

## Problem Analysis

Based on my analysis of the codebase, the current event acknowledgment system has a critical architectural flaw:

1. **Single Global Event Stream**: The `useGameEvents()` hook provides one global event queue that all engines share
2. **Shared Cursor**: All engines use the same `cursor` state to track which events they've processed
3. **Race Condition**: When multiple engines run simultaneously, they compete for the same events
4. **Inefficient Processing**: Only one engine actually consumes events effectively, others miss their events

## Current Implementation Issues

In `useEvents.ts`:
- All engines get the same `events` array filtered by `cursor`
- When any engine calls `ack()`, it advances the global cursor
- This means if Terminal engine processes events and calls `ack()`, Drag engine will miss those events

## Solution Design

I need to create engine-specific event streams with isolated cursors. The key insight is that each engine should have its own event consumption mechanism instead of sharing one global stream.

## Proposed Implementation

### Step 1: Create Engine-Specific Event Hook
Instead of `useGameEvents()`, create `useEngineEvents(engineId)` that provides:
- Engine-specific event queue
- Engine-specific cursor
- Engine-specific ack mechanism

### Step 2: Update Engine Implementations
Modify engines to use their own event streams:
- Terminal engine: `useEngineEvents("terminal")`
- Drag engine: `useEngineEvents("drag")`
