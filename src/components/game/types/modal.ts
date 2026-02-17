export type ModalHelpLink = {
	label: string;
	href: string;
};

export type ModalFieldValidator<Value = unknown> = (
	value: Value,
	allValues: Record<string, unknown>,
) => string | null;

type BaseModalField = {
	id: string;
	label: string;
	helpText?: string;
	helpLink?: ModalHelpLink;
};

export type ModalTextField = BaseModalField & {
	kind: "text";
	placeholder?: string;
	defaultValue?: string;
	validate?: ModalFieldValidator<string>;
};

export type ModalTextareaField = BaseModalField & {
	kind: "textarea";
	placeholder?: string;
	defaultValue?: string;
	validate?: ModalFieldValidator<string>;
};

export type ModalCheckboxField = BaseModalField & {
	kind: "checkbox";
	defaultValue?: boolean;
};

export type ModalSelectOption = {
	value: string;
	label: string;
};

export type ModalSelectField = BaseModalField & {
	kind: "select";
	options: ModalSelectOption[];
	placeholder?: string;
	defaultValue?: string;
	validate?: ModalFieldValidator<string>;
};

export type ModalReadonlyField = BaseModalField & {
	kind: "readonly";
	value: string;
};

export type ModalField =
	| ModalTextField
	| ModalTextareaField
	| ModalCheckboxField
	| ModalSelectField
	| ModalReadonlyField;

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

export type ModalActionVariant = "primary" | "secondary" | "ghost" | "danger";

export type ModalAction = {
	id: string;
	label: string;
	variant?: ModalActionVariant;
	validate?: boolean;
	closesModal?: boolean;
};

export type ModalInstance = {
	id?: string;
	title?: string;
	content: ModalContentBlock[];
	actions: ModalAction[];
	blocking?: boolean;
	initialValues?: Record<string, unknown>;
};

export type ModalEntry = {
	instance: ModalInstance;
	visible: boolean;
};

export type OverlayState = {
	modals: Record<string, ModalEntry>;
};
