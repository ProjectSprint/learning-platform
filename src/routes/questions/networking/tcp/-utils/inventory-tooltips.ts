import type { TooltipInfo } from "@/components/game/inventory-panel";

export const INVENTORY_TOOLTIPS: Record<string, TooltipInfo> = {
	"message-file": {
		content:
			"A large file that must be split into smaller packets before it can travel across the network.",
		seeMoreHref: "https://en.wikipedia.org/wiki/Packet_(information_technology)",
	},
	"notes-file": {
		content:
			"Another file that needs to be split into packets before it can traverse the network.",
		seeMoreHref: "https://en.wikipedia.org/wiki/Packet_(information_technology)",
	},
	"split-packet": {
		content:
			"A fragment of the original file. It must be delivered in order to reassemble the message.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Reliable_delivery",
	},
	"syn-flag": {
		content:
			"SYN starts a TCP handshake to establish a connection.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
	},
	"ack-flag": {
		content:
			"ACK completes the handshake so data can flow.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
	},
	"fin-flag": {
		content:
			"FIN closes a TCP connection cleanly after data transfer.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_termination",
	},
};
