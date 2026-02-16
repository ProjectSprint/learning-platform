/**
 * DHCP QuestionDefinition — declarative config for the DHCP question.
 *
 * Converts existing constants (SPACE_CONFIGS, INVENTORY_POOL_CONFIG,
 * INVENTORY_ITEMS) into a QuestionDefinition that bootstrapQuestion() can use.
 */

import type { QuestionDefinition } from "@/components/game/engine/types";
import { DHCP_BEHAVIORS, type DhcpBehaviorContext } from "./behaviors";
import {
	INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	SPACE_CONFIGS,
} from "./constants";

export type DhcpConditionKey = "dragStatus" | "questionStatus";

export const DHCP_DEFINITION: QuestionDefinition<
	DhcpConditionKey,
	DhcpBehaviorContext
> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "setup",
	spaces: [
		...Object.values(SPACE_CONFIGS).map((config) => ({
			kind: "grid" as const,
			config,
		})),
		{ kind: "pool" as const, config: INVENTORY_POOL_CONFIG },
	],
	entities: INVENTORY_ITEMS.map((item) => ({
		config: {
			id: item.id,
			name: item.name,
			icon: item.icon,
			tooltip: item.tooltip,
			allowedPlaces: item.allowedPlaces,
			data: { ...item.data, type: item.type },
		},
		initialSpace: "inventory",
	})),
	phaseRules: [
		{
			kind: "set",
			when: { kind: "eq", key: "questionStatus", value: "completed" },
			to: "completed",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "finished" },
			to: "terminal",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "started" },
			to: "playing",
		},
	],
	behaviors: DHCP_BEHAVIORS,
};
