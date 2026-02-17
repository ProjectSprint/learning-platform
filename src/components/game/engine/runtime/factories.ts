import type { EntityData, ItemData } from "@/components/game/types/entity";
import { isGridSpace as internalIsGridSpace } from "@/components/game/types/space";
import { isItemData as internalIsItemData } from "../../internal/domain/entity/entity-data";

// Question-facing guards (business logic narrows domain unions; internals own ADT constructors).
export const isItem = (entity: EntityData): entity is ItemData =>
	internalIsItemData(entity);
export const isGridSpace = internalIsGridSpace;
