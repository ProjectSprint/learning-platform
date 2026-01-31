import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

type BoardRegistryEntry = {
	element: HTMLDivElement;
	observer?: ResizeObserver;
};

type BoardRegistryContextValue = {
	containerRef: React.RefObject<HTMLDivElement | null>;
	layoutVersion: number;
	registerBoard: (puzzleId: string, element: HTMLDivElement | null) => void;
	getBoardElement: (puzzleId: string) => HTMLDivElement | null;
};

const BoardRegistryContext = createContext<BoardRegistryContextValue | null>(
	null,
);

export const BoardRegistryProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const registryRef = useRef<Map<string, BoardRegistryEntry>>(new Map());
	const [layoutVersion, setLayoutVersion] = useState(0);

	const bumpLayout = useCallback(() => {
		setLayoutVersion((prev) => prev + 1);
	}, []);

	const registerBoard = useCallback(
		(puzzleId: string, element: HTMLDivElement | null) => {
			const registry = registryRef.current;
			const existing = registry.get(puzzleId);

			if (!element) {
				if (existing?.observer) {
					existing.observer.disconnect();
				}
				registry.delete(puzzleId);
				bumpLayout();
				return;
			}

			if (existing?.element === element) {
				return;
			}

			if (existing?.observer) {
				existing.observer.disconnect();
			}

			const entry: BoardRegistryEntry = { element };
			if (typeof ResizeObserver !== "undefined") {
				entry.observer = new ResizeObserver(() => {
					bumpLayout();
				});
				entry.observer.observe(element);
			}

			registry.set(puzzleId, entry);
			bumpLayout();
		},
		[bumpLayout],
	);

	const getBoardElement = useCallback((puzzleId: string) => {
		return registryRef.current.get(puzzleId)?.element ?? null;
	}, []);

	useEffect(() => {
		const handleLayout = () => bumpLayout();
		window.addEventListener("resize", handleLayout);
		window.addEventListener("scroll", handleLayout, true);
		return () => {
			window.removeEventListener("resize", handleLayout);
			window.removeEventListener("scroll", handleLayout, true);
		};
	}, [bumpLayout]);

	return (
		<BoardRegistryContext.Provider
			value={{
				containerRef,
				layoutVersion,
				registerBoard,
				getBoardElement,
			}}
		>
			{children}
		</BoardRegistryContext.Provider>
	);
};

export const useBoardRegistry = () => {
	const context = useContext(BoardRegistryContext);
	if (!context) {
		return {
			containerRef: { current: null } as React.RefObject<HTMLDivElement | null>,
			layoutVersion: 0,
			registerBoard: () => {},
			getBoardElement: () => null,
		};
	}
	return context;
};
