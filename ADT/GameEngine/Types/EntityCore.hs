module GameEngine.Types.EntityCore where

import Data.Map.Strict (Map)
import Data.Text (Text)
import GameEngine.Types.Common

type EntityVisual = Map Text Value

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
