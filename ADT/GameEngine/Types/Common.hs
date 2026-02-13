{-# LANGUAGE OverloadedStrings #-}

module GameEngine.Types.Common where

import Data.Map.Strict (Map)
import Data.Text (Text)

newtype EntityId = EntityId {unEntityId :: Text}
  deriving (Eq, Ord, Show)

newtype SpaceId = SpaceId {unSpaceId :: Text}
  deriving (Eq, Ord, Show)

newtype EngineId = EngineId {unEngineId :: Text}
  deriving (Eq, Ord, Show)

newtype ModalId = ModalId {unModalId :: Text}
  deriving (Eq, Ord, Show)

newtype ModalActionId = ModalActionId {unModalActionId :: Text}
  deriving (Eq, Ord, Show)

newtype QuestionId = QuestionId {unQuestionId :: Text}
  deriving (Eq, Ord, Show)

newtype RuleId = RuleId {unRuleId :: Text}
  deriving (Eq, Ord, Show)

newtype Phase = Phase {unPhase :: Text}
  deriving (Eq, Ord, Show)

type EventId = Int

type ActionId = Int

data Value
  = VString Text
  | VBool Bool
  | VNumber Double
  | VNull
  | VArray [Value]
  | VObject (Map Text Value)
  deriving (Eq, Show)
