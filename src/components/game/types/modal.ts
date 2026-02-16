export type _ModalHelpLink = {
	label: string;
	href: string;
};

export type _ModalFieldValidator<Value = unknown> = (
	value: Value,
	allValues: Record<string, unknown>,
) => string | null;

type _BaseModalField = {
	id: string;
	label: string;
	helpText?: string;
	helpLink?: _ModalHelpLink;
};

export type _ModalTextField = _BaseModalField & {
	kind: "text";
	placeholder?: string;
	defaultValue?: string;
	validate?: _ModalFieldValidator<string>;
};

export type _ModalTextareaField = _BaseModalField & {
	kind: "textarea";
	placeholder?: string;
	defaultValue?: string;
	validate?: _ModalFieldValidator<string>;
};

export type _ModalCheckboxField = _BaseModalField & {
	kind: "checkbox";
	defaultValue?: boolean;
};

export type _ModalSelectOption = {
	value: string;
	label: string;
};

export type _ModalSelectField = _BaseModalField & {
	kind: "select";
	options: _ModalSelectOption[];
	placeholder?: string;
	defaultValue?: string;
	validate?: _ModalFieldValidator<string>;
};

export type _ModalReadonlyField = _BaseModalField & {
	kind: "readonly";
	value: string;
};

export type _ModalField =
	| _ModalTextField
	| _ModalTextareaField
	| _ModalCheckboxField
	| _ModalSelectField
	| _ModalReadonlyField;

export type _ModalContentBlock =
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
			field: _ModalField;
	  };

export type _ModalActionVariant = "primary" | "secondary" | "ghost" | "danger";

export type _ModalAction = {
	id: string;
	label: string;
	variant?: _ModalActionVariant;
	validate?: boolean;
	closesModal?: boolean;
};

export type _ModalInstance = {
	id?: string;
	title?: string;
	content: _ModalContentBlock[];
	actions: _ModalAction[];
	blocking?: boolean;
	initialValues?: Record<string, unknown>;
};

export type _ModalEntry = {
	instance: _ModalInstance;
	visible: boolean;
};

export type _OverlayState = {
	modals: Record<string, _ModalEntry>;
};

export type ModalHelpLink = _ModalHelpLink;
export type ModalFieldValidator<Value = unknown> = (
	value: Value,
	allValues: Record<string, unknown>,
) => string | null;
export type ModalTextField = _ModalTextField;
export type ModalTextareaField = _ModalTextareaField;
export type ModalCheckboxField = _ModalCheckboxField;
export type ModalSelectOption = _ModalSelectOption;
export type ModalSelectField = _ModalSelectField;
export type ModalReadonlyField = _ModalReadonlyField;
export type ModalField = _ModalField;
export type ModalContentBlock = _ModalContentBlock;
export type ModalActionVariant = _ModalActionVariant;
export type ModalAction = _ModalAction;
export type ModalInstance = _ModalInstance;
export type ModalEntry = _ModalEntry;
export type OverlayState = _OverlayState;
