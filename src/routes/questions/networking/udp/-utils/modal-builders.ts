import type {
	ModalAction,
	ModalContentBlock,
	ModalInstance,
} from "@/components/game/engine";

const closeAction = (label = "Continue"): ModalAction => ({
	id: "close",
	label,
	variant: "primary",
	closesModal: true,
	validate: false,
});

const buildText = (text: string): ModalContentBlock => ({
	kind: "text",
	text,
});

export const buildTcpConnectedModal = (): ModalInstance => ({
	id: "tcp-connected",
	title: "🟢 All Clients Connected!",
	content: [
		buildText("Great! You've established TCP connections with all 3 viewers."),
		buildText("That took 9 actions just to set up connections."),
		buildText("Now let's send the actual video data..."),
	],
	actions: [closeAction("Continue")],
});

export const buildNewClientModal = (): ModalInstance => ({
	id: "tcp-new-client",
	title: "📱 New Viewer Joined!",
	content: [
		buildText("Client D wants to watch your stream."),
		buildText("Handle their connection request before they can receive video."),
	],
	actions: [closeAction("Handle Connection")],
});

export const buildTimeoutModal = (): ModalInstance => ({
	id: "tcp-timeout",
	title: "⚠️ Connection Timeout!",
	content: [
		buildText(
			"While you were busy with Client D, Clients A, B, and C got impatient.",
		),
		buildText("Their connections timed out. You need to reconnect them."),
		buildText("TCP requires constant state management."),
	],
	actions: [
		{
			id: "reconnect",
			label: "Reconnect Clients",
			variant: "primary",
			closesModal: true,
			validate: false,
		},
	],
});

export const buildBreakingPointModal = (): ModalInstance => ({
	id: "tcp-exhaustion",
	title: "😤 This is exhausting...",
	blocking: true,
	content: [
		buildText("You've done 20+ actions just managing connections."),
		buildText("And you've barely sent any actual video data!"),
		buildText("What if the server didn't need to track connections at all?"),
	],
	actions: [
		{
			id: "continue",
			label: "Discover UDP",
			variant: "primary",
			closesModal: true,
			validate: false,
		},
	],
});

export const buildUdpSuccessModal = (): ModalInstance => ({
	id: "udp-success",
	title: "🎉 Stream Delivered!",
	content: [
		buildText("All clients received enough frames to watch the video."),
		buildText("UDP sends data without connections or acknowledgments."),
		buildText("Some packets get lost — and that's okay for streaming."),
	],
	actions: [
		{
			id: "complete",
			label: "Complete",
			variant: "primary",
			closesModal: true,
			validate: false,
		},
	],
});
