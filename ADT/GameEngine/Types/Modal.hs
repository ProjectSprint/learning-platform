module GameEngine.Types.Modal where

import Data.Map.Strict (Map)
import Data.Text (Text)
import GameEngine.Types.Common

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
