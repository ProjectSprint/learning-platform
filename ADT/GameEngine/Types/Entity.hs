{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE RecordWildCards #-}

module GameEngine.Types.Entity where

import Data.Map.Strict (Map)
import Data.Map.Strict qualified as Map
import Data.Text (Text)
import GameEngine.Types.Common
import GameEngine.Types.EntityCore
import GameEngine.Types.Item

data EntityData
  = GenericEntity EntityCore
  | ItemEntity ItemData
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
