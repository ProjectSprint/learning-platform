{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

-- |
-- Core ADTs for the Haskell game engine representation.
--
-- This module is intentionally dependency-light and only defines data and
-- small structural helpers used by behavior and reducer layers.
module GameEngine.Types where

import Data.Map.Strict (Map)
import Data.Map.Strict qualified as Map
import Data.Text (Text)

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
-- Shared structural helpers
-- ----------------------------------------------------------------------------

entityIdOf :: EntityData -> EntityId
entityIdOf = coreEntityId . getEntityCore

entityTypeOf :: EntityData -> Text
entityTypeOf = coreEntityType . getEntityCore

getEntityCore :: EntityData -> EntityCore
getEntityCore = \case
  GenericEntity core -> core
  ItemEntity item -> itemCore item

mapEntityCore :: (EntityCore -> EntityCore) -> EntityData -> EntityData
mapEntityCore f = \case
  GenericEntity core -> GenericEntity (f core)
  ItemEntity item -> ItemEntity item {itemCore = f (itemCore item)}

spaceIdOf :: SpaceData -> SpaceId
spaceIdOf = \case
  GridSpace s -> gridSpaceId s
  PoolSpace s -> poolSpaceId s
  CustomSpace s -> customSpaceId s
