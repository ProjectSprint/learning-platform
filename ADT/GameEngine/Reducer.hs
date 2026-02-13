{-# LANGUAGE NamedFieldPuns #-}

module GameEngine.Reducer where

import Data.List (foldl')
import Data.Map.Strict (Map)
import Data.Map.Strict qualified as Map
import Data.Maybe (fromMaybe)
import GameEngine.EventQueue
import GameEngine.Types.Common
import GameEngine.Types.Entity
import GameEngine.Types.Event
import GameEngine.Types.Modal
import GameEngine.Types.Space
import GameEngine.Types.State

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

removeEntityFromAllSpaces :: Map SpaceId SpaceData -> EntityId -> Map SpaceId SpaceData
removeEntityFromAllSpaces spaces entityId =
  Map.map
    ( \space ->
        case removeFromSpace space entityId of
          Nothing -> space
          Just (space', _) -> space'
    )
    spaces

addToSpace :: SpaceData -> EntityId -> Maybe Placement -> Maybe (SpaceData, Maybe Placement)
addToSpace space entityId placement =
  case space of
    GridSpace grid ->
      case placement of
        Just (PlacementGrid pos) -> do
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
