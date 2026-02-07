/**
 * useDrawerManager hook.
 * Provides a convenient API for registering and controlling drawers.
 */

import { useCallback } from "react";
import type { DrawerConfig, DrawerInstance } from "../../core/types";
import { useGameDispatch } from "../../game-provider";

export type DrawerManager = {
	registerDrawer: (config: DrawerConfig) => void;
	openDrawer: (drawerId: string) => void;
	closeDrawer: (drawerId: string) => void;
	toggleDrawer: (drawerId: string) => void;
	updateDrawerConfig: (
		drawerId: string,
		config: Partial<DrawerInstance>,
	) => void;
};

/**
 * Hook to register and control drawers.
 *
 * @example
 * ```ts
 * const { registerDrawer, openDrawer } = useDrawerManager();
 * useEffect(() => {
 *   registerDrawer({
 *     id: "inventory-drawer",
 *     contentType: "space",
 *     spaceId: "inventory",
 *     title: "Inventory",
 *   });
 * }, [registerDrawer]);
 *
 * openDrawer("inventory-drawer");
 * ```
 */
export const useDrawerManager = (): DrawerManager => {
	const dispatch = useGameDispatch();

	const registerDrawer = useCallback(
		(config: DrawerConfig) => {
			const resolvedState = config.initialState ?? "expanded";
			const instance: DrawerInstance = {
				...config,
				state: resolvedState,
				initialState: config.initialState ?? resolvedState,
			};

			dispatch({ type: "REGISTER_DRAWER", payload: instance });
		},
		[dispatch],
	);

	const openDrawer = useCallback(
		(drawerId: string) => {
			dispatch({ type: "OPEN_DRAWER", payload: { drawerId } });
		},
		[dispatch],
	);

	const closeDrawer = useCallback(
		(drawerId: string) => {
			dispatch({ type: "CLOSE_DRAWER", payload: { drawerId } });
		},
		[dispatch],
	);

	const toggleDrawer = useCallback(
		(drawerId: string) => {
			dispatch({ type: "TOGGLE_DRAWER", payload: { drawerId } });
		},
		[dispatch],
	);

	const updateDrawerConfig = useCallback(
		(drawerId: string, config: Partial<DrawerInstance>) => {
			dispatch({
				type: "UPDATE_DRAWER_CONFIG",
				payload: { drawerId, config },
			});
		},
		[dispatch],
	);

	return {
		registerDrawer,
		openDrawer,
		closeDrawer,
		toggleDrawer,
		updateDrawerConfig,
	};
};
