import { isItemData as internalIsItemData } from "../../internal/domain/entity/entity-data";
import { isGridSpace as internalIsGridSpace } from "../../internal/domain/space";
import type { EntityData, ItemData } from "../types";

// Question-facing guards (business logic narrows domain unions; internals own ADT constructors).
export const isItem = (entity: EntityData): entity is ItemData =>
	internalIsItemData(entity);
export const isGridSpace = internalIsGridSpace;
