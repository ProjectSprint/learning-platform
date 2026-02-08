import type { Action } from "../../application/state/actions";
import type { Commands } from "../commands/types";
import {
	type RuntimeApiResult,
	runtimeError,
	runtimeOk,
	toRuntimeErrorMessage,
} from "./result";

export type ProgressApi = {
	completeQuestion: () => RuntimeApiResult;
	setQuestion: (input: {
		id: string;
		status?: "in_progress" | "completed";
	}) => RuntimeApiResult;
};

type ProgressApiDeps = {
	commands: Commands;
	dispatch: (action: Action) => void;
};

export const createProgressApi = ({
	commands,
	dispatch,
}: ProgressApiDeps): ProgressApi => ({
	completeQuestion() {
		try {
			commands.completeQuestion();
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`progressApi.completeQuestion: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	setQuestion(input) {
		try {
			dispatch({
				type: "SET_QUESTION",
				payload: {
					id: input.id,
					status: input.status,
				},
			});
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`progressApi.setQuestion: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},
});
