import {
	fromEntityId,
	fromPhaseId,
	fromSpaceId,
	cloneEntityData as internalCloneEntityData,
	cloneItemData as internalCloneItemData,
	createCustomSpaceData as internalCreateCustomSpaceData,
	createEntityData as internalCreateEntityData,
	createGridSpaceData as internalCreateGridSpaceData,
	createItemData as internalCreateItemData,
	createMeterSpaceData as internalCreateMeterSpaceData,
	createPathSpaceData as internalCreatePathSpaceData,
	createPoolSpaceData as internalCreatePoolSpaceData,
	createQueueSpaceData as internalCreateQueueSpaceData,
	toEntityId,
	toPhaseId,
	toSpaceId,
} from "../../internal/domain/adt";
import { isItemData as internalIsItemData } from "../../internal/domain/entity/entity-data";
import {
	isGridSpace as internalIsGridSpace,
	isMeterSpace as internalIsMeterSpace,
	isPathSpace as internalIsPathSpace,
	isPoolSpace as internalIsPoolSpace,
	isQueueSpace as internalIsQueueSpace,
	isValidGridPosition,
} from "../../internal/domain/space";
import type {
	CustomSpaceConfig,
	EntityData,
	EntityDataConfig,
	GridSpaceConfig,
	ItemData,
	ItemDataConfig,
	MeterSpaceConfig,
	PathSpaceConfig,
	PoolSpaceConfig,
	QueueSpaceConfig,
	SpaceData,
} from "./types";

// Domain-first constructors used by game-level logic.
export const createEntity = (config: EntityDataConfig): EntityData =>
	internalCreateEntityData(config);
export const createItem = (config: ItemDataConfig): ItemData =>
	internalCreateItemData(config);
export const createGridSpace = (config: GridSpaceConfig) =>
	internalCreateGridSpaceData(config);
export const createPoolSpace = (config: PoolSpaceConfig) =>
	internalCreatePoolSpaceData(config);
export const createPathSpace = (config: PathSpaceConfig) =>
	internalCreatePathSpaceData(config);
export const createCustomSpace = (config: CustomSpaceConfig) =>
	internalCreateCustomSpaceData(config);
export const createQueueSpace = (config: QueueSpaceConfig) =>
	internalCreateQueueSpaceData(config);
export const createMeterSpace = (config: MeterSpaceConfig) =>
	internalCreateMeterSpaceData(config);
export const cloneEntity = (entity: EntityData, newId: string): EntityData =>
	internalCloneEntityData(entity, newId);
export const cloneItem = (item: ItemData, newId: string): ItemData =>
	internalCloneItemData(item, newId);

// Engine-level guards derived from low-level space/entity guards.
export const isEntityData = (value: unknown): value is EntityData => {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<EntityData>;
	return typeof candidate.id === "string" && typeof candidate.type === "string";
};
export const isSpaceData = (value: unknown): value is SpaceData => {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<SpaceData>;
	return typeof candidate.id === "string" && typeof candidate.kind === "string";
};
export const isItem = (entity: EntityData): entity is ItemData =>
	internalIsItemData(entity);
export const isGridSpace = internalIsGridSpace;
export const isPoolSpace = internalIsPoolSpace;
export const isPathSpace = internalIsPathSpace;
export const isQueueSpace = internalIsQueueSpace;
export const isMeterSpace = internalIsMeterSpace;
export { isValidGridPosition };

// Compatibility ID helpers.
export {
	fromEntityId,
	fromPhaseId,
	fromSpaceId,
	toEntityId,
	toPhaseId,
	toSpaceId,
};
