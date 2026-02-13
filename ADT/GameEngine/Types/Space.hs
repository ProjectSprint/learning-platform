{-# LANGUAGE LambdaCase #-}

module GameEngine.Types.Space where

import Data.Map.Strict (Map)
import Data.Map.Strict qualified as Map
import Data.Text (Text)
import GameEngine.Types.Common

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

data PathSpaceData = PathSpaceData
  { pathSpaceId :: SpaceId,
    pathSpaceName :: Maybe Text,
    pathSvgPath :: Text,
    pathViewBox :: Text,
    pathDurationSeconds :: Double,
    pathSpeedMultiplier :: Double,
    pathEntityIds :: [EntityId],
    pathMaxCapacity :: Maybe Int,
    pathMetadata :: Map Text Value
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
  | PathSpace PathSpaceData
  | CustomSpace CustomSpaceData
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

data PathSpaceConfig = PathSpaceConfig
  { configPathId :: SpaceId,
    configPathName :: Maybe Text,
    configPathSvgPath :: Text,
    configPathViewBox :: Text,
    configPathDurationSeconds :: Double,
    configPathSpeedMultiplier :: Double,
    configPathMaxCapacity :: Maybe Int,
    configPathMetadata :: Map Text Value
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
  | DefinePathSpace PathSpaceConfig
  | DefineCustomSpace CustomSpaceConfig
  deriving (Eq, Show)

spaceIdOf :: SpaceData -> SpaceId
spaceIdOf = \case
  GridSpace s -> gridSpaceId s
  PoolSpace s -> poolSpaceId s
  PathSpace s -> pathSpaceId s
  CustomSpace s -> customSpaceId s

spaceContains :: SpaceData -> EntityId -> Bool
spaceContains space entityId =
  case space of
    GridSpace GridSpaceData {gridEntityPositions} -> Map.member entityId gridEntityPositions
    PoolSpace PoolSpaceData {poolEntityIds} -> entityId `elem` poolEntityIds
    PathSpace PathSpaceData {pathEntityIds} -> entityId `elem` pathEntityIds
    CustomSpace _ -> False

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
          idx = maybe (length without) id mIndex
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

pathAdd :: PathSpaceData -> EntityId -> Maybe PathSpaceData
pathAdd pathSpace entityId
  | not capacityOk = Nothing
  | otherwise =
      let without = filter (/= entityId) (pathEntityIds pathSpace)
       in Just pathSpace {pathEntityIds = without ++ [entityId]}
  where
    currentCount = length (pathEntityIds pathSpace)
    alreadyThere = entityId `elem` pathEntityIds pathSpace
    capacityOk = case pathMaxCapacity pathSpace of
      Nothing -> True
      Just cap -> alreadyThere || currentCount < cap

pathRemove :: PathSpaceData -> EntityId -> Maybe PathSpaceData
pathRemove pathSpace entityId
  | entityId `elem` pathEntityIds pathSpace =
      Just pathSpace {pathEntityIds = filter (/= entityId) (pathEntityIds pathSpace)}
  | otherwise = Nothing
