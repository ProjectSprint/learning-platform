{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

-- |
-- Haskell ADT mirror of the TypeScript game engine under src/components/game.
--
-- The goal is parity of architecture, not a byte-for-byte port:
-- - pure state transitions for actions/reducers
-- - explicit event queue + engine cursors
-- - declarative behavior rules with first-match-wins trigger semantics
-- - imperative runtime work represented as command ADTs
module GameEngine
  ( -- * Core IDs and scalar wrappers
    EntityId (..),
    SpaceId (..),
    EngineId (..),
    ModalId (..),
    ModalActionId (..),
    Phase (..),
    QuestionId (..),

    -- * Domain model
    Value (..),
    EntityVisual,
    EntityData (..),
    ItemData (..),
    SpaceData (..),
    GridSpaceData (..),
    PoolSpaceData (..),
    CustomSpaceData (..),
    GridPosition (..),
    GridMetrics (..),

    -- * UI model
    ModalInstance (..),
    ModalContentBlock (..),
    ModalField (..),
    ModalFieldKind (..),
    ModalAction (..),
    OverlayState (..),

    -- * Events and actions
    GameEventQueue (..),
    GameEvent (..),
    EventMeta (..),
    EventPayload (..),
    ModalCloseReason (..),
    Action (..),
    EntityUpdates (..),
    EntityUpdatePayload (..),

    -- * Game state
    QuestionStatus (..),
    QuestionInfo (..),
    GameState (..),
    emptyGameState,

    -- * Declarative definition + behavior model
    QuestionMeta (..),
    SpaceDefinition (..),
    EntityDefinition (..),
    QuestionDefinition (..),
    Condition (..),
    PhaseRule (..),
    InventoryRule (..),
    SpaceRule (..),
    BehaviorDefinition (..),
    BehaviorRule (..),
    EventTrigger (..),
    TerminalMatch (..),
    GuardContext (..),
    EffectContext (..),
    BehaviorOutcome (..),

    -- * Runtime command algebra (effect boundary)
    RuntimeCommand (..),
    WorldIntent (..),
    InteractionSessionIntent (..),
    ExecutionFlowIntent (..),
    ProgressIntent (..),
    TerminalCommand (..),
    TerminalOutputType (..),

    -- * Pure transitions
    applyAction,
    applyActions,
    getNextActionId,
    appendEvents,
    pendingEventsFor,
    ackEvents,

    -- * Behavior helpers
    matchesTrigger,
    runBehaviorEvent,
  )
where

import Data.List (find, foldl')
import Data.Map.Strict (Map)
import qualified Data.Map.Strict as Map
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as Text

-- ----------------------------------------------------------------------------
-- IDs and scalar wrappers
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- JSON-like dynamic values (parity with Record<string, unknown>)
-- ----------------------------------------------------------------------------

data Value
  = VString Text
  | VBool Bool
  | VNumber Double
  | VNull
  | VArray [Value]
  | VObject (Map Text Value)
  deriving (Eq, Show)

-- ----------------------------------------------------------------------------
-- Domain model (entities/spaces)
-- ----------------------------------------------------------------------------

type EntityVisual = Map Text Value

newtype IconInfo = IconInfo {iconName :: Text}
  deriving (Eq, Show)

data ItemTooltip = ItemTooltip
  { tooltipContent :: Text,
    tooltipSeeMoreHref :: Maybe Text
  }
  deriving (Eq, Show)

data EntityCore = EntityCore
  { coreEntityId :: EntityId,
    coreEntityType :: Text,
    coreEntityName :: Maybe Text,
    coreEntityVisual :: EntityVisual,
    coreEntityData :: Map Text Value,
    coreEntityState :: Map Text Value,
    coreBehaviorIds :: [Text]
  }
  deriving (Eq, Show)

data ItemData = ItemData
  { itemCore :: EntityCore,
    itemAllowedPlaces :: [SpaceId],
    itemIcon :: Maybe IconInfo,
    itemTooltip :: Maybe ItemTooltip,
    itemDraggable :: Bool,
    itemCategory :: Maybe Text
  }
  deriving (Eq, Show)

data EntityData
  = GenericEntity EntityCore
  | ItemEntity ItemData
  deriving (Eq, Show)

data GridPosition = GridPosition
  { row :: Int,
    col :: Int
  }
  deriving (Eq, Ord, Show)

data GridMetrics = GridMetrics
  { cellWidth :: Int,
    cellHeight :: Int,
    gapX :: Int,
    gapY :: Int
  }
  deriving (Eq, Show)

data GridSpaceData = GridSpaceData
  { gridSpaceId :: SpaceId,
    gridSpaceName :: Maybe Text,
    gridRows :: Int,
    gridCols :: Int,
    gridMetrics :: GridMetrics,
    gridAllowMultiplePerCell :: Bool,
    gridEntityPositions :: Map EntityId GridPosition,
    gridMaxCapacity :: Maybe Int,
    gridMetadata :: Map Text Value
  }
  deriving (Eq, Show)

data PoolLayout = PoolLayoutGrid | PoolLayoutList | PoolLayoutCarousel
  deriving (Eq, Show)

data PoolSpaceData = PoolSpaceData
  { poolSpaceId :: SpaceId,
    poolSpaceName :: Maybe Text,
    poolLayout :: PoolLayout,
    poolColumns :: Maybe Int,
    poolAllowReorder :: Bool,
    poolEntityIds :: [EntityId],
    poolMaxCapacity :: Maybe Int,
    poolMetadata :: Map Text Value
  }
  deriving (Eq, Show)

data CustomSpaceData = CustomSpaceData
  { customSpaceId :: SpaceId,
    customSpaceName :: Maybe Text,
    customMaxCapacity :: Maybe Int,
    customMetadata :: Map Text Value
  }
  deriving (Eq, Show)

data SpaceData
  = GridSpace GridSpaceData
  | PoolSpace PoolSpaceData
  | CustomSpace CustomSpaceData
  deriving (Eq, Show)

-- ----------------------------------------------------------------------------
-- Modal/overlay model
-- ----------------------------------------------------------------------------

data ModalFieldKind
  = FieldText
  | FieldNumber
  | FieldSelect [Text]
  deriving (Eq, Show)

data ModalField = ModalField
  { modalFieldId :: Text,
    modalFieldLabel :: Text,
    modalFieldKind :: ModalFieldKind,
    modalFieldRequired :: Bool
  }
  deriving (Eq, Show)

data ModalContentBlock
  = ModalTextBlock Text
  | ModalLinkBlock Text Text
  | ModalFieldBlock ModalField
  deriving (Eq, Show)

data ModalAction = ModalAction
  { modalActionId :: ModalActionId,
    modalActionLabel :: Text,
    modalActionPrimary :: Bool
  }
  deriving (Eq, Show)

data ModalInstance = ModalInstance
  { modalInstanceId :: Maybe ModalId,
    modalTitle :: Maybe Text,
    modalContent :: [ModalContentBlock],
    modalActions :: [ModalAction],
    modalBlocking :: Bool,
    modalInitialValues :: Map Text Value
  }
  deriving (Eq, Show)

data ModalEntry = ModalEntry
  { modalEntryInstance :: ModalInstance,
    modalEntryVisible :: Bool
  }
  deriving (Eq, Show)

newtype OverlayState = OverlayState
  { overlayModals :: Map ModalId ModalEntry
  }
  deriving (Eq, Show)

-- ----------------------------------------------------------------------------
-- Events
-- ----------------------------------------------------------------------------

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

data EntityUpdatePayload = EntityUpdatePayload
  { payloadName :: Maybe Text,
    payloadDraggable :: Maybe Bool,
    payloadVisual :: Maybe (Map Text Value),
    payloadData :: Maybe (Map Text Value),
    payloadState :: Maybe (Map Text Value)
  }
  deriving (Eq, Show)

emptyEntityUpdatePayload :: EntityUpdatePayload
emptyEntityUpdatePayload =
  EntityUpdatePayload
    { payloadName = Nothing,
      payloadDraggable = Nothing,
      payloadVisual = Nothing,
      payloadData = Nothing,
      payloadState = Nothing
    }

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

-- ----------------------------------------------------------------------------
-- Game state
-- ----------------------------------------------------------------------------

data QuestionStatus = QuestionInProgress | QuestionCompleted
  deriving (Eq, Show)

data QuestionInfo = QuestionInfo
  { questionId :: QuestionId,
    questionStatus :: QuestionStatus
  }
  deriving (Eq, Show)

data GameState = GameState
  { gsPhase :: Phase,
    gsSpaces :: Map SpaceId SpaceData,
    gsEntities :: Map EntityId EntityData,
    gsOverlay :: OverlayState,
    gsQuestion :: QuestionInfo,
    gsEventQueue :: GameEventQueue,
    gsEventCursors :: Map EngineId EventId
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

-- ----------------------------------------------------------------------------
-- Declarative question definition model
-- ----------------------------------------------------------------------------

data QuestionMeta = QuestionMeta
  { questionMetaId :: QuestionId,
    questionMetaTitle :: Text,
    questionMetaDescription :: Text
  }
  deriving (Eq, Show)

data GridSpaceConfig = GridSpaceConfig
  { configGridId :: SpaceId,
    configGridName :: Maybe Text,
    configGridRows :: Int,
    configGridCols :: Int,
    configGridMetrics :: GridMetrics,
    configGridMaxCapacity :: Maybe Int,
    configGridAllowMultiplePerCell :: Bool,
    configGridMetadata :: Map Text Value
  }
  deriving (Eq, Show)

data PoolSpaceConfig = PoolSpaceConfig
  { configPoolId :: SpaceId,
    configPoolName :: Maybe Text,
    configPoolLayout :: PoolLayout,
    configPoolColumns :: Maybe Int,
    configPoolMaxCapacity :: Maybe Int,
    configPoolAllowReorder :: Bool,
    configPoolMetadata :: Map Text Value
  }
  deriving (Eq, Show)

data CustomSpaceConfig = CustomSpaceConfig
  { configCustomId :: SpaceId,
    configCustomName :: Maybe Text,
    configCustomMaxCapacity :: Maybe Int,
    configCustomMetadata :: Map Text Value
  }
  deriving (Eq, Show)

data SpaceDefinition
  = DefineGridSpace GridSpaceConfig
  | DefinePoolSpace PoolSpaceConfig
  | DefineCustomSpace CustomSpaceConfig
  deriving (Eq, Show)

data ItemDataConfig = ItemDataConfig
  { configEntityId :: EntityId,
    configEntityType :: Text,
    configEntityName :: Maybe Text,
    configEntityVisual :: EntityVisual,
    configEntityData :: Map Text Value,
    configEntityState :: Map Text Value,
    configBehaviorIds :: [Text],
    configAllowedPlaces :: [SpaceId],
    configIcon :: Maybe IconInfo,
    configTooltip :: Maybe ItemTooltip,
    configDraggable :: Bool,
    configCategory :: Maybe Text
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

-- ----------------------------------------------------------------------------
-- Runtime command algebra (effect boundary)
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Behavior rules
-- ----------------------------------------------------------------------------

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

runBehaviorEvent :: BehaviorDefinition ctx -> GameState -> ctx -> GameEvent -> Maybe (BehaviorOutcome ctx)
runBehaviorEvent BehaviorDefinition {behaviorRules} state ctx event =
  go behaviorRules
  where
    entity = resolveEventEntity state event
    guardCtx =
      GuardContext
        { guardEvent = event,
          guardEntity = entity,
          guardState = state,
          guardPhase = gsPhase state,
          guardBehaviorContext = ctx
        }
    effectCtx =
      EffectContext
        { effectEvent = event,
          effectEntity = entity,
          effectState = state,
          effectPhase = gsPhase state,
          effectBehaviorContext = ctx
        }

    go [] = Nothing
    go (rule : rest)
      | not (matchesTrigger state event (behaviorOn rule)) = go rest
      | not (maybe True ($ guardCtx) (behaviorGuard rule)) = go rest
      | otherwise = Just (behaviorHandler rule effectCtx)

-- ----------------------------------------------------------------------------
-- Reducer input actions
-- ----------------------------------------------------------------------------

data EntityUpdates = EntityUpdates
  { updateName :: Maybe Text,
    updateDraggable :: Maybe Bool,
    updateVisual :: Map Text Value,
    updateData :: Map Text Value,
    updateState :: Map Text Value
  }
  deriving (Eq, Show)

emptyEntityUpdates :: EntityUpdates
emptyEntityUpdates =
  EntityUpdates
    { updateName = Nothing,
      updateDraggable = Nothing,
      updateVisual = Map.empty,
      updateData = Map.empty,
      updateState = Map.empty
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
  | EntityStateUpdated EntityId (Map Text Value)
  | EntitiesDeleted [EntityId]
  | EntityAdded EntityId SpaceId (Maybe Placement)
  | EntityRemoved EntityId SpaceId
  | EntityMoved EntityId SpaceId SpaceId (Maybe Placement)
  | EntityPositionUpdated EntityId SpaceId GridPosition
  | EntitiesSwapped EntityId SpaceId EntityId SpaceId
  | OpenModal ModalInstance
  | CloseModal (Maybe ModalId)
  | ModalSubmitted ModalId ModalActionId (Map Text Value)
  deriving (Eq, Show)

-- ----------------------------------------------------------------------------
-- Event queue helpers
-- ----------------------------------------------------------------------------

getNextActionId :: GameEventQueue -> ActionId
getNextActionId GameEventQueue {queueLastActionId} = queueLastActionId + 1

appendEvents :: ActionId -> [EventPayload] -> GameEventQueue -> GameEventQueue
appendEvents actionId payloads queue@GameEventQueue {queueEvents, queueLastEventId}
  | null payloads = queue
  | otherwise =
      let (eventsToAppend, nextEventId) =
            foldl'
              (\(acc, currentEventId) payload ->
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

-- ----------------------------------------------------------------------------
-- Reducer-equivalent pure transitions
-- ----------------------------------------------------------------------------

applyActions :: GameState -> [Action] -> GameState
applyActions = foldl' applyAction

applyAction :: GameState -> Action -> GameState
applyAction state action =
  case action of
    SetQuestion qid maybeStatus ->
      let old = gsQuestion state
          newStatus = fromMaybe (questionStatus old) maybeStatus
          unchanged = questionId old == qid && questionStatus old == newStatus
       in if unchanged
            then state
            else state {gsQuestion = QuestionInfo qid newStatus}

    SetPhase nextPhase
      | gsPhase state == nextPhase -> state
      | otherwise ->
          let actionId = getNextActionId (gsEventQueue state)
              payload = EvtPhaseChanged (gsPhase state) nextPhase
           in state
                { gsPhase = nextPhase,
                  gsEventQueue = appendEvents actionId [payload] (gsEventQueue state)
                }

    CompleteQuestion ->
      let q = gsQuestion state
       in state {gsQuestion = q {questionStatus = QuestionCompleted}}

    AckEvents engineId cursor ->
      ackEvents engineId cursor state

    EmitEvents payloads
      | null payloads -> state
      | otherwise ->
          let actionId = getNextActionId (gsEventQueue state)
           in state {gsEventQueue = appendEvents actionId payloads (gsEventQueue state)}

    SpaceCreated space ->
      state {gsSpaces = Map.insert (spaceIdOf space) space (gsSpaces state)}

    SpaceRemoved sid ->
      state {gsSpaces = Map.delete sid (gsSpaces state)}

    EntityCreated entity ->
      let eid = entityIdOf entity
       in if Map.member eid (gsEntities state)
            then state
            else state {gsEntities = Map.insert eid entity (gsEntities state)}

    EntityUpdated eid updates ->
      case Map.lookup eid (gsEntities state) of
        Nothing -> state
        Just entity ->
          let (entity', payload) = applyEntityUpdates updates entity
           in if payload == emptyEntityUpdatePayload
                then state
                else
                  let actionId = getNextActionId (gsEventQueue state)
                      queue' = appendEvents actionId [EvtEntityUpdated eid payload] (gsEventQueue state)
                   in state
                        { gsEntities = Map.insert eid entity' (gsEntities state),
                          gsEventQueue = queue'
                        }

    EntityStateUpdated eid patch ->
      case Map.lookup eid (gsEntities state) of
        Nothing -> state
        Just entity ->
          let core = getEntityCore entity
              mergedState = Map.union patch (coreEntityState core)
           in if mergedState == coreEntityState core
                then state
                else
                  let entity' = mapEntityCore (\c -> c {coreEntityState = mergedState}) entity
                      payload = emptyEntityUpdatePayload {payloadState = Just patch}
                      actionId = getNextActionId (gsEventQueue state)
                      queue' = appendEvents actionId [EvtEntityUpdated eid payload] (gsEventQueue state)
                   in state
                        { gsEntities = Map.insert eid entity' (gsEntities state),
                          gsEventQueue = queue'
                        }

    EntitiesDeleted entityIds ->
      let spaces' = foldl' removeEntityFromAllSpaces (gsSpaces state) entityIds
          entities' = foldl' (flip Map.delete) (gsEntities state) entityIds
       in state {gsSpaces = spaces', gsEntities = entities'}

    EntityAdded eid sid placement ->
      addEntityToState state eid sid placement

    EntityRemoved eid sid ->
      removeEntityFromState state eid sid

    EntityMoved eid fromSid toSid toPlacement ->
      moveEntityInState state eid fromSid toSid toPlacement

    EntityPositionUpdated eid sid pos ->
      updateEntityGridPosition state eid sid pos

    EntitiesSwapped e1 s1 e2 s2 ->
      swapGridEntities state e1 s1 e2 s2

    OpenModal modal ->
      openModalInState state modal

    CloseModal maybeMid ->
      closeModalInState state maybeMid

    ModalSubmitted mid actionId values ->
      let eventPayload = EvtModalSubmitted mid actionId values
          queue' = appendEvents (getNextActionId (gsEventQueue state)) [eventPayload] (gsEventQueue state)
       in state {gsEventQueue = queue'}

-- ----------------------------------------------------------------------------
-- Behavior trigger matching (mirrors runtime/behavior/reactor.ts)
-- ----------------------------------------------------------------------------

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

matchesTerminalInput :: Text -> TerminalMatch -> Bool
matchesTerminalInput input matcher =
  case matcher of
    MatchExact exact -> input == exact
    -- Regex represented as Text in this model.
    MatchRegex pattern -> Text.isInfixOf pattern input

matchMaybe :: (a -> Bool) -> Maybe a -> Bool
matchMaybe _ Nothing = True
matchMaybe predicate (Just value) = predicate value

-- ----------------------------------------------------------------------------
-- Internal helpers for reducers
-- ----------------------------------------------------------------------------

resolveEventEntity :: GameState -> GameEvent -> Maybe EntityData
resolveEventEntity GameState {gsEntities} GameEvent {gameEventPayload} =
  case gameEventPayload of
    EvtEntityEnteredSpace {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityLeftSpace {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityMoved {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityUpdated {evtEntityId} -> Map.lookup evtEntityId gsEntities
    EvtEntityClicked {evtEntityId} -> Map.lookup evtEntityId gsEntities
    _ -> Nothing

entityIdOf :: EntityData -> EntityId
entityIdOf = coreEntityId . getEntityCore

entityTypeOf :: EntityData -> Text
entityTypeOf = coreEntityType . getEntityCore

entityTypeOfEvent :: GameState -> EntityId -> Text
entityTypeOfEvent GameState {gsEntities} eid =
  maybe "" entityTypeOf (Map.lookup eid gsEntities)

getEntityCore :: EntityData -> EntityCore
getEntityCore = \case
  GenericEntity core -> core
  ItemEntity item -> itemCore item

mapEntityCore :: (EntityCore -> EntityCore) -> EntityData -> EntityData
mapEntityCore f = \case
  GenericEntity core -> GenericEntity (f core)
  ItemEntity item -> ItemEntity item {itemCore = f (itemCore item)}

applyEntityUpdates :: EntityUpdates -> EntityData -> (EntityData, EntityUpdatePayload)
applyEntityUpdates EntityUpdates {..} entity =
  let core = getEntityCore entity

      (nextName, changedName) =
        case updateName of
          Nothing -> (coreEntityName core, Nothing)
          Just candidate ->
            if Just candidate == coreEntityName core
              then (coreEntityName core, Nothing)
              else (Just candidate, Just candidate)

      (nextVisual, visualPatch) = mergePatch (coreEntityVisual core) updateVisual
      (nextData, dataPatch) = mergePatch (coreEntityData core) updateData
      (nextState, statePatch) = mergePatch (coreEntityState core) updateState

      core' =
        core
          { coreEntityName = nextName,
            coreEntityVisual = nextVisual,
            coreEntityData = nextData,
            coreEntityState = nextState
          }

      (entity', changedDraggable) =
        case (entity, updateDraggable) of
          (ItemEntity item, Just value)
            | itemDraggable item /= value ->
                (ItemEntity item {itemCore = core', itemDraggable = value}, Just value)
          (ItemEntity item, _) -> (ItemEntity item {itemCore = core'}, Nothing)
          (GenericEntity _, _) -> (GenericEntity core', Nothing)

      payload =
        EntityUpdatePayload
          { payloadName = changedName,
            payloadDraggable = changedDraggable,
            payloadVisual = visualPatch,
            payloadData = dataPatch,
            payloadState = statePatch
          }
   in (entity', payload)

mergePatch :: Map Text Value -> Map Text Value -> (Map Text Value, Maybe (Map Text Value))
mergePatch current patch
  | Map.null patch = (current, Nothing)
  | otherwise =
      let hasChange = any (\(k, v) -> Map.lookup k current /= Just v) (Map.toList patch)
       in if hasChange
            then (Map.union patch current, Just patch)
            else (current, Nothing)

spaceIdOf :: SpaceData -> SpaceId
spaceIdOf = \case
  GridSpace s -> gridSpaceId s
  PoolSpace s -> poolSpaceId s
  CustomSpace s -> customSpaceId s

spaceContains :: SpaceData -> EntityId -> Bool
spaceContains space entityId =
  case space of
    GridSpace GridSpaceData {gridEntityPositions} -> Map.member entityId gridEntityPositions
    PoolSpace PoolSpaceData {poolEntityIds} -> entityId `elem` poolEntityIds
    CustomSpace _ -> False

removeEntityFromAllSpaces :: Map SpaceId SpaceData -> EntityId -> Map SpaceId SpaceData
removeEntityFromAllSpaces spaces entityId =
  Map.map
    ( \space ->
        case removeFromSpace space entityId of
          Nothing -> space
          Just (space', _) -> space'
    )
    spaces

findEntitySpace :: GameState -> EntityId -> Maybe SpaceId
findEntitySpace GameState {gsSpaces} entityId =
  fst <$> find (\(_, space) -> spaceContains space entityId) (Map.toList gsSpaces)

isInBounds :: GridSpaceData -> GridPosition -> Bool
isInBounds GridSpaceData {gridRows, gridCols} GridPosition {row, col} =
  row >= 0 && row < gridRows && col >= 0 && col < gridCols

gridCanAccept :: GridSpaceData -> EntityId -> GridPosition -> Bool
gridCanAccept grid entityId position =
  isInBounds grid position
    && capacityOk
    && occupancyOk
  where
    currentCount = Map.size (gridEntityPositions grid)
    capacityOk =
      case gridMaxCapacity grid of
        Nothing -> True
        Just cap -> Map.member entityId (gridEntityPositions grid) || currentCount < cap
    occupancyOk
      | gridAllowMultiplePerCell grid = True
      | otherwise =
          not
            ( any
                (\(otherId, p) -> otherId /= entityId && p == position)
                (Map.toList (gridEntityPositions grid))
            )

gridAdd :: GridSpaceData -> EntityId -> GridPosition -> Maybe GridSpaceData
gridAdd grid entityId position
  | not (gridCanAccept grid entityId position) = Nothing
  | otherwise =
      let positions = Map.insert entityId position (Map.delete entityId (gridEntityPositions grid))
       in Just grid {gridEntityPositions = positions}

gridRemove :: GridSpaceData -> EntityId -> Maybe GridSpaceData
gridRemove grid entityId
  | Map.member entityId (gridEntityPositions grid) =
      Just grid {gridEntityPositions = Map.delete entityId (gridEntityPositions grid)}
  | otherwise = Nothing

poolAdd :: PoolSpaceData -> EntityId -> Maybe Int -> Maybe PoolSpaceData
poolAdd pool entityId mIndex
  | not capacityOk = Nothing
  | otherwise =
      let without = filter (/= entityId) (poolEntityIds pool)
          idx = fromMaybe (length without) mIndex
          clamped = max 0 (min idx (length without))
          (left, right) = splitAt clamped without
       in Just pool {poolEntityIds = left ++ [entityId] ++ right}
  where
    currentCount = length (poolEntityIds pool)
    alreadyThere = entityId `elem` poolEntityIds pool
    capacityOk = case poolMaxCapacity pool of
      Nothing -> True
      Just cap -> alreadyThere || currentCount < cap

poolRemove :: PoolSpaceData -> EntityId -> Maybe PoolSpaceData
poolRemove pool entityId
  | entityId `elem` poolEntityIds pool =
      Just pool {poolEntityIds = filter (/= entityId) (poolEntityIds pool)}
  | otherwise = Nothing

addToSpace :: SpaceData -> EntityId -> Maybe Placement -> Maybe (SpaceData, Maybe Placement)
addToSpace space entityId placement =
  case space of
    GridSpace grid ->
      case placement of
        Just (PlacementGrid pos) ->
          do
            grid' <- gridAdd grid entityId pos
            pure (GridSpace grid', Just (PlacementGrid pos))
        _ -> Nothing

    PoolSpace pool ->
      let mIndex =
            case placement of
              Just (PlacementPoolIndex ix) -> Just ix
              _ -> Nothing
       in do
            pool' <- poolAdd pool entityId mIndex
            let position = elemIndexPlacement entityId (poolEntityIds pool')
            pure (PoolSpace pool', position)

    CustomSpace _ -> Nothing

removeFromSpace :: SpaceData -> EntityId -> Maybe (SpaceData, Maybe Placement)
removeFromSpace space entityId =
  case space of
    GridSpace grid -> do
      pos <- Map.lookup entityId (gridEntityPositions grid)
      grid' <- gridRemove grid entityId
      pure (GridSpace grid', Just (PlacementGrid pos))

    PoolSpace pool -> do
      let pos = elemIndexPlacement entityId (poolEntityIds pool)
      pool' <- poolRemove pool entityId
      pure (PoolSpace pool', pos)

    CustomSpace _ -> Nothing

firstEmptyGridPosition :: GridSpaceData -> Maybe GridPosition
firstEmptyGridPosition grid =
  find
    (\pos -> isNothingOrSelf grid pos)
    [GridPosition r c | r <- [0 .. gridRows grid - 1], c <- [0 .. gridCols grid - 1]]
  where
    isNothingOrSelf g pos =
      not
        ( any
            (\(_, p) -> p == pos)
            (Map.toList (gridEntityPositions g))
        )

isNothingOrSelf :: GridSpaceData -> GridPosition -> Bool
isNothingOrSelf g pos =
  not
    ( any
        (\(_, p) -> p == pos)
        (Map.toList (gridEntityPositions g))
    )

elemIndexPlacement :: EntityId -> [EntityId] -> Maybe Placement
elemIndexPlacement entityId ids =
  case findIndex' 0 ids of
    Nothing -> Nothing
    Just ix -> Just (PlacementPoolIndex ix)
  where
    findIndex' _ [] = Nothing
    findIndex' n (x : xs)
      | x == entityId = Just n
      | otherwise = findIndex' (n + 1) xs

addEntityToState :: GameState -> EntityId -> SpaceId -> Maybe Placement -> GameState
addEntityToState state entityId spaceId placement =
  case (Map.lookup spaceId (gsSpaces state), Map.lookup entityId (gsEntities state)) of
    (Just space, Just _) ->
      case addToSpace space entityId placement of
        Nothing -> state
        Just (space', normalizedPos) ->
          let actionId = getNextActionId (gsEventQueue state)
              payload = EvtEntityEnteredSpace entityId spaceId normalizedPos
           in state
                { gsSpaces = Map.insert spaceId space' (gsSpaces state),
                  gsEventQueue = appendEvents actionId [payload] (gsEventQueue state)
                }
    _ -> state

removeEntityFromState :: GameState -> EntityId -> SpaceId -> GameState
removeEntityFromState state entityId spaceId =
  case (Map.lookup spaceId (gsSpaces state), Map.lookup entityId (gsEntities state)) of
    (Just space, Just _) ->
      case removeFromSpace space entityId of
        Nothing -> state
        Just (space', oldPos) ->
          let actionId = getNextActionId (gsEventQueue state)
              payload = EvtEntityLeftSpace entityId spaceId oldPos
           in state
                { gsSpaces = Map.insert spaceId space' (gsSpaces state),
                  gsEventQueue = appendEvents actionId [payload] (gsEventQueue state)
                }
    _ -> state

moveEntityInState :: GameState -> EntityId -> SpaceId -> SpaceId -> Maybe Placement -> GameState
moveEntityInState state entityId fromSid toSid toPlacement =
  case (Map.lookup fromSid (gsSpaces state), Map.lookup toSid (gsSpaces state), Map.lookup entityId (gsEntities state)) of
    (Just fromSpace, Just toSpace, Just _) ->
      if not (spaceContains fromSpace entityId)
        then
          if spaceContains toSpace entityId
            then state
            else state
        else
          case removeFromSpace fromSpace entityId of
            Nothing -> state
            Just (fromSpace', fromPos) ->
              case addToSpace toSpace entityId toPlacement of
                Nothing -> state
                Just (toSpace', toPos) ->
                  let actionId = getNextActionId (gsEventQueue state)
                      payload = EvtEntityMoved entityId fromSid toSid fromPos toPos
                      spaces' =
                        Map.insert fromSid fromSpace' . Map.insert toSid toSpace' $ gsSpaces state
                   in state
                        { gsSpaces = spaces',
                          gsEventQueue = appendEvents actionId [payload] (gsEventQueue state)
                        }
    _ -> state

updateEntityGridPosition :: GameState -> EntityId -> SpaceId -> GridPosition -> GameState
updateEntityGridPosition state entityId spaceId nextPos =
  case (Map.lookup spaceId (gsSpaces state), Map.lookup entityId (gsEntities state)) of
    (Just (GridSpace grid), Just _)
      | spaceContains (GridSpace grid) entityId,
        gridCanAccept grid entityId nextPos ->
          let gridWithout = fromMaybe grid (gridRemove grid entityId)
              grid' = fromMaybe gridWithout (gridAdd gridWithout entityId nextPos)
           in state {gsSpaces = Map.insert spaceId (GridSpace grid') (gsSpaces state)}
    _ -> state

swapGridEntities :: GameState -> EntityId -> SpaceId -> EntityId -> SpaceId -> GameState
swapGridEntities state e1 s1 e2 s2 =
  case (Map.lookup s1 (gsSpaces state), Map.lookup s2 (gsSpaces state)) of
    (Just (GridSpace g1), Just (GridSpace g2)) ->
      let p1 = Map.lookup e1 (gridEntityPositions g1)
          p2 = Map.lookup e2 (gridEntityPositions g2)
       in case (p1, p2) of
            (Just from1, Just from2) ->
              let g1' = fromMaybe g1 (gridAdd (fromMaybe g1 (gridRemove g1 e1)) e2 from1)
                  g2' = fromMaybe g2 (gridAdd (fromMaybe g2 (gridRemove g2 e2)) e1 from2)
                  moved1 = EvtEntityMoved e1 s1 s2 (Just (PlacementGrid from1)) (Just (PlacementGrid from2))
                  moved2 = EvtEntityMoved e2 s2 s1 (Just (PlacementGrid from2)) (Just (PlacementGrid from1))
                  actionId = getNextActionId (gsEventQueue state)
                  queue' = appendEvents actionId [moved1, moved2] (gsEventQueue state)
                  spaces' = Map.insert s1 (GridSpace g1') (Map.insert s2 (GridSpace g2') (gsSpaces state))
               in state {gsSpaces = spaces', gsEventQueue = queue'}
            _ -> state
    _ -> state

openModalInState :: GameState -> ModalInstance -> GameState
openModalInState state modal =
  let mid = fromMaybe (ModalId "modal-default") (modalInstanceId modal)
      modals = overlayModals (gsOverlay state)
   in case Map.lookup mid modals of
        Just existing
          | modalEntryVisible existing -> state
          | otherwise ->
                  let payload = EvtModalOpened mid (modalEntryInstance existing)
                      queue' = appendEvents (getNextActionId (gsEventQueue state)) [payload] (gsEventQueue state)
                      modals' = Map.insert mid (existing {modalEntryVisible = True}) modals
                   in state {gsOverlay = OverlayState modals', gsEventQueue = queue'}
        Nothing ->
          let payload = EvtModalOpened mid modal
              queue' = appendEvents (getNextActionId (gsEventQueue state)) [payload] (gsEventQueue state)
              modals' = Map.insert mid (ModalEntry modal True) modals
           in state {gsOverlay = OverlayState modals', gsEventQueue = queue'}

closeModalInState :: GameState -> Maybe ModalId -> GameState
closeModalInState state maybeMid =
  case maybeMid of
    Just mid -> closeSingleModal state mid
    Nothing -> closeAllModals state

closeSingleModal :: GameState -> ModalId -> GameState
closeSingleModal state mid =
  let modals = overlayModals (gsOverlay state)
   in case Map.lookup mid modals of
        Nothing -> state
        Just entry
          | not (modalEntryVisible entry) -> state
          | otherwise ->
                  let payload = EvtModalClosed mid (Just (modalEntryInstance entry)) (Just ClosedProgrammatic)
                      queue' = appendEvents (getNextActionId (gsEventQueue state)) [payload] (gsEventQueue state)
                      modals' = Map.insert mid (entry {modalEntryVisible = False}) modals
                   in state {gsOverlay = OverlayState modals', gsEventQueue = queue'}

closeAllModals :: GameState -> GameState
closeAllModals state =
  let modals = overlayModals (gsOverlay state)
      closed =
        Map.mapWithKey
          (\_ entry -> entry {modalEntryVisible = False})
          modals
      events =
        [ EvtModalClosed mid (Just (modalEntryInstance entry)) (Just ClosedProgrammatic)
          | (mid, entry) <- Map.toList modals,
            modalEntryVisible entry
        ]
   in if null events
        then state
        else
          state
            { gsOverlay = OverlayState closed,
              gsEventQueue = appendEvents (getNextActionId (gsEventQueue state)) events (gsEventQueue state)
            }
