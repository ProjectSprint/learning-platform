import { normalizeConnectionKey } from "../../connections";
import { findInventoryItem } from "../../validation/inventory";
import type { GameAction } from "../actions";
import type {
	CanvasState,
	Connection,
	CrossCanvasConnection,
	GameState,
} from "../types";
import { resolveCanvasState, updateCanvasState } from "./canvas-state";

const isItemOnCanvas = (
	itemId: string,
	canvases: Record<string, CanvasState> | undefined,
): boolean => {
	if (!canvases) return false;
	return Object.values(canvases).some((canvas) =>
		canvas.placedItems.some((item) => item.itemId === itemId),
	);
};

export const connectionReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "MAKE_CONNECTION": {
			const canvas = resolveCanvasState(state, action.payload.canvasId);
			const { from, to, cableId } = action.payload;

			if (from.x === to.x && from.y === to.y) {
				return state;
			}

			const fromBlock = canvas.blocks[from.y]?.[from.x];
			const toBlock = canvas.blocks[to.y]?.[to.x];

			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			const connectionKey = normalizeConnectionKey(from, to);
			const exists = canvas.connections.some(
				(connection) =>
					normalizeConnectionKey(connection.from, connection.to) ===
					connectionKey,
			);

			if (exists) {
				return state;
			}

			if (cableId) {
				const cableItem = findInventoryItem(
					state.inventory.groups,
					cableId,
				)?.item;
				if (!cableItem) {
					return state;
				}
				if (isItemOnCanvas(cableId, state.canvases)) {
					return state;
				}
			}

			const connectionId = `connection-${connectionKey}-${cableId ?? "link"}`;
			const nextConnections: Connection[] = [
				...canvas.connections,
				{
					id: connectionId,
					type: "cable",
					from,
					to,
					cableId,
				},
			];

			const nextCanvas: CanvasState = {
				...canvas,
				connections: nextConnections,
			};

			return updateCanvasState(
				{
					...state,
				},
				action.payload.canvasId,
				nextCanvas,
			);
		}
		case "REMOVE_CONNECTION": {
			const canvas = resolveCanvasState(state, action.payload.canvasId);
			const connection = canvas.connections.find(
				(entry) => entry.id === action.payload.connectionId,
			);

			if (!connection) {
				return state;
			}

			const nextConnections = canvas.connections.filter(
				(entry) => entry.id !== action.payload.connectionId,
			);

			const nextCanvas: CanvasState = {
				...canvas,
				connections: nextConnections,
			};

			return updateCanvasState(
				{
					...state,
				},
				action.payload.canvasId,
				nextCanvas,
			);
		}
		case "MAKE_CROSS_CONNECTION": {
			const { from, to, cableId } = action.payload;
			if (!state.canvases) {
				return state;
			}

			if (from.canvasId === to.canvasId) {
				return state;
			}

			const fromCanvas = state.canvases[from.canvasId];
			const toCanvas = state.canvases[to.canvasId];
			if (!fromCanvas || !toCanvas) {
				return state;
			}

			const fromBlock = fromCanvas.blocks[from.y]?.[from.x];
			const toBlock = toCanvas.blocks[to.y]?.[to.x];
			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			const nextConnection: CrossCanvasConnection = {
				id: crypto.randomUUID(),
				type: "cable",
				from,
				to,
				cableId,
			};

			return {
				...state,
				crossConnections: [...state.crossConnections, nextConnection],
			};
		}
		case "REMOVE_CROSS_CONNECTION": {
			const nextConnections = state.crossConnections.filter(
				(connection) => connection.id !== action.payload.connectionId,
			);

			return {
				...state,
				crossConnections: nextConnections,
			};
		}
		default:
			return state;
	}
};
