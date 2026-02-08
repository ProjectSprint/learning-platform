import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { Arrow } from "@/components/game/game-provider";

type ArrowContextValue = {
	arrows: Arrow[];
	setArrows: (next: Arrow[]) => void;
	clearArrows: () => void;
};

const ArrowContext = createContext<ArrowContextValue | null>(null);

export const ArrowProvider = ({ children }: { children: React.ReactNode }) => {
	const [arrows, setArrowsState] = useState<Arrow[]>([]);

	const setArrows = useCallback((next: Arrow[]) => {
		setArrowsState(next);
	}, []);

	const clearArrows = useCallback(() => {
		setArrowsState([]);
	}, []);

	const value = useMemo(
		() => ({ arrows, setArrows, clearArrows }),
		[arrows, clearArrows, setArrows],
	);

	return (
		<ArrowContext.Provider value={value}>{children}</ArrowContext.Provider>
	);
};

export const useBoardArrows = () => {
	const context = useContext(ArrowContext);
	if (!context) {
		throw new Error("useBoardArrows must be used within ArrowProvider");
	}
	return context;
};
