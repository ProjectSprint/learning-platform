-- |
-- Behavior domain: rule declarations and behavior execution contexts.
module GameEngine.Domain.Behavior where

import Data.Text (Text)
import GameEngine.Domain.Common
import GameEngine.Domain.Entity
import GameEngine.Domain.Event
import GameEngine.Domain.Runtime
import GameEngine.Domain.State

data TerminalMatch
  = MatchExact Text
  | MatchRegex Text
  deriving (Eq, Show)

data EventTrigger
  = OnEntityEnteredSpace (Maybe SpaceId) (Maybe Text)
  | OnEntityMoved (Maybe SpaceId) (Maybe Text)
  | OnEntityLeftSpace (Maybe SpaceId) (Maybe Text)
  | OnEntityClicked (Maybe Text) (Maybe SpaceId)
  | OnEntityUpdated (Maybe Text)
  | OnModalOpened (Maybe ModalId)
  | OnModalClosed (Maybe ModalId)
  | OnModalSubmitted (Maybe ModalId) (Maybe ModalActionId)
  | OnTerminalInput (Maybe TerminalMatch)
  | OnPhaseChanged (Maybe Phase) (Maybe Phase)
  | OnEngineStarted
  | OnEngineFinished
  deriving (Eq, Show)

data GuardContext ctx = GuardContext
  { guardEvent :: GameEvent,
    guardEntity :: Maybe EntityData,
    guardState :: GameState,
    guardPhase :: Phase,
    guardBehaviorContext :: ctx
  }

data EffectContext ctx = EffectContext
  { effectEvent :: GameEvent,
    effectEntity :: Maybe EntityData,
    effectState :: GameState,
    effectPhase :: Phase,
    effectBehaviorContext :: ctx
  }

data BehaviorOutcome ctx = BehaviorOutcome
  { outcomeContext :: ctx,
    outcomeCommands :: [RuntimeCommand]
  }

type GuardFn ctx = GuardContext ctx -> Bool

type HandlerFn ctx = EffectContext ctx -> BehaviorOutcome ctx

data BehaviorRule ctx = BehaviorRule
  { behaviorRuleId :: RuleId,
    behaviorOn :: EventTrigger,
    behaviorGuard :: Maybe (GuardFn ctx),
    behaviorHandler :: HandlerFn ctx
  }

data BehaviorDefinition ctx = BehaviorDefinition
  { behaviorInitialContext :: ctx,
    behaviorRules :: [BehaviorRule ctx]
  }
