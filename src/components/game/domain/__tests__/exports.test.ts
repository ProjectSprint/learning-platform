/**
 * Test to verify all domain exports are accessible.
 */

import { describe, expect, it } from "vitest";

describe("Domain Exports", () => {
	it("should export Space factory functions from FP model", async () => {
		const spaceModule = await import("../space");

		// Type guards
		expect(spaceModule.isGridSpace).toBeDefined();
		expect(spaceModule.isPathSpace).toBeDefined();
		expect(spaceModule.isPoolSpace).toBeDefined();
		expect(spaceModule.isValidGridPosition).toBeDefined();

		// Factory functions
		expect(spaceModule.createGridSpaceData).toBeDefined();
		expect(spaceModule.createPathSpaceData).toBeDefined();
		expect(spaceModule.createPoolSpaceData).toBeDefined();

		// Grid functions
		expect(spaceModule.gridContains).toBeDefined();
		expect(spaceModule.gridGetPosition).toBeDefined();
		expect(spaceModule.gridCanAccept).toBeDefined();
		expect(spaceModule.gridGetEntitiesAt).toBeDefined();
		expect(spaceModule.gridIsOccupied).toBeDefined();
		expect(spaceModule.gridGetEmptyPositions).toBeDefined();
		expect(spaceModule.gridGetOccupiedPositions).toBeDefined();
		expect(spaceModule.gridGetEntityCount).toBeDefined();
		expect(spaceModule.gridIsFull).toBeDefined();
		expect(spaceModule.gridIsEmpty).toBeDefined();

		// Pool functions
		expect(spaceModule.poolContains).toBeDefined();
		expect(spaceModule.poolGetEntityCount).toBeDefined();
		expect(spaceModule.poolIsFull).toBeDefined();
		expect(spaceModule.poolIsEmpty).toBeDefined();

		// Path functions
		expect(spaceModule.pathContains).toBeDefined();
		expect(spaceModule.pathGetEntityCount).toBeDefined();
		expect(spaceModule.pathIsFull).toBeDefined();
		expect(spaceModule.pathIsEmpty).toBeDefined();

		// Polymorphic functions
		expect(spaceModule.spaceContains).toBeDefined();
		expect(spaceModule.spaceGetEntityCount).toBeDefined();
		expect(spaceModule.spaceIsFull).toBeDefined();
		expect(spaceModule.spaceIsEmpty).toBeDefined();
	});

	it("should export Entity factory functions from FP model", async () => {
		const entityModule = await import("../entity");

		// Type guards
		expect(entityModule.isItemData).toBeDefined();

		// Factory functions
		expect(entityModule.createEntityData).toBeDefined();
		expect(entityModule.createItemData).toBeDefined();

		// Utility functions
		expect(entityModule.getEntityStateValue).toBeDefined();
		expect(entityModule.canPlaceIn).toBeDefined();
		expect(entityModule.isDraggable).toBeDefined();
		expect(entityModule.getItemTooltip).toBeDefined();
		expect(entityModule.getItemIcon).toBeDefined();
		expect(entityModule.isInCategory).toBeDefined();
		expect(entityModule.cloneEntityData).toBeDefined();
		expect(entityModule.cloneItemData).toBeDefined();
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
