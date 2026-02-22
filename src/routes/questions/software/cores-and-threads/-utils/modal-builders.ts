import type {
	ModalAction,
	ModalContentBlock,
	ModalInstance,
} from "@/components/game/engine";
import { MODAL_IDS } from "./constants";

const text = (value: string): ModalContentBlock => ({
	kind: "text",
	text: value,
});

const action = (
	id: string,
	label: string,
	variant: ModalAction["variant"] = "primary",
): ModalAction => ({
	id,
	label,
	variant,
	closesModal: true,
	validate: false,
});

export const buildBootPromptModal = (): ModalInstance => ({
	id: MODAL_IDS.bootPrompt,
	title: "Welcome to Your Web Server",
	content: [
		text("You are about to run a web server and discover why threads exist."),
		text("Press Start Server to begin processing HTTP requests."),
	],
	actions: [action("start", "Start Server")],
});

export const buildOverloadHitModal = (): ModalInstance => ({
	id: MODAL_IDS.overloadHit,
	title: "Server Overload!",
	content: [
		text("Requests are timing out because the single core can't keep up."),
		text("Add more CPU cores to process requests in parallel."),
	],
	actions: [action("add-core", "Add Core")],
});

export const buildCoresIntroModal = (): ModalInstance => ({
	id: MODAL_IDS.coresIntro,
	title: "Multiple Cores Enabled",
	content: [
		text("You now have multiple cores processing requests!"),
		text("Watch as requests are distributed across available lanes."),
	],
	actions: [action("continue", "Continue")],
});

export const buildIoWallHitModal = (): ModalInstance => ({
	id: MODAL_IDS.ioWallHit,
	title: "I/O Wall Hit",
	content: [
		text("Requests are stuck waiting for I/O operations to complete."),
		text("Enable threading to free up lanes during I/O waits."),
	],
	actions: [action("enable-threads", "Enable Threads")],
});

export const buildThreadsIntroModal = (): ModalInstance => ({
	id: MODAL_IDS.threadsIntro,
	title: "Threading Enabled",
	content: [
		text("Threading is now active!"),
		text("Requests can now move to I/O wait, freeing lanes for new requests."),
	],
	actions: [action("continue", "Continue")],
});

export const buildCompleteModal = (): ModalInstance => ({
	id: MODAL_IDS.complete,
	title: "Completed: Cores and Threads",
	content: [
		text("You learned about CPU cores, request processing, and threading."),
		text(
			"This is the core reason why modern servers use both multiple cores and threads.",
		),
	],
	actions: [action("complete", "Complete")],
});
