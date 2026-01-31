import { describe, expect, it } from "vitest";
import { StubBehavior } from "../../behavior/Behavior";
import { Entity } from "../Entity";

describe("Entity", () => {
	describe("constructor", () => {
		it("creates entity with required fields", () => {
			const entity = new Entity({
				id: "router-1",
				type: "router",
			});

			expect(entity.id).toBe("router-1");
			expect(entity.type).toBe("router");
			expect(entity.name).toBeUndefined();
			expect(entity.visual).toEqual({});
			expect(entity.data).toEqual({});
			expect(entity.getState()).toEqual({});
		});

		it("creates entity with all optional fields", () => {
			const entity = new Entity({
				id: "packet-1",
				type: "packet",
				name: "TCP Packet",
				visual: { icon: "network-icon", color: "blue" },
				data: { protocol: "TCP", port: 80 },
				state: { transmitted: false },
			});

			expect(entity.id).toBe("packet-1");
			expect(entity.type).toBe("packet");
			expect(entity.name).toBe("TCP Packet");
			expect(entity.visual).toEqual({ icon: "network-icon", color: "blue" });
			expect(entity.data).toEqual({ protocol: "TCP", port: 80 });
			expect(entity.getState()).toEqual({ transmitted: false });
		});
	});

	describe("state management", () => {
		it("gets current state", () => {
			const entity = new Entity({
				id: "device-1",
				type: "device",
				state: { connected: false, battery: 100 },
			});

			expect(entity.getState()).toEqual({ connected: false, battery: 100 });
		});

		it("gets specific state value", () => {
			const entity = new Entity({
				id: "device-1",
				type: "device",
				state: { count: 5, name: "test" },
			});

			expect(entity.getStateValue("count")).toBe(5);
			expect(entity.getStateValue("name")).toBe("test");
			expect(entity.getStateValue("missing")).toBeUndefined();
		});

		it("sets state value", () => {
			const entity = new Entity({
				id: "device-1",
				type: "device",
				state: { count: 0 },
			});

			entity.setStateValue("count", 10);
			expect(entity.getStateValue("count")).toBe(10);

			entity.setStateValue("newKey", "value");
			expect(entity.getStateValue("newKey")).toBe("value");
		});

		it("updates multiple state values", () => {
			const entity = new Entity({
				id: "router-1",
				type: "router",
				state: { port1: "active", port2: "inactive", config: "default" },
			});

			entity.updateState({ port2: "active", port3: "inactive" });

			expect(entity.getState()).toEqual({
				port1: "active",
				port2: "active",
				config: "default",
				port3: "inactive",
			});
		});

		it("resets state to initial values", () => {
			const entity = new Entity({
				id: "item-1",
				type: "item",
				state: { count: 5, active: true },
			});

			entity.updateState({ count: 10, extra: "data" });
			entity.resetState({ count: 0 });

			expect(entity.getState()).toEqual({ count: 0 });
		});

		it("resets state to empty when no initial provided", () => {
			const entity = new Entity({
				id: "item-1",
				type: "item",
				state: { count: 5 },
			});

			entity.resetState();
			expect(entity.getState()).toEqual({});
		});
	});

	describe("clone", () => {
		it("creates copy with new ID", () => {
			const original = new Entity({
				id: "entity-1",
				type: "test",
				name: "Test Entity",
				visual: { icon: "test-icon" },
				data: { value: 42 },
				state: { active: true },
			});

			const cloned = original.clone("entity-2");

			expect(cloned).not.toBe(original);
			expect(cloned.id).toBe("entity-2");
			expect(cloned.type).toBe(original.type);
			expect(cloned.name).toBe(original.name);
			expect(cloned.visual).toEqual(original.visual);
			expect(cloned.data).toEqual(original.data);
			expect(cloned.getState()).toEqual(original.getState());
		});

		it("cloned entity state is independent", () => {
			const original = new Entity({
				id: "entity-1",
				type: "test",
				state: { count: 0 },
			});

			const cloned = original.clone("entity-2");
			cloned.setStateValue("count", 10);

			expect(original.getStateValue("count")).toBe(0);
			expect(cloned.getStateValue("count")).toBe(10);
		});
	});

	describe("behavior management", () => {
		const mockBehavior = new StubBehavior("behavior-1", "test");
		const mockBehavior2 = new StubBehavior("behavior-2", "test");

		it("adds behavior", () => {
			const entity = new Entity({ id: "e1", type: "test" });

			entity.addBehavior(mockBehavior);

			expect(entity.hasBehavior("behavior-1")).toBe(true);
			expect(entity.getBehaviors()).toHaveLength(1);
		});

		it("prevents duplicate behaviors", () => {
			const entity = new Entity({ id: "e1", type: "test" });

			entity.addBehavior(mockBehavior);
			entity.addBehavior(mockBehavior);

			expect(entity.getBehaviors()).toHaveLength(1);
		});

		it("gets behavior by id", () => {
			const entity = new Entity({ id: "e1", type: "test" });
			entity.addBehavior(mockBehavior);

			expect(entity.getBehavior("behavior-1")).toBe(mockBehavior);
			expect(entity.getBehavior("nonexistent")).toBeUndefined();
		});

		it("removes behavior", () => {
			const entity = new Entity({ id: "e1", type: "test" });
			entity.addBehavior(mockBehavior);
			entity.addBehavior(mockBehavior2);

			const removed = entity.removeBehavior("behavior-1");

			expect(removed).toBe(true);
			expect(entity.hasBehavior("behavior-1")).toBe(false);
			expect(entity.hasBehavior("behavior-2")).toBe(true);
		});

		it("returns false when removing non-existent behavior", () => {
			const entity = new Entity({ id: "e1", type: "test" });

			expect(entity.removeBehavior("nonexistent")).toBe(false);
		});
	});

	describe("serialization", () => {
		it("converts to JSON", () => {
			const entity = new Entity({
				id: "entity-1",
				type: "router",
				name: "Router A",
				visual: { icon: "router" },
				data: { ports: 4 },
				state: { active: true },
			});

			const json = entity.toJSON();

			expect(json).toEqual({
				id: "entity-1",
				type: "router",
				name: "Router A",
				visual: { icon: "router" },
				data: { ports: 4 },
				state: { active: true },
				behaviors: [],
			});
		});

		it("converts to string", () => {
			const entity = new Entity({ id: "entity-1", type: "router" });

			expect(entity.toString()).toBe("Entity(router:entity-1)");
		});
	});
});
