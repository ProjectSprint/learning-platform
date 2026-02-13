{-# LANGUAGE OverloadedStrings #-}

-- |
-- Game state and action domain.
module GameEngine.Domain.State where

import Data.Map.Strict qualified as Map
import Data.Text (Text)
import GameEngine.Domain.Common
import GameEngine.Domain.Entity
import GameEngine.Domain.Event
import GameEngine.Domain.Modal
import GameEngine.Domain.Space

data QuestionStatus = QuestionInProgress | QuestionCompleted
  deriving (Eq, Show)

data QuestionInfo = QuestionInfo
  { questionId :: QuestionId,
    questionStatus :: QuestionStatus
  }
  deriving (Eq, Show)

data GameState = GameState
  { gsPhase :: Phase,
    gsSpaces :: Map.Map SpaceId SpaceData,
    gsEntities :: Map.Map EntityId EntityData,
    gsOverlay :: OverlayState,
    gsQuestion :: QuestionInfo,
    gsEventQueue :: GameEventQueue,
    gsEventCursors :: Map.Map EngineId EventId
  }
  deriving (Eq, Show)

emptyGameState :: GameState
emptyGameState =
  GameState
    { gsPhase = Phase "setup",
      gsSpaces = Map.empty,
      gsEntities = Map.empty,
      gsOverlay = OverlayState Map.empty,
      gsQuestion = QuestionInfo (QuestionId "") QuestionInProgress,
      gsEventQueue = GameEventQueue [] 0 0,
      gsEventCursors = Map.empty
    }

data Action
  = SetQuestion QuestionId (Maybe QuestionStatus)
  | SetPhase Phase
  | CompleteQuestion
  | AckEvents EngineId EventId
  | EmitEvents [EventPayload]
  | SpaceCreated SpaceData
  | SpaceRemoved SpaceId
  | EntityCreated EntityData
  | EntityUpdated EntityId EntityUpdates
  | EntityStateUpdated EntityId (Map.Map Text Value)
  | EntitiesDeleted [EntityId]
  | EntityAdded EntityId SpaceId (Maybe Placement)
  | EntityRemoved EntityId SpaceId
  | EntityMoved EntityId SpaceId SpaceId (Maybe Placement)
  | EntityPositionUpdated EntityId SpaceId GridPosition
  | EntitiesSwapped EntityId SpaceId EntityId SpaceId
  | OpenModal ModalInstance
  | CloseModal (Maybe ModalId)
  | ModalSubmitted ModalId ModalActionId (Map.Map Text Value)
  deriving (Eq, Show)
