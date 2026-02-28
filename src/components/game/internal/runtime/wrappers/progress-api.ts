import type { Commands, ProgressApi } from "@/components/game/types/runtime";
import type { Action } from "@/components/game/types/state";
import { runtimeError, runtimeOk, toRuntimeErrorMessage } from "./result";

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

	setQuestionStatus(input) {
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
				`progressApi.setQuestionStatus: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},
});
