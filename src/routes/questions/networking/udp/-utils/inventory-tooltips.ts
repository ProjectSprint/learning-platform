import type { TooltipInfo } from "@/components/game/puzzle/inventory";

export const INVENTORY_TOOLTIPS: Record<string, TooltipInfo> = {
	"syn-packet": {
		content: "SYN starts a TCP handshake to establish a connection.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
	},
	"syn-ack-packet": {
		content: "SYN-ACK confirms the server received the SYN and is ready.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
	},
	"ack-packet": {
		content: "ACK completes the TCP handshake so data can flow.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
	},
	"data-packet": {
		content: "A video packet that must be acknowledged in TCP.",
		seeMoreHref:
			"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Reliable_delivery",
	},
	frame: {
		content: "A UDP frame broadcast to all viewers without waiting for ACKs.",
		seeMoreHref: "https://en.wikipedia.org/wiki/User_Datagram_Protocol",
	},
};
