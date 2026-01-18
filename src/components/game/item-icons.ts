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
	"router-lan": {
		icon: { icon: "mdi:lan" },
		behavior: "connectable",
	},
	"router-nat": {
		icon: { icon: "mdi:swap-horizontal" },
		behavior: "connectable",
	},
	"router-wan": {
		icon: { icon: "mdi:wan" },
		behavior: "connectable",
	},
	fiber: {
		icon: { icon: "mdi:fiber-smart-record", color: "#f97316" },
		behavior: "connectable",
	},
	igw: {
		icon: { icon: "mdi:server-network" },
		behavior: "connectable",
	},
	internet: {
		icon: { icon: "mdi:cloud" },
		behavior: "connectable",
	},
	dns: {
		icon: { icon: "mdi:dns" },
		behavior: "connectable",
	},
	google: {
		icon: { icon: "mdi:google" },
		behavior: "connectable",
	},
};

export const ITEM_ICONS: Record<string, IconInfo> = {
	router: { icon: "streamline-flex-color:router-wifi-network" },
	cable: { icon: "mdi:ethernet-cable", color: "#2596be" },
	pc: { icon: "twemoji:laptop-computer" },
	"router-lan": { icon: "mdi:lan" },
	"router-nat": { icon: "mdi:swap-horizontal" },
	"router-wan": { icon: "mdi:wan" },
	fiber: { icon: "mdi:fiber-smart-record", color: "#f97316" },
	igw: { icon: "mdi:server-network" },
	internet: { icon: "mdi:cloud" },
	dns: { icon: "mdi:dns" },
	google: { icon: "mdi:google" },
};
