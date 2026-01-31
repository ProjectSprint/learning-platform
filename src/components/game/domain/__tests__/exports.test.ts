/**
 * Test to verify all domain exports are accessible.
 */

import { describe, expect, it } from "vitest";

describe("Domain Exports", () => {
	it("should export Space classes", async () => {
		const spaceModule = await import("../space");

		expect(spaceModule.Space).toBeDefined();
		expect(spaceModule.GridSpace).toBeDefined();
		expect(spaceModule.PoolSpace).toBeDefined();
		expect(spaceModule.QueueSpace).toBeDefined();
		expect(spaceModule.PathSpace).toBeDefined();
	});

	it("should export Entity classes", async () => {
		const entityModule = await import("../entity");

		expect(entityModule.Entity).toBeDefined();
		expect(entityModule.Item).toBeDefined();
	});

	it("should export Behavior types", async () => {
		const behaviorModule = await import("../behavior");

		expect(behaviorModule.BaseBehavior).toBeDefined();
		expect(behaviorModule.StubBehavior).toBeDefined();
	});

	it("should export from main domain index", async () => {
		const domainModule = await import("../index");

		// Space exports
		expect(domainModule.Space).toBeDefined();
		expect(domainModule.GridSpace).toBeDefined();
		expect(domainModule.PoolSpace).toBeDefined();
		expect(domainModule.QueueSpace).toBeDefined();
		expect(domainModule.PathSpace).toBeDefined();

		// Entity exports
		expect(domainModule.Entity).toBeDefined();
		expect(domainModule.Item).toBeDefined();

		// Behavior exports
		expect(domainModule.BaseBehavior).toBeDefined();
		expect(domainModule.StubBehavior).toBeDefined();
	});
});
