import {
	Box,
	Button,
	Checkbox,
	Flex,
	Input,
	Text,
	Textarea,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";

import { useGameDispatch } from "../game-provider";
import { HelpLink } from "../help";
import type {
	ModalAction,
	ModalContentBlock,
	ModalField,
	ModalInstance,
} from "./types";

type ModalProps = {
	modal: ModalInstance;
	onClose: () => void;
};

export const Modal = ({ modal, onClose }: ModalProps) => {
	const dispatch = useGameDispatch();

	const initialValues = useMemo(() => {
		const values: Record<string, unknown> = { ...(modal.initialValues ?? {}) };

		for (const block of modal.content) {
			if (block.kind === "field") {
				const field = block.field;
				if (values[field.id] !== undefined) {
					continue;
				}

				if (field.kind === "checkbox") {
					values[field.id] = field.defaultValue ?? false;
				} else if (field.kind === "readonly") {
					values[field.id] = field.value;
				} else {
					values[field.id] = field.defaultValue ?? "";
				}
			}
		}
		return values;
	}, [modal.content, modal.initialValues]);

	const [values, setValues] = useState<Record<string, unknown>>(initialValues);
	const [errors, setErrors] = useState<Record<string, string | null>>({});

	const setFieldValue = (fieldId: string, value: unknown) => {
		setValues((prev) => ({ ...prev, [fieldId]: value }));
		setErrors((prev) => ({ ...prev, [fieldId]: null }));
	};

	const runValidation = () => {
		const nextErrors: Record<string, string | null> = {};

		for (const block of modal.content) {
			if (block.kind !== "field") {
				continue;
			}

			const field = block.field;
			const value = values[field.id];

			if (field.kind === "text" || field.kind === "textarea") {
				const v = (value ?? "") as string;
				if (field.validate) {
					const error = field.validate(v, values);
					if (error) {
						nextErrors[field.id] = error;
					}
				}
			} else if (field.kind === "select") {
				const v = (value ?? "") as string;
				if (field.validate) {
					const error = field.validate(v, values);
					if (error) {
						nextErrors[field.id] = error;
					}
				}
			}
		}

		setErrors(nextErrors);
		return Object.values(nextErrors).some(Boolean);
	};

	const handleActionClick = async (action: ModalAction) => {
		const shouldValidate = action.validate ?? true;

		if (shouldValidate) {
			const hasErrors = runValidation();
			if (hasErrors) {
				return;
			}
		}

		if (action.onClick) {
			await action.onClick({
				values,
				close: onClose,
				dispatch,
			});
		}

		if (action.closesModal ?? true) {
			onClose();
		}
	};

	const renderField = (field: ModalField) => {
		switch (field.kind) {
			case "text": {
				const value = (values[field.id] ?? "") as string;
				const error = errors[field.id] ?? null;

				return (
					<Box key={field.id}>
						<Text fontSize="sm" mb={2}>
							{field.label}
						</Text>
						<Input
							value={value}
							onChange={(e) => setFieldValue(field.id, e.target.value)}
							placeholder={field.placeholder}
							size="sm"
							bg="gray.800"
							borderColor="gray.700"
							fontFamily="mono"
						/>
						{field.helpLink && (
							<Box mt={1}>
								<HelpLink
									text={field.helpLink.label}
									href={field.helpLink.href}
								/>
							</Box>
						)}
						{field.helpText && !error && (
							<Text fontSize="xs" color="gray.400" mt={1}>
								{field.helpText}
							</Text>
						)}
						{error && (
							<Text fontSize="xs" color="red.300" mt={1}>
								{error}
							</Text>
						)}
					</Box>
				);
			}
			case "textarea": {
				const value = (values[field.id] ?? "") as string;
				const error = errors[field.id] ?? null;

				return (
					<Box key={field.id}>
						<Text fontSize="sm" mb={2}>
							{field.label}
						</Text>
						<Textarea
							value={value}
							onChange={(e) => setFieldValue(field.id, e.target.value)}
							placeholder={field.placeholder}
							size="sm"
							bg="gray.800"
							borderColor="gray.700"
							fontFamily="mono"
							rows={3}
						/>
						{field.helpLink && (
							<Box mt={1}>
								<HelpLink
									text={field.helpLink.label}
									href={field.helpLink.href}
								/>
							</Box>
						)}
						{field.helpText && !error && (
							<Text fontSize="xs" color="gray.400" mt={1}>
								{field.helpText}
							</Text>
						)}
						{error && (
							<Text fontSize="xs" color="red.300" mt={1}>
								{error}
							</Text>
						)}
					</Box>
				);
			}
			case "checkbox": {
				const checked = !!values[field.id];
				return (
					<Box key={field.id}>
						<Checkbox.Root
							checked={checked}
							onCheckedChange={(details) =>
								setFieldValue(field.id, details.checked === true)
							}
							colorPalette="green"
							size="sm"
						>
							<Checkbox.HiddenInput />
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							<Checkbox.Label>{field.label}</Checkbox.Label>
						</Checkbox.Root>
						{field.helpLink && (
							<Box mt={1}>
								<HelpLink
									text={field.helpLink.label}
									href={field.helpLink.href}
								/>
							</Box>
						)}
					</Box>
				);
			}
			case "readonly": {
				return (
					<Box key={field.id}>
						{field.label && (
							<Text fontSize="sm" mb={1} color="gray.400">
								{field.label}
							</Text>
						)}
						<Text fontSize="sm" fontFamily="mono">
							{field.value}
						</Text>
					</Box>
				);
			}
			case "select": {
				// TODO: Implement select field when needed
				return null;
			}
		}
	};

	const renderContentBlock = (block: ModalContentBlock, index: number) => {
		switch (block.kind) {
			case "text":
				return (
					<Text
						key={block.id ?? `text-${index}`}
						fontSize="sm"
						color="gray.300"
					>
						{block.text}
					</Text>
				);
			case "link":
				return (
					<Box key={block.id ?? `link-${index}`}>
						<HelpLink text={block.text} href={block.href} />
					</Box>
				);
			case "field":
				return renderField(block.field);
		}
	};

	const getButtonVariant = (variant?: string) => {
		switch (variant) {
			case "ghost":
			case "secondary":
				return "ghost";
			case "danger":
				return "outline";
			default:
				return "solid";
		}
	};

	const getButtonColorPalette = (variant?: string) => {
		switch (variant) {
			case "danger":
				return "red";
			default:
				return "green";
		}
	};

	return (
		<Box display="flex" flexDirection="column" gap={4}>
			{modal.title && (
				<Text fontSize="lg" fontWeight="bold">
					{modal.title}
				</Text>
			)}

			{modal.content.map((block, index) => renderContentBlock(block, index))}

			<Flex justify="flex-end" gap={2} mt={2}>
				{modal.actions.map((action) => (
					<Button
						key={action.id}
						size="sm"
						variant={getButtonVariant(action.variant)}
						colorPalette={getButtonColorPalette(action.variant)}
						onClick={() => void handleActionClick(action)}
					>
						{action.label}
					</Button>
				))}
			</Flex>
		</Box>
	);
};
