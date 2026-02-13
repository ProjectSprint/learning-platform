module GameEngine.Types.Item where

import Data.Map.Strict (Map)
import Data.Text (Text)
import GameEngine.Types.Common
import GameEngine.Types.EntityCore

newtype IconInfo = IconInfo {iconName :: Text}
  deriving (Eq, Show)

data ItemTooltip = ItemTooltip
  { tooltipContent :: Text,
    tooltipSeeMoreHref :: Maybe Text
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
