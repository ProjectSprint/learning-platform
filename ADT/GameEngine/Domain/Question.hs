-- |
-- Question definition domain: declarative model for bootstrap + runtime rules.
module GameEngine.Domain.Question where

import Data.Text (Text)
import GameEngine.Domain.Behavior
import GameEngine.Domain.Common
import GameEngine.Domain.Entity
import GameEngine.Domain.Space

data QuestionMeta = QuestionMeta
  { questionMetaId :: QuestionId,
    questionMetaTitle :: Text,
    questionMetaDescription :: Text
  }
  deriving (Eq, Show)

data EntityDefinition = EntityDefinition
  { definitionEntityConfig :: ItemDataConfig,
    definitionInitialSpace :: Maybe SpaceId,
    definitionInitialPosition :: Maybe GridPosition
  }
  deriving (Eq, Show)

data Condition
  = CondAnd [Condition]
  | CondOr [Condition]
  | CondNot Condition
  | CondFlag Text Bool
  | CondEq Text Value
  | CondIn Text [Value]
  deriving (Eq, Show)

data PhaseRule
  = PhaseSet Condition Phase
  | PhaseRetain Condition
  deriving (Eq, Show)

data InventoryRule
  = InventoryShowGroup Condition Text
  | InventoryHideGroup Condition Text
  deriving (Eq, Show)

data SpaceRule
  = SpaceShow Condition SpaceId
  | SpaceHide Condition SpaceId
  deriving (Eq, Show)

data QuestionDefinition ctx = QuestionDefinition
  { definitionMeta :: QuestionMeta,
    definitionInitialPhase :: Phase,
    definitionSpaces :: [SpaceDefinition],
    definitionEntities :: [EntityDefinition],
    definitionPhaseRules :: [PhaseRule],
    definitionInventoryRules :: [InventoryRule],
    definitionSpaceRules :: [SpaceRule],
    definitionBehaviors :: Maybe (BehaviorDefinition ctx)
  }
