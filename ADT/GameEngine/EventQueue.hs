{-# LANGUAGE NamedFieldPuns #-}

module GameEngine.EventQueue where

import Data.List (foldl')
import Data.Map.Strict qualified as Map
import GameEngine.Types.Common
import GameEngine.Types.Event
import GameEngine.Types.State

getNextActionId :: GameEventQueue -> ActionId
getNextActionId GameEventQueue {queueLastActionId} = queueLastActionId + 1

appendEvents :: ActionId -> [EventPayload] -> GameEventQueue -> GameEventQueue
appendEvents actionId payloads queue@GameEventQueue {queueEvents, queueLastEventId}
  | null payloads = queue
  | otherwise =
      let (eventsToAppend, nextEventId) =
            foldl'
              ( \(acc, currentEventId) payload ->
                  let eid = currentEventId + 1
                   in (acc ++ [GameEvent (EventMeta eid actionId Nothing) payload], eid)
              )
              ([], queueLastEventId)
              payloads
       in queue
            { queueEvents = queueEvents ++ eventsToAppend,
              queueLastEventId = nextEventId,
              queueLastActionId = actionId
            }

pendingEventsFor :: EngineId -> GameState -> [GameEvent]
pendingEventsFor engineId GameState {gsEventQueue = GameEventQueue {queueEvents}, gsEventCursors} =
  let cursor = Map.findWithDefault 0 engineId gsEventCursors
   in filter (\GameEvent {gameEventMeta = EventMeta {eventId}} -> eventId > cursor) queueEvents

ackEvents :: EngineId -> EventId -> GameState -> GameState
ackEvents engineId cursor state@GameState {gsEventQueue = GameEventQueue {queueLastEventId}, gsEventCursors} =
  let nextCursor = min cursor queueLastEventId
      currentCursor = Map.findWithDefault 0 engineId gsEventCursors
   in if nextCursor <= currentCursor
        then state
        else
          state
            { gsEventCursors = Map.insert engineId nextCursor gsEventCursors
            }
