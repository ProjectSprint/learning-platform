import { describe, expect, it } from "vitest";
import type { Action as GameAction } from "@/components/game/application/state/actions";
import {
	INVENTORY_POOL_CONFIG as DHCP_INVENTORY_POOL_CONFIG,
	SPACE_CONFIGS as DHCP_SPACE_CONFIGS,
} from "../dhcp/-utils/constants";
import { initializeDhcpQuestion } from "../dhcp/-utils/init-spaces";
import {
	INVENTORY_POOL_CONFIG as INTERNET_INVENTORY_POOL_CONFIG,
	SPACE_CONFIGS as INTERNET_SPACE_CONFIGS,
} from "../internet/-utils/constants";
import { initializeInternetQuestion } from "../internet/-utils/init-spaces";
import {
	INVENTORY_POOL_CONFIG as TCP_INVENTORY_POOL_CONFIG,
	RECEIVED_POOL_CONFIG as TCP_RECEIVED_POOL_CONFIG,
	SPACE_CONFIGS as TCP_SPACE_CONFIGS,
} from "../tcp/-utils/constants";
import { initializeTcpQuestion } from "../tcp/-utils/init-spaces";
import {
	INVENTORY_POOL_CONFIG as UDP_INVENTORY_POOL_CONFIG,
	SPACE_CONFIGS as UDP_SPACE_CONFIGS,
} from "../udp/-utils/constants";
import { initializeUdpQuestion } from "../udp/-utils/init-spaces";
import {
	INVENTORY_POOL_CONFIG as SSL_INVENTORY_POOL_CONFIG,
	SSL_ITEMS_POOL_CONFIG,
	SSL_SETUP_POOL_CONFIG,
	SPACE_CONFIGS as SSL_SPACE_CONFIGS,
} from "../webserver-ssl/-utils/constants";
import { initializeSslQuestion } from "../webserver-ssl/-utils/init-spaces";

const collectActions = (
	initialize: (dispatch: (action: GameAction) => void) => void,
): GameAction[] => {
	const actions: GameAction[] = [];
	initialize((action) => {
		actions.push(action);
	});
	return actions;
};

const getSpaceCreatedIds = (actions: GameAction[]): string[] => {
	return actions
		.filter((action) => action.type === "SPACE_CREATED")
		.map((action) => action.payload.space.id);
};

const assertBootOrder = (actions: GameAction[]) => {
	expect(actions[0]?.type).toBe("SET_QUESTION");
	expect(actions[1]?.type).toBe("SET_PHASE");

	const firstEntityMutation = actions.findIndex(
		(action) =>
			action.type === "ENTITY_CREATED" || action.type === "ENTITY_ADDED",
	);
	const lastSpaceCreated = actions.reduce((lastIndex, action, index) => {
		return action.type === "SPACE_CREATED" ? index : lastIndex;
	}, -1);

	expect(lastSpaceCreated).toBeGreaterThan(1);
	expect(firstEntityMutation).toBeGreaterThan(lastSpaceCreated);
};

const assertSpaceCoverage = (
	actions: GameAction[],
	expectedSpaceIds: readonly string[],
) => {
	const createdSpaceIds = getSpaceCreatedIds(actions);
	expect(createdSpaceIds).toHaveLength(expectedSpaceIds.length);
	expect(new Set(createdSpaceIds)).toEqual(new Set(expectedSpaceIds));
};

describe("networking init-spaces", () => {
	it("initializes DHCP with explicit space creation before entities", () => {
		const actions = collectActions(initializeDhcpQuestion);
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(DHCP_SPACE_CONFIGS),
			DHCP_INVENTORY_POOL_CONFIG.id,
		]);
	});

	it("initializes Internet with explicit space creation before entities", () => {
		const actions = collectActions(initializeInternetQuestion);
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(INTERNET_SPACE_CONFIGS),
			INTERNET_INVENTORY_POOL_CONFIG.id,
		]);
	});

	it("initializes TCP with explicit space creation before entities", () => {
		const actions = collectActions(initializeTcpQuestion);
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(TCP_SPACE_CONFIGS),
			TCP_INVENTORY_POOL_CONFIG.id,
			TCP_RECEIVED_POOL_CONFIG.id,
		]);
	});

	it("initializes UDP with explicit space creation before entities", () => {
		const actions = collectActions(initializeUdpQuestion);
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(UDP_SPACE_CONFIGS),
			UDP_INVENTORY_POOL_CONFIG.id,
		]);
	});

	it("initializes Webserver-SSL with explicit space creation before entities", () => {
		const actions = collectActions(initializeSslQuestion);
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(SSL_SPACE_CONFIGS),
			SSL_INVENTORY_POOL_CONFIG.id,
			SSL_SETUP_POOL_CONFIG.id,
			SSL_ITEMS_POOL_CONFIG.id,
		]);
	});
});
