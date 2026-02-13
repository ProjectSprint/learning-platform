-- |
-- Domain-level facade.
--
-- Use this when you want a complete domain mental model before reading
-- reducer/reactor orchestration modules.
module GameEngine.Domain
  ( module GameEngine.Domain.Common,
    module GameEngine.Domain.Entity,
    module GameEngine.Domain.Space,
    module GameEngine.Domain.Modal,
    module GameEngine.Domain.Event,
    module GameEngine.Domain.State,
    module GameEngine.Domain.Runtime,
    module GameEngine.Domain.Behavior,
    module GameEngine.Domain.Question
  )
where

import GameEngine.Domain.Behavior
import GameEngine.Domain.Common
import GameEngine.Domain.Entity
import GameEngine.Domain.Event
import GameEngine.Domain.Modal
import GameEngine.Domain.Question
import GameEngine.Domain.Runtime
import GameEngine.Domain.Space
import GameEngine.Domain.State
