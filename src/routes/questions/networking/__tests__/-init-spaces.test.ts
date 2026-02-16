import { describe, expect, it } from "vitest";
import { bootstrapQuestion } from "@/components/game/engine/runtime";
import type { Action as GameAction } from "@/components/game/engine/runtime/types";
import {
	INVENTORY_POOL_CONFIG as DHCP_INVENTORY_POOL_CONFIG,
	SPACE_CONFIGS as DHCP_SPACE_CONFIGS,
} from "../dhcp/-utils/constants";
import { DHCP_DEFINITION } from "../dhcp/-utils/definition";
import {
	INVENTORY_POOL_CONFIG as INTERNET_INVENTORY_POOL_CONFIG,
	SPACE_CONFIGS as INTERNET_SPACE_CONFIGS,
} from "../internet/-utils/constants";
import { INTERNET_DEFINITION } from "../internet/-utils/definition";
import {
	INVENTORY_POOL_CONFIG as TCP_INVENTORY_POOL_CONFIG,
	RECEIVED_POOL_CONFIG as TCP_RECEIVED_POOL_CONFIG,
	SPACE_CONFIGS as TCP_SPACE_CONFIGS,
} from "../tcp/-utils/constants";
import { TCP_DEFINITION } from "../tcp/-utils/definition";
import {
	CUSTOM_SPACE_CONFIGS as UDP_CUSTOM_SPACE_CONFIGS,
	GRID_SPACE_CONFIGS as UDP_GRID_SPACE_CONFIGS,
	INVENTORY_POOL_CONFIG as UDP_INVENTORY_POOL_CONFIG,
	RECEIVED_POOL_CONFIG as UDP_RECEIVED_POOL_CONFIG,
} from "../udp/-utils/constants";
import { UDP_DEFINITION } from "../udp/-utils/definition";
import {
	INVENTORY_POOL_CONFIG as SSL_INVENTORY_POOL_CONFIG,
	SSL_ITEMS_POOL_CONFIG,
	SSL_SETUP_POOL_CONFIG,
	SPACE_CONFIGS as SSL_SPACE_CONFIGS,
} from "../webserver-ssl/-utils/constants";
import { SSL_DEFINITION } from "../webserver-ssl/-utils/definition";

const collectActions = (
	run: (dispatch: (action: GameAction) => void) => void,
): GameAction[] => {
	const actions: GameAction[] = [];
	run((action) => {
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
	it("initializes DHCP via QuestionDefinition bootstrap", () => {
		const actions = collectActions((dispatch) => {
			bootstrapQuestion(DHCP_DEFINITION, dispatch);
		});
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(DHCP_SPACE_CONFIGS),
			DHCP_INVENTORY_POOL_CONFIG.id,
		]);
	});

	it("initializes Internet with explicit space creation before entities", () => {
		const actions = collectActions((dispatch) => {
			bootstrapQuestion(INTERNET_DEFINITION, dispatch);
		});
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(INTERNET_SPACE_CONFIGS),
			INTERNET_INVENTORY_POOL_CONFIG.id,
		]);
	});

	it("initializes TCP via QuestionDefinition bootstrap", () => {
		const actions = collectActions((dispatch) => {
			bootstrapQuestion(TCP_DEFINITION, dispatch);
		});
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(TCP_SPACE_CONFIGS),
			TCP_INVENTORY_POOL_CONFIG.id,
			TCP_RECEIVED_POOL_CONFIG.id,
		]);
	});

	it("initializes UDP via QuestionDefinition bootstrap", () => {
		const actions = collectActions((dispatch) => {
			bootstrapQuestion(UDP_DEFINITION, dispatch);
		});
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(UDP_GRID_SPACE_CONFIGS),
			...Object.keys(UDP_CUSTOM_SPACE_CONFIGS),
			UDP_INVENTORY_POOL_CONFIG.id,
			UDP_RECEIVED_POOL_CONFIG.id,
		]);
	});

	it("initializes Webserver-SSL with explicit space creation before entities", () => {
		const actions = collectActions((dispatch) => {
			bootstrapQuestion(SSL_DEFINITION, dispatch);
		});
		assertBootOrder(actions);
		assertSpaceCoverage(actions, [
			...Object.keys(SSL_SPACE_CONFIGS),
			SSL_INVENTORY_POOL_CONFIG.id,
			SSL_SETUP_POOL_CONFIG.id,
			SSL_ITEMS_POOL_CONFIG.id,
		]);
	});
});
