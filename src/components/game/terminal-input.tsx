import { Input, type InputProps } from "@chakra-ui/react";
import type { KeyboardEvent, RefObject } from "react";

export type TerminalInputProps = {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	placeholder?: string;
	disabled?: boolean;
	inputRef?: RefObject<HTMLInputElement>;
	inputProps?: InputProps;
};

export const TerminalInput = ({
	value,
	onChange,
	onKeyDown,
	placeholder,
	disabled,
	inputRef,
	inputProps,
}: TerminalInputProps) => {
	return (
		<Input
			ref={inputRef}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={onKeyDown}
			placeholder={placeholder}
			size="sm"
			fontFamily="mono"
			bg="gray.800"
			borderColor="gray.700"
			_placeholder={{ color: "gray.500" }}
			disabled={disabled}
			aria-label="Terminal input"
			{...inputProps}
		/>
	);
};
