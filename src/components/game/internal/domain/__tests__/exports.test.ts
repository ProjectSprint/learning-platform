/**
 * Test to verify all domain exports are accessible.
 */

import { describe, expect, it } from "vitest";

describe("Domain Exports", () => {
	it("should export ADT constructors and brand helpers", async () => {
		const adtModule = await import("../adt");

		expect(adtModule.toEntityId).toBeDefined();
		expect(adtModule.toSpaceId).toBeDefined();
		expect(adtModule.toPhaseId).toBeDefined();
		expect(adtModule.fromEntityId).toBeDefined();
		expect(adtModule.fromSpaceId).toBeDefined();
		expect(adtModule.fromPhaseId).toBeDefined();

		expect(adtModule.createEntityData).toBeDefined();
		expect(adtModule.createItemData).toBeDefined();
		expect(adtModule.cloneEntityData).toBeDefined();
		expect(adtModule.cloneItemData).toBeDefined();
		expect(adtModule.createGridSpaceData).toBeDefined();
		expect(adtModule.createPoolSpaceData).toBeDefined();
		expect(adtModule.createPathSpaceData).toBeDefined();
		expect(adtModule.createQueueSpaceData).toBeDefined();
		expect(adtModule.createMeterSpaceData).toBeDefined();
		expect(adtModule.createCustomSpaceData).toBeDefined();
	});

	it("should keep space module focused on data contracts", async () => {
		const spaceModule = await import("../space");

		// Type guards
		expect(spaceModule.isGridSpace).toBeDefined();
		expect(spaceModule.isPathSpace).toBeDefined();
		expect(spaceModule.isPoolSpace).toBeDefined();
		expect(spaceModule.isQueueSpace).toBeDefined();
		expect(spaceModule.isMeterSpace).toBeDefined();
		expect(spaceModule.isValidGridPosition).toBeDefined();

		expect("createGridSpaceData" in spaceModule).toBe(false);
		expect("gridContains" in spaceModule).toBe(false);
		expect("spaceContains" in spaceModule).toBe(false);
	});

	it("should keep entity module focused on data contracts", async () => {
		const entityModule = await import("../entity");

		// Type guards
		expect(entityModule.isItemData).toBeDefined();
		expect("createEntityData" in entityModule).toBe(false);
		expect("createItemData" in entityModule).toBe(false);
		expect("canPlaceIn" in entityModule).toBe(false);
		expect("getEntityStateValue" in entityModule).toBe(false);
	});

	it("should export read + transformer contracts", async () => {
		const readModule = await import("../read");
		const transformerModule = await import("../transformers");

		expect(readModule.readApi).toBeDefined();
		expect(readModule.getEntitySpaceId).toBeDefined();
		expect(readModule.isEntityPlacementAllowed).toBeDefined();
		expect(readModule.selectGridEmptyPositions).toBeDefined();

		expect(transformerModule.transformApi).toBeDefined();
		expect(transformerModule.tryAddEntityToSpace).toBeDefined();
		expect(transformerModule.tryMoveEntityAcrossSpaces).toBeDefined();
		expect(transformerModule.tryPatchEntity).toBeDefined();
		expect(transformerModule.trySetPhase).toBeDefined();
	});
});
