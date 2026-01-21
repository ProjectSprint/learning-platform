import type {
	ModalAction,
	ModalContentBlock,
	ModalInstance,
} from "@/components/game/modal-types";
import { MTU_HELP_LINK } from "./constants";

const closeAction = (): ModalAction => ({
	id: "close",
	label: "Close",
	variant: "primary",
	closesModal: true,
	validate: false,
});

const buildText = (text: string): ModalContentBlock => ({
	kind: "text",
	text,
});

const buildLink = (text: string, href: string): ModalContentBlock => ({
	kind: "link",
	text,
	href,
});

export const buildMtuModal = (): ModalInstance => ({
	id: "mtu-limit",
	title: "🚧 MTU Limit Reached",
	content: [
		buildText(
			"message.txt is too large to fit in a single network packet.",
		),
		buildText(
			"Networks enforce an MTU (Maximum Transmission Unit) which caps packet size.",
		),
		buildText("We need to split the file before it can travel."),
		buildLink("What is MTU?", MTU_HELP_LINK),
	],
	actions: [closeAction()],
});

export const buildSynIntroModal = (): ModalInstance => ({
	id: "syn-intro",
	title: "🟡 Start the Handshake (SYN)",
	content: [
		buildText(
			"The server rejected the fragments because no TCP connection exists yet.",
		),
		buildText(
			"Send a SYN to request a connection and sync a starting sequence number.",
		),
		buildText("If the server agrees, it responds with SYN-ACK."),
	],
	actions: [closeAction()],
});

export const buildSynAckModal = (
	onContinue?: VoidFunction,
): ModalInstance => ({
	id: "syn-ack-received",
	title: "✅ SYN-ACK Received",
	content: [
		buildText(
			"The server accepted your SYN and replied with SYN-ACK.",
		),
		buildText(
			"That means it is ready and has shared its own sequence number.",
		),
	],
	actions: [
		{
			id: "continue",
			label: "OK",
			variant: "primary",
			validate: false,
			closesModal: !onContinue,
			onClick: onContinue ? () => onContinue() : undefined,
		},
	],
});

export const buildAckIntroModal = (): ModalInstance => ({
	id: "ack-intro",
	title: "✅ Send ACK",
	content: [
		buildText(
			"ACK confirms the server's SYN-ACK and completes the handshake.",
		),
		buildText("Send the ACK so the connection opens and data can flow."),
	],
	actions: [
		{
			id: "ack",
			label: "Send ACK",
			variant: "primary",
			validate: false,
			closesModal: true,
		},
	],
});

export const buildHandshakeCompleteModal = (): ModalInstance => ({
	id: "handshake-complete",
	title: "🔗 Connection Established",
	content: [
		buildText(
			"Connection established! During the handshake, both sides agreed on a starting sequence number.",
		),
		buildText(
			"Now your packets will be numbered so the server can order and verify them.",
		),
	],
	actions: [closeAction()],
});

export const buildHolBlockingModal = (): ModalInstance => ({
	id: "hol-blocking",
	title: "⏳ Head-of-Line Blocking",
	content: [
		buildText(
			"That packet arrived out of order. The server won't reject it.",
		),
		buildText(
			"It buffers the packet, waits for the missing one, then reorders the stream to rebuild the file.",
		),
	],
	actions: [closeAction()],
});

export const buildPacketLossModal = (): ModalInstance => ({
	id: "packet-loss",
	title: "💨 Packets Lost",
	content: [
		buildText(
			"Packet #2 vanished in the internet. Real networks can be unreliable, so packets sometimes disappear.",
		),
		buildText("The server is waiting for the missing packet."),
	],
	actions: [closeAction()],
});

export const buildDuplicateAckModal = (missingSeq: number): ModalInstance => ({
	id: "duplicate-acks",
	title: "🔁 Duplicate ACKs",
	content: [
		buildText(
			`The server keeps repeating ACK ${missingSeq}. It still needs packet #${missingSeq}.`,
		),
		buildText(
			`Three duplicate ACKs signal loss, so resend packet #${missingSeq} now.`,
		),
	],
	actions: [closeAction()],
});

export const buildCloseConnectionModal = (): ModalInstance => ({
	id: "close-connection",
	title: "👋 Close the Connection",
	content: [
		buildText(
			"The transfer is complete. Send FIN so both sides can close the connection cleanly.",
		),
	],
	actions: [closeAction()],
});

export const buildSuccessModal = (
	onQuestionComplete?: VoidFunction,
): ModalInstance => ({
	id: "tcp-success",
	title: "✅ Delivery Complete",
	content: [
		buildText("You handled MTU limits, ordering, loss, and the handshake."),
		buildText("TCP turned unreliable delivery into a reliable stream."),
	],
	actions: [
		{
			id: "primary",
			label: "Next question",
			variant: "primary",
			validate: false,
			closesModal: true,
			onClick: onQuestionComplete ? () => onQuestionComplete() : undefined,
		},
	],
});
