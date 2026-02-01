/**
 * Tests for entity-fns.ts
 * Tests pure functions for EntityData and ItemData.
 */

import { describe, expect, it } from "vitest";
import {
	canPlaceIn,
	cloneEntityData,
	cloneItemData,
	createEntityData,
	createItemData,
	getEntityStateValue,
	getItemIcon,
	getItemTooltip,
	isDraggable,
	isInCategory,
	resetEntityState,
	setEntityStateValue,
	updateEntityState,
} from "../entity-fns";

describe("Entity Factory Functions", () => {
	it("creates an entity with minimal config", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "router",
		});

		expect(entity.id).toBe("ent-1");
		expect(entity.type).toBe("router");
		expect(entity.name).toBeUndefined();
		expect(entity.visual).toEqual({});
		expect(entity.data).toEqual({});
		expect(entity.state).toEqual({});
		expect(entity.behaviorIds).toEqual([]);
	});

	it("creates an entity with full config", () => {
		const entity = createEntityData({
			id: "ent-2",
			type: "packet",
			name: "Data Packet",
			visual: { icon: "📦", color: "blue", size: "md" },
			data: { source: "192.168.1.1", destination: "192.168.1.2" },
			state: { hops: 0 },
			behaviorIds: ["send", "receive"],
		});

		expect(entity.id).toBe("ent-2");
		expect(entity.type).toBe("packet");
		expect(entity.name).toBe("Data Packet");
		expect(entity.visual).toEqual({
			icon: "📦",
			color: "blue",
			size: "md",
		});
		expect(entity.data).toEqual({
			source: "192.168.1.1",
			destination: "192.168.1.2",
		});
		expect(entity.state).toEqual({ hops: 0 });
		expect(entity.behaviorIds).toEqual(["send", "receive"]);
	});
});

describe("Item Factory Functions", () => {
	it("creates an item with minimal config", () => {
		const item = createItemData({
			id: "item-1",
			allowedPlaces: ["pool-1"],
		});

		expect(item.id).toBe("item-1");
		expect(item.type).toBe("item"); // default type
		expect(item.allowedPlaces).toEqual(["pool-1"]);
		expect(item.draggable).toBe(true); // default
		expect(item.visual).toEqual({});
		expect(item.data).toEqual({});
	});

	it("creates an item with full config", () => {
		const item = createItemData({
			id: "item-2",
			name: "Router",
			allowedPlaces: ["grid-1", "grid-2"],
			data: { type: "router-item", ports: 4, speed: "1Gbps" },
			icon: { icon: "router-fill", color: "green" },
			tooltip: { content: "A network router", seeMoreHref: "/docs/router" },
			draggable: true,
			category: "hardware",
			state: { connected: false },
			behaviorIds: ["connect"],
		});

		expect(item.id).toBe("item-2");
		expect(item.type).toBe("router-item");
		expect(item.name).toBe("Router");
		expect(item.allowedPlaces).toEqual(["grid-1", "grid-2"]);
		expect(item.icon).toEqual({ icon: "router-fill", color: "green" });
		expect(item.tooltip).toEqual({
			content: "A network router",
			seeMoreHref: "/docs/router",
		});
		expect(item.draggable).toBe(true);
		expect(item.category).toBe("hardware");
		expect(item.data).toEqual({ ports: 4, speed: "1Gbps" });
		expect(item.state).toEqual({ connected: false });
		expect(item.behaviorIds).toEqual(["connect"]);
	});

	it("creates an item with draggable = false", () => {
		const item = createItemData({
			id: "item-3",
			allowedPlaces: ["pool-1"],
			draggable: false,
		});

		expect(item.draggable).toBe(false);
	});
});

describe("State Access Functions", () => {
	it("gets a state value by key", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "packet",
			state: { hops: 5, ttl: 64 },
		});

		expect(getEntityStateValue<number>(entity, "hops")).toBe(5);
		expect(getEntityStateValue<number>(entity, "ttl")).toBe(64);
	});

	it("returns undefined for non-existent state key", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "packet",
			state: { hops: 5 },
		});

		expect(getEntityStateValue(entity, "nonexistent")).toBeUndefined();
	});

	it("supports type parameter", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "entity",
			state: { count: 42, label: "test" },
		});

		expect(getEntityStateValue<number>(entity, "count")).toBe(42);
		expect(getEntityStateValue<string>(entity, "label")).toBe("test");
	});
});

describe("State Mutation Functions", () => {
	it("sets a state value", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "packet",
			state: { hops: 5 },
		});

		setEntityStateValue(entity, "hops", 10);
		expect(entity.state.hops).toBe(10);
	});

	it("adds a new state key", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "packet",
			state: {},
		});

		setEntityStateValue(entity, "newKey", "value");
		expect(entity.state.newKey).toBe("value");
	});

	it("updates multiple state values", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "packet",
			state: { hops: 5, ttl: 64 },
		});

		updateEntityState(entity, { hops: 10, dropped: false });

		expect(entity.state.hops).toBe(10);
		expect(entity.state.ttl).toBe(64);
		expect(entity.state.dropped).toBe(false);
	});

	it("resets state to empty", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "packet",
			state: { hops: 5, ttl: 64 },
		});

		resetEntityState(entity);
		expect(entity.state).toEqual({});
	});

	it("resets state to provided initial state", () => {
		const entity = createEntityData({
			id: "ent-1",
			type: "packet",
			state: { hops: 5, ttl: 64 },
		});

		resetEntityState(entity, { hops: 0 });
		expect(entity.state).toEqual({ hops: 0 });
	});
});

describe("Item Query Functions", () => {
	const item = createItemData({
		id: "item-1",
		name: "Router",
		allowedPlaces: ["grid-1", "grid-2", "grid-3"],
		icon: { icon: "router-fill", color: "green" },
		tooltip: { content: "A network router" },
		draggable: true,
		category: "hardware",
	});

	it("checks if item can be placed in a space", () => {
		expect(canPlaceIn(item, "grid-1")).toBe(true);
		expect(canPlaceIn(item, "grid-2")).toBe(true);
		expect(canPlaceIn(item, "grid-99")).toBe(false);
	});

	it("checks if item is draggable", () => {
		expect(isDraggable(item)).toBe(true);

		const staticItem = createItemData({
			id: "item-2",
			allowedPlaces: ["pool-1"],
			draggable: false,
		});
		expect(isDraggable(staticItem)).toBe(false);
	});

	it("gets item tooltip", () => {
		const tooltip = getItemTooltip(item);
		expect(tooltip).toEqual({ content: "A network router" });

		const noTooltipItem = createItemData({
			id: "item-3",
			allowedPlaces: ["pool-1"],
		});
		expect(getItemTooltip(noTooltipItem)).toBeUndefined();
	});

	it("gets item icon", () => {
		const icon = getItemIcon(item);
		expect(icon).toEqual({ icon: "router-fill", color: "green" });

		const noIconItem = createItemData({
			id: "item-3",
			allowedPlaces: ["pool-1"],
		});
		expect(getItemIcon(noIconItem)).toBeUndefined();
	});

	it("checks if item is in category", () => {
		expect(isInCategory(item, "hardware")).toBe(true);
		expect(isInCategory(item, "software")).toBe(false);

		const uncategorizedItem = createItemData({
			id: "item-3",
			allowedPlaces: ["pool-1"],
		});
		expect(isInCategory(uncategorizedItem, "hardware")).toBe(false);
	});
});

describe("Clone Functions", () => {
	it("clones an entity with new ID", () => {
		const original = createEntityData({
			id: "ent-1",
			type: "packet",
			name: "Original",
			visual: { icon: "📦", color: "blue" },
			data: { source: "192.168.1.1" },
			state: { hops: 5 },
			behaviorIds: ["send"],
		});

		const clone = cloneEntityData(original, "ent-2");

		expect(clone.id).toBe("ent-2");
		expect(clone.type).toBe("packet");
		expect(clone.name).toBe("Original");
		expect(clone.visual).toEqual({ icon: "📦", color: "blue" });
		expect(clone.data).toEqual({ source: "192.168.1.1" });
		expect(clone.state).toEqual({ hops: 5 });
		expect(clone.behaviorIds).toEqual(["send"]);
	});

	it("clone is a deep copy (mutations don't affect original)", () => {
		const original = createEntityData({
			id: "ent-1",
			type: "packet",
			visual: { color: "blue" },
			data: { count: 1 },
			state: { value: "a" },
			behaviorIds: ["b1"],
		});

		const clone = cloneEntityData(original, "ent-2");

		// Mutate clone
		clone.visual.color = "red";
		clone.data.count = 2;
		clone.state.value = "b";
		clone.behaviorIds.push("b2");

		// Original should be unchanged
		expect(original.visual.color).toBe("blue");
		expect(original.data.count).toBe(1);
		expect(original.state.value).toBe("a");
		expect(original.behaviorIds).toEqual(["b1"]);
	});

	it("clones an item with new ID", () => {
		const original = createItemData({
			id: "item-1",
			name: "Router",
			allowedPlaces: ["grid-1", "grid-2"],
			icon: { icon: "router-fill", color: "green" },
			tooltip: { content: "A router" },
			visual: { size: "lg" },
			data: { ports: 4 },
			state: { connected: true },
			behaviorIds: ["connect"],
			category: "hardware",
		});

		const clone = cloneItemData(original, "item-2");

		expect(clone.id).toBe("item-2");
		expect(clone.type).toBe("item");
		expect(clone.name).toBe("Router");
		expect(clone.allowedPlaces).toEqual(["grid-1", "grid-2"]);
		expect(clone.icon).toEqual({ icon: "router-fill", color: "green" });
		expect(clone.tooltip).toEqual({ content: "A router" });
		expect(clone.visual).toEqual({ size: "lg" });
		expect(clone.data).toEqual({ ports: 4 });
		expect(clone.state).toEqual({ connected: true });
		expect(clone.behaviorIds).toEqual(["connect"]);
		expect(clone.category).toBe("hardware");
	});

	it("item clone is a deep copy", () => {
		const original = createItemData({
			id: "item-1",
			allowedPlaces: ["grid-1"],
			icon: { icon: "test-icon", color: "green" },
			tooltip: { content: "test" },
			data: { count: 1 },
			state: { value: "a" },
			behaviorIds: ["b1"],
		});

		const clone = cloneItemData(original, "item-2");

		// Mutate clone
		if (clone.icon) clone.icon.color = "red";
		if (clone.tooltip) clone.tooltip.content = "modified";
		clone.data.count = 2;
		clone.state.value = "b";
		clone.behaviorIds.push("b2");
		clone.allowedPlaces.push("grid-2");

		// Original should be unchanged
		expect(original.icon?.color).toBe("green");
		expect(original.tooltip?.content).toBe("test");
		expect(original.data.count).toBe(1);
		expect(original.state.value).toBe("a");
		expect(original.behaviorIds).toEqual(["b1"]);
		expect(original.allowedPlaces).toEqual(["grid-1"]);
	});
});
