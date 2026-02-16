import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { HintState } from "../../core/types";

type HintContextValue = {
	hint: HintState;
	showHint: (content: string) => void;
	hideHint: () => void;
	replaceHint: (content: string) => void;
};

const HintContext = createContext<HintContextValue | null>(null);

export const HintProvider = ({ children }: { children: ReactNode }) => {
	const [hint, setHint] = useState<HintState>({
		visible: false,
		content: null,
	});

	const showHint = useCallback((content: string) => {
		setHint({ visible: true, content });
	}, []);

	const hideHint = useCallback(() => {
		setHint((prev) => ({ ...prev, visible: false }));
	}, []);

	const replaceHint = useCallback((content: string) => {
		setHint((prev) => ({ ...prev, content }));
	}, []);

	const value = useMemo(
		() => ({ hint, showHint, hideHint, replaceHint }),
		[hint, showHint, hideHint, replaceHint],
	);

	return <HintContext.Provider value={value}>{children}</HintContext.Provider>;
};

export const useHintStore = () => {
	const ctx = useContext(HintContext);
	if (!ctx) {
		throw new Error("useHintStore must be used within HintProvider");
	}
	return ctx;
};
