export type IconInfo = {
	icon: string;
	color?: string;
};

export type ItemBehavior = "connectable" | "scheduled";

export type ItemConfig = {
	icon?: IconInfo;
	behavior: ItemBehavior;
};

export const ITEM_CONFIGS: Record<string, ItemConfig> = {
	router: {
		icon: { icon: "streamline-flex-color:router-wifi-network" },
		behavior: "connectable",
	},
	cable: {
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
		behavior: "connectable",
	},
	pc: {
		icon: { icon: "twemoji:laptop-computer" },
		behavior: "connectable",
	},
};

export const ITEM_ICONS: Record<string, IconInfo> = {
	router: { icon: "streamline-flex-color:router-wifi-network" },
	cable: { icon: "mdi:ethernet-cable", color: "#2596be" },
	pc: { icon: "twemoji:laptop-computer" },
};
