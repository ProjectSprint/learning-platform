// Data-driven modal types
// The game engine renders modals based on this schema
// Questions provide the structure, the engine renders it

import type { Dispatch } from "react";
import type { GameAction } from "./game-provider";

// Help link metadata for fields
export type ModalHelpLink = {
	label: string;
	href: string;
};

// Field validator function - returns error message or null if valid
export type ModalFieldValidator<Value = unknown> = (
	value: Value,
	allValues: Record<string, unknown>,
) => string | null;

// Base for all fields
type BaseModalField = {
	id: string;
	label: string;
	helpText?: string;
	helpLink?: ModalHelpLink;
};

// Text input field
export type ModalTextField = BaseModalField & {
	kind: "text";
	placeholder?: string;
	defaultValue?: string;
	validate?: ModalFieldValidator<string>;
};

// Textarea field
export type ModalTextareaField = BaseModalField & {
	kind: "textarea";
	placeholder?: string;
	defaultValue?: string;
	validate?: ModalFieldValidator<string>;
};

// Checkbox/toggle field
export type ModalCheckboxField = BaseModalField & {
	kind: "checkbox";
	defaultValue?: boolean;
};

// Select option
export type ModalSelectOption = {
	value: string;
	label: string;
};

// Select dropdown field
export type ModalSelectField = BaseModalField & {
	kind: "select";
	options: ModalSelectOption[];
	placeholder?: string;
	defaultValue?: string;
	validate?: ModalFieldValidator<string>;
};

// Readonly display field
export type ModalReadonlyField = BaseModalField & {
	kind: "readonly";
	value: string;
};

// Union of all field types
export type ModalField =
	| ModalTextField
	| ModalTextareaField
	| ModalCheckboxField
	| ModalSelectField
	| ModalReadonlyField;

// Content block types
export type ModalContentBlock =
	| {
			kind: "text";
			id?: string;
			text: string;
	  }
	| {
			kind: "link";
			id?: string;
			text: string;
			href: string;
	  }
	| {
			kind: "field";
			field: ModalField;
	  };

// Button variants
export type ModalActionVariant = "primary" | "secondary" | "ghost" | "danger";

// Context passed to action callbacks
export type ModalActionContext = {
	values: Record<string, unknown>;
	close: () => void;
	dispatch: Dispatch<GameAction>;
};

// Modal action (button)
export type ModalAction = {
	id: string;
	label: string;
	variant?: ModalActionVariant;
	validate?: boolean;
	closesModal?: boolean;
	onClick?: (ctx: ModalActionContext) => void | Promise<void>;
};

// Complete modal instance
export type ModalInstance = {
	id?: string;
	title?: string;
	content: ModalContentBlock[];
	actions: ModalAction[];
	blocking?: boolean;
	initialValues?: Record<string, unknown>;
};
