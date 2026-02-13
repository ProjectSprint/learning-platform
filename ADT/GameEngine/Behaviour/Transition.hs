{-# LANGUAGE RecordWildCards #-}

module GameEngine.Behaviour.Transition where

import GameEngine.Behaviour.Matcher
import GameEngine.Types.Behaviour
import GameEngine.Types.State
import GameEngine.Types.Event

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
