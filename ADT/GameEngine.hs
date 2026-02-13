-- |
-- Facade module for the split game engine ADT representation.
--
-- Reading order:
-- 1. GameEngine.Domain.* (via GameEngine.Types)
-- 2. GameEngine.EventQueue
-- 3. GameEngine.Behavior
-- 4. GameEngine.Reducer
module GameEngine
  ( module GameEngine.Types,
    module GameEngine.EventQueue,
    module GameEngine.Behavior,
    module GameEngine.Reducer
  )
where

import GameEngine.Behavior
import GameEngine.EventQueue
import GameEngine.Reducer
import GameEngine.Types
