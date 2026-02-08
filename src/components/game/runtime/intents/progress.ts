export type ProgressIntent =
	| {
			type: "progress.complete_question";
	  }
	| {
			type: "progress.set_question";
			payload: { id: string; status?: "in_progress" | "completed" };
	  };
