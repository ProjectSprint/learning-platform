/**
 * useDrawerManager hook.
 * Provides a convenient API for registering and controlling drawers.
 */

import type {
	DrawerConfig,
	DrawerInstance,
} from "@/components/game/types/drawer";
import { useDrawerStore } from "../../presentation/drawer/drawer-context";

type DrawerManager = {
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
	const {
		registerDrawer,
		openDrawer,
		closeDrawer,
		toggleDrawer,
		updateDrawerConfig,
	} = useDrawerStore();

	return {
		registerDrawer,
		openDrawer,
		closeDrawer,
		toggleDrawer,
		updateDrawerConfig,
	};
};
