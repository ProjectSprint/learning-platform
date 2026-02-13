-- |
-- Runtime command algebra (effect boundary).
module GameEngine.Domain.Runtime where

import Data.Map.Strict (Map)
import Data.Text (Text)
import GameEngine.Domain.Common
import GameEngine.Domain.Entity
import GameEngine.Domain.Modal
import GameEngine.Domain.Space
import GameEngine.Domain.State (QuestionStatus)

-- | Anything imperative gets emitted as data first, then interpreted.
data RuntimeCommand
  = CmdWorld WorldIntent
  | CmdInteraction InteractionSessionIntent
  | CmdExecutionFlow ExecutionFlowIntent
  | CmdProgress ProgressIntent
  | CmdTerminal TerminalCommand
  | CmdDelayMs Int
  | CmdWarn Text
  deriving (Eq, Show)

data WorldIntent
  = WorldCreateEntity ItemDataConfig
  | WorldUpdateEntity EntityId EntityUpdates
  | WorldUpdateEntityState EntityId (Map Text Value)
  | WorldDeleteEntities [EntityId]
  | WorldAddToSpace EntityId SpaceId (Maybe GridPosition)
  | WorldRemoveFromSpace EntityId SpaceId
  | WorldMoveEntity EntityId SpaceId (Maybe GridPosition)
  | WorldMoveEntityToGrid EntityId SpaceId
  deriving (Eq, Show)

data InteractionSessionIntent
  = InteractionOpenModal ModalInstance
  | InteractionCloseModal (Maybe ModalId)
  | InteractionSetTerminalVisible Bool
  | InteractionSetModalGateOpen Bool
  | InteractionRequestPhaseTransition Phase Text
  deriving (Eq, Show)

data ExecutionFlowIntent
  = ExecutionFlowPhaseTransitionRequested
      { efTargetPhase :: Phase,
        efSource :: Text
      }
  deriving (Eq, Show)

data ProgressIntent
  = ProgressCompleteQuestion
  | ProgressSetQuestion QuestionId (Maybe QuestionStatus)
  deriving (Eq, Show)

data TerminalOutputType = TerminalOutput | TerminalError
  deriving (Eq, Show)

data TerminalCommand
  = TerminalWriteOutput Text TerminalOutputType
  | TerminalClearHistory
  | TerminalFinishEngine
  deriving (Eq, Show)
