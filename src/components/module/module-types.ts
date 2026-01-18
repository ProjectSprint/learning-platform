import type { ComponentType } from "react";

export type QuestionProps = {
	onQuestionComplete: () => void;
};

export type QuestionConfig = {
	id: string;
	component: ComponentType<QuestionProps>;
};

export type ModuleConfig = {
	id: string;
	title: string;
	questions: QuestionConfig[];
};

export type ModuleProgress = {
	currentIndex: number;
	totalQuestions: number;
};
