/**
 * TCP QuestionDefinition — declarative config for the TCP question.
 *
 * Converts existing constants into a QuestionDefinition.
 * TCP has more entity groups than DHCP (file items, system packets,
 * TCP tools, message packets, notes packets) with different initial
 * placement rules.
 */

import type { QuestionDefinition } from "@/components/game/runtime";
import {
	FILE_INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	MESSAGE_PACKET_ITEMS,
	NOTES_FILE_ITEM,
	NOTES_PACKET_ITEMS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	RECEIVED_POOL_CONFIG,
	SPACE_CONFIGS,
	SYSTEM_PACKET_ITEMS,
	TCP_TOOL_ITEMS,
} from "./constants";

export const TCP_DEFINITION: QuestionDefinition = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "mtu",
	spaces: [
		...Object.values(SPACE_CONFIGS).map((config) => ({
			kind: "grid" as const,
			config,
		})),
		{ kind: "pool" as const, config: INVENTORY_POOL_CONFIG },
		{ kind: "pool" as const, config: RECEIVED_POOL_CONFIG },
	],
	entities: [
		// File inventory items — start in inventory
		...FILE_INVENTORY_ITEMS.map((item) => ({
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
		// System packets — created but NOT placed in a space
		...Object.values(SYSTEM_PACKET_ITEMS).map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
			},
		})),
		// TCP tool items — created but NOT placed
		...Object.values(TCP_TOOL_ITEMS).map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
			},
		})),
		// Message packet items — created but NOT placed
		...MESSAGE_PACKET_ITEMS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
			},
		})),
		// Notes file item — created but NOT placed
		{
			config: {
				id: NOTES_FILE_ITEM.id,
				name: NOTES_FILE_ITEM.name,
				icon: NOTES_FILE_ITEM.icon,
				tooltip: NOTES_FILE_ITEM.tooltip,
				allowedPlaces: NOTES_FILE_ITEM.allowedPlaces,
				data: { ...NOTES_FILE_ITEM.data, type: NOTES_FILE_ITEM.type },
			},
		},
		// Notes packet items — created but NOT placed
		...NOTES_PACKET_ITEMS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
			},
		})),
	],
	phaseRules: [], // TCP phases are managed imperatively by useTcpState
};
