-- |
-- Event domain types and payloads.
module GameEngine.Domain.Event where

import Data.Map.Strict (Map)
import Data.Text (Text)
import GameEngine.Domain.Common
import GameEngine.Domain.Entity
import GameEngine.Domain.Modal
import GameEngine.Domain.Space

data EventMeta = EventMeta
  { eventId :: EventId,
    actionId :: ActionId,
    timestampMs :: Maybe Int
  }
  deriving (Eq, Show)

data Placement
  = PlacementGrid GridPosition
  | PlacementPoolIndex Int
  | PlacementOpaque Value
  deriving (Eq, Show)

data ModalCloseReason
  = ClosedBackdrop
  | ClosedEscape
  | ClosedButton
  | ClosedProgrammatic
  | ClosedUnknown
  deriving (Eq, Show)

data EventPayload
  = EvtEntityEnteredSpace
      { evtEntityId :: EntityId,
        evtSpaceId :: SpaceId,
        evtPosition :: Maybe Placement
      }
  | EvtEntityLeftSpace
      { evtEntityId :: EntityId,
        evtSpaceId :: SpaceId,
        evtPosition :: Maybe Placement
      }
  | EvtEntityMoved
      { evtEntityId :: EntityId,
        evtFromSpaceId :: SpaceId,
        evtToSpaceId :: SpaceId,
        evtFromPosition :: Maybe Placement,
        evtToPosition :: Maybe Placement
      }
  | EvtEntityUpdated
      { evtEntityId :: EntityId,
        evtUpdates :: EntityUpdatePayload
      }
  | EvtEntityClicked
      { evtEntityId :: EntityId,
        evtSpaceId :: SpaceId,
        evtPosition :: Maybe Placement
      }
  | EvtModalOpened
      { evtModalId :: ModalId,
        evtModal :: ModalInstance
      }
  | EvtModalSubmitted
      { evtModalId :: ModalId,
        evtModalActionId :: ModalActionId,
        evtValues :: Map Text Value
      }
  | EvtModalClosed
      { evtModalId :: ModalId,
        evtModal :: Maybe ModalInstance,
        evtCloseReason :: Maybe ModalCloseReason
      }
  | EvtTerminalInput
      { evtEntryId :: Text,
        evtInput :: Text
      }
  | EvtEngineStarted
      { evtEngineId :: Maybe EngineId
      }
  | EvtEngineFinished
      { evtEngineId :: Maybe EngineId
      }
  | EvtPhaseChanged
      { evtFrom :: Phase,
        evtTo :: Phase
      }
  | EvtRuntimeWarning
      { evtWarningMessage :: Text
      }
  deriving (Eq, Show)

data GameEvent = GameEvent
  { gameEventMeta :: EventMeta,
    gameEventPayload :: EventPayload
  }
  deriving (Eq, Show)

data GameEventQueue = GameEventQueue
  { queueEvents :: [GameEvent],
    queueLastEventId :: EventId,
    queueLastActionId :: ActionId
  }
  deriving (Eq, Show)
