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
