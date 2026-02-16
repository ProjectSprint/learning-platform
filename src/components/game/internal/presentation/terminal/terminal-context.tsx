import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type {
	TerminalEntry,
	TerminalEntryType,
	TerminalState,
} from "@/components/game/types/core";
import {
	MAX_HISTORY_ENTRIES,
	sanitizeTerminalInput,
	sanitizeTerminalOutput,
} from "../../domain/validation/sanitize";

type TerminalOutputType = Exclude<TerminalEntryType, "input" | "prompt">;

type TerminalContextValue = {
	terminal: TerminalState;
	openTerminal: () => void;
	closeTerminal: () => void;
	setPrompt: (prompt: string) => void;
	addEntry: (entry: TerminalEntry) => void;
	addInput: (input: string) => TerminalEntry | null;
	addOutput: (
		content: string,
		type: TerminalOutputType,
	) => TerminalEntry | null;
	clearHistory: () => void;
};

const TerminalContext = createContext<TerminalContextValue | null>(null);

const createEntry = (
	type: TerminalEntryType,
	content: string,
	timestamp = Date.now(),
): TerminalEntry => ({
	id: `entry-${timestamp}`,
	type,
	content,
	timestamp,
});

const addHistoryEntry = (
	history: TerminalEntry[],
	entry: TerminalEntry,
): TerminalEntry[] => {
	const existingIds = new Set(history.map((item) => item.id));
	let nextEntry = entry;
	if (existingIds.has(entry.id)) {
		let counter = 1;
		let nextId = `${entry.id}-${counter}`;
		while (existingIds.has(nextId)) {
			counter += 1;
			nextId = `${entry.id}-${counter}`;
		}
		nextEntry = { ...entry, id: nextId };
	}
	const nextHistory = [...history, nextEntry];
	if (nextHistory.length > MAX_HISTORY_ENTRIES) {
		return nextHistory.slice(-MAX_HISTORY_ENTRIES);
	}
	return nextHistory;
};

export const TerminalProvider = ({ children }: { children: ReactNode }) => {
	const [terminal, setTerminal] = useState<TerminalState>({
		visible: false,
		prompt: "",
		history: [],
	});

	const openTerminal = useCallback(() => {
		setTerminal((prev) => (prev.visible ? prev : { ...prev, visible: true }));
	}, []);

	const closeTerminal = useCallback(() => {
		setTerminal((prev) => (prev.visible ? { ...prev, visible: false } : prev));
	}, []);

	const setPrompt = useCallback((prompt: string) => {
		setTerminal((prev) => ({ ...prev, prompt }));
	}, []);

	const addEntry = useCallback((entry: TerminalEntry) => {
		setTerminal((prev) => ({
			...prev,
			history: addHistoryEntry(prev.history, entry),
		}));
	}, []);

	const addInput = useCallback((input: string) => {
		const sanitized = sanitizeTerminalInput(input);
		if (!sanitized) return null;
		const entry = createEntry("input", sanitized);
		setTerminal((prev) => ({
			...prev,
			history: addHistoryEntry(prev.history, entry),
		}));
		return entry;
	}, []);

	const addOutput = useCallback((content: string, type: TerminalOutputType) => {
		const sanitized = sanitizeTerminalOutput(content);
		if (!sanitized) return null;
		const entry = createEntry(type, sanitized);
		setTerminal((prev) => ({
			...prev,
			history: addHistoryEntry(prev.history, entry),
		}));
		return entry;
	}, []);

	const clearHistory = useCallback(() => {
		setTerminal((prev) => ({ ...prev, history: [] }));
	}, []);

	const value = useMemo(
		() => ({
			terminal,
			openTerminal,
			closeTerminal,
			setPrompt,
			addEntry,
			addInput,
			addOutput,
			clearHistory,
		}),
		[
			addEntry,
			addInput,
			addOutput,
			clearHistory,
			closeTerminal,
			openTerminal,
			setPrompt,
			terminal,
		],
	);

	return (
		<TerminalContext.Provider value={value}>
			{children}
		</TerminalContext.Provider>
	);
};

export const useTerminalStore = () => {
	const ctx = useContext(TerminalContext);
	if (!ctx) {
		throw new Error("useTerminalStore must be used within TerminalProvider");
	}
	return ctx;
};
