{-# LANGUAGE NamedFieldPuns #-}

module GameEngine.Behaviour.Matcher where

import Data.Map.Strict qualified as Map
import Data.Text (Text)
import Data.Text qualified as Text
import GameEngine.Types.Behaviour
import GameEngine.Behaviour.Entity
import GameEngine.Types.Entity
import GameEngine.Types.Event
import GameEngine.Types.State

matchesTrigger :: GameState -> GameEvent -> EventTrigger -> Bool
matchesTrigger state GameEvent {gameEventPayload} trigger =
  case (gameEventPayload, trigger) of
    (EvtEntityEnteredSpace {evtSpaceId, evtEntityId}, OnEntityEnteredSpace mSpace mType) ->
      matchMaybe (== evtSpaceId) mSpace
        && matchMaybe (== entityTypeOfEvent state evtEntityId) mType

    (EvtEntityMoved {evtToSpaceId, evtEntityId}, OnEntityMoved mSpace mType) ->
      matchMaybe (== evtToSpaceId) mSpace
        && matchMaybe (== entityTypeOfEvent state evtEntityId) mType

    (EvtEntityLeftSpace {evtSpaceId, evtEntityId}, OnEntityLeftSpace mSpace mType) ->
      matchMaybe (== evtSpaceId) mSpace
        && matchMaybe (== entityTypeOfEvent state evtEntityId) mType

    (EvtEntityClicked {evtEntityId, evtSpaceId}, OnEntityClicked mType mSpace) ->
      matchMaybe (== entityTypeOfEvent state evtEntityId) mType
        && matchMaybe (== evtSpaceId) mSpace

    (EvtEntityUpdated {evtEntityId}, OnEntityUpdated mType) ->
      matchMaybe (== entityTypeOfEvent state evtEntityId) mType

    (EvtModalOpened {evtModalId}, OnModalOpened mModalId) ->
      matchMaybe (== evtModalId) mModalId

    (EvtModalClosed {evtModalId}, OnModalClosed mModalId) ->
      matchMaybe (== evtModalId) mModalId

    (EvtModalSubmitted {evtModalId, evtModalActionId}, OnModalSubmitted mModalId mActionId) ->
      matchMaybe (== evtModalId) mModalId
        && matchMaybe (== evtModalActionId) mActionId

    (EvtTerminalInput {evtInput}, OnTerminalInput mMatch) ->
      maybe True (matchesTerminalInput evtInput) mMatch

    (EvtPhaseChanged {evtFrom, evtTo}, OnPhaseChanged mTo mFrom) ->
      matchMaybe (== evtTo) mTo && matchMaybe (== evtFrom) mFrom

    (EvtEngineStarted {}, OnEngineStarted) -> True
    (EvtEngineFinished {}, OnEngineFinished) -> True

    _ -> False

resolveEventEntity :: GameState -> GameEvent -> Maybe EntityData
resolveEventEntity GameState {gsEntities} GameEvent {gameEventPayload} =
  case gameEventPayload of
    EvtEntityEnteredSpace {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityLeftSpace {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityMoved {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityUpdated {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityClicked {evtEntityId} -> Map.lookup evtEntityId gsEntities
    _ -> Nothing

entityTypeOfEvent :: GameState -> EntityId -> Text
entityTypeOfEvent GameState {gsEntities} eid =
  maybe "" entityTypeOf (Map.lookup eid gsEntities)

matchesTerminalInput :: Text -> TerminalMatch -> Bool
matchesTerminalInput input matcher =
  case matcher of
    MatchExact exact -> input == exact
    MatchRegex pattern -> Text.isInfixOf pattern input

matchMaybe :: (a -> Bool) -> Maybe a -> Bool
matchMaybe _ Nothing = True
matchMaybe predicate (Just value) = predicate value
