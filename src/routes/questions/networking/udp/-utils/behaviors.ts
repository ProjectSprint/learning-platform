import {
	buildEntityPlacedTrigger,
	buildModalSubmitTrigger,
	createEntityPayloadWriter,
	type ModalSubmissionContract,
	parseModalSubmission,
} from "@/components/game/engine/runtime";
import type {
	BehaviorDefinitionFor,
	BehaviorRuleFor,
} from "@/components/game/types/behavior";
import type { EntityEnteredSpaceEvent } from "@/components/game/types/state";
import type { UdpClientId } from "./constants";
import {
	type CustomSpaceKey,
	type GridSpaceKey,
	UDP_CLIENT_IDS,
} from "./constants";
import { getFrameDestiny, TOTAL_FRAMES } from "./frame-destiny";
import { buildUdpSuccessModal } from "./modal-builders";

const FRAME_SEND_MS = 1500;
const REJECT_MS = 400;
const NOTICE_MS = 2000;

export type UdpBehaviorContext = {
	navigateAway: boolean;
	udpPhase: "intro" | "streaming" | "complete";
	lastSentFrame: number;
	noticeMessage: string | null;
	noticeTone: "error" | "info" | null;
	clientFramesA: string;
	clientFramesB: string;
	clientFramesC: string;
};

export type UdpPhaseId = "setup";
export type UdpSpaceId =
	| GridSpaceKey
	| CustomSpaceKey
	| "inventory"
	| "received";
export type UdpEntityType =
	| "syn-packet"
	| "syn-ack-packet"
	| "ack-packet"
	| "data-packet"
	| "frame";
type UdpModalId = "udp-success";
type UdpModalActionId = "complete";

type UdpTriggerSpec = {
	spaceId: UdpSpaceId;
	entityType: UdpEntityType;
	modalId: UdpModalId;
	modalActionId: UdpModalActionId;
	phase: UdpPhaseId;
};

const INITIAL_CLIENT_FRAMES = "0".repeat(TOTAL_FRAMES);

type UdpEntityDataByType = {
	frame: {
		status: "error" | "warning";
		state: "rejected" | "sending";
	};
};

const UDP_SUCCESS_NAVIGATION_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "complete",
	modalId: "udp-success",
	parse: () => ({ ok: true, value: null }),
};

const getClientFramesKey = (
	clientId: UdpClientId,
): keyof Pick<
	UdpBehaviorContext,
	"clientFramesA" | "clientFramesB" | "clientFramesC"
> => {
	switch (clientId) {
		case "a":
			return "clientFramesA";
		case "b":
			return "clientFramesB";
		case "c":
			return "clientFramesC";
	}
};

const rules: BehaviorRuleFor<UdpBehaviorContext, UdpTriggerSpec>[] = [
	{
		id: "udp.frame-entered-internet",
		on: buildEntityPlacedTrigger("internet", "frame"),
		guard: ({ context }) => context.udpPhase === "streaming",
		handler: (ctx) => {
			const { event, entity, world, context, updateContext, schedule } = ctx;
			if (!entity) return;
			const payloadWriter = createEntityPayloadWriter<
				UdpEntityDataByType,
				Record<string, never>
			>(world);
			const e = event as EntityEnteredSpaceEvent;
			const entityId = e.entityId;
			const frameNumber =
				typeof entity.data?.frameNumber === "number"
					? entity.data.frameNumber
					: 0;
			const expectedFrame = context.lastSentFrame + 1;

			if (frameNumber !== expectedFrame) {
				payloadWriter.updateData(entityId, "frame", {
					status: "error",
					state: "rejected",
				});
				updateContext((c) => {
					c.noticeMessage = `Send Frame ${expectedFrame} first.`;
					c.noticeTone = "error";
				});
				schedule(`udp:reject:${entityId}`, REJECT_MS, (sCtx) => {
					sCtx.world.removeFromSpace(entityId, "internet");
				});
				schedule("udp:notice-clear", NOTICE_MS, (sCtx) => {
					sCtx.updateContext((c) => {
						c.noticeMessage = null;
						c.noticeTone = null;
					});
				});
				return;
			}

			payloadWriter.updateData(entityId, "frame", {
				status: "warning",
				state: "sending",
			});

			schedule(`udp:send:${entityId}`, FRAME_SEND_MS, (sCtx) => {
				sCtx.world.removeFromSpace(entityId, "internet");

				sCtx.updateContext((c) => {
					c.lastSentFrame = frameNumber;

					for (const clientId of UDP_CLIENT_IDS) {
						const key = getClientFramesKey(clientId);
						const frames = c[key].split("");
						frames[frameNumber - 1] =
							getFrameDestiny(frameNumber, clientId) === "delivered"
								? "1"
								: "0";
						c[key] = frames.join("");
					}

					if (frameNumber >= TOTAL_FRAMES) {
						c.udpPhase = "complete";
					}
				});

				if (frameNumber >= TOTAL_FRAMES) {
					sCtx.interaction.openModal(buildUdpSuccessModal());
					sCtx.progress.completeQuestion();
				}
			});
		},
	},
	{
		id: "udp.success-navigate",
		on: buildModalSubmitTrigger("udp-success", "complete"),
		handler: ({ event, updateContext }) => {
			const parsed = parseModalSubmission(
				event,
				UDP_SUCCESS_NAVIGATION_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},
];

export const UDP_BEHAVIORS: BehaviorDefinitionFor<
	UdpBehaviorContext,
	UdpTriggerSpec
> = {
	initialContext: {
		navigateAway: false,
		udpPhase: "streaming",
		lastSentFrame: 0,
		noticeMessage: null,
		noticeTone: null,
		clientFramesA: INITIAL_CLIENT_FRAMES,
		clientFramesB: INITIAL_CLIENT_FRAMES,
		clientFramesC: INITIAL_CLIENT_FRAMES,
	},
	rules,
};
