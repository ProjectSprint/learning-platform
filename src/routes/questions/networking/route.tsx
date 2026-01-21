import { Box } from "@chakra-ui/react";
import {
	Outlet,
	createFileRoute,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useCallback } from "react";

import { ProgressHeader } from "@/components/module";
import {
	getQuestionIndexByPath,
	useNetworkingProgress,
} from "./-utils/module-progress";

const NetworkingModuleLayout = () => {
	const navigate = useNavigate();
	const routerState = useRouterState();
	const { completedCount, totalQuestions } = useNetworkingProgress();

	const handleExit = useCallback(() => {
		void navigate({ to: "/" });
	}, [navigate]);

	const questionIndex = getQuestionIndexByPath(routerState.location.pathname);
	const showHeader = questionIndex >= 0;

	return (
		<Box display="flex" flexDirection="column" height="100vh" bg="gray.950">
			{showHeader && (
				<ProgressHeader
					progress={{
						currentIndex: completedCount,
						totalQuestions,
					}}
					onExit={handleExit}
				/>
			)}
			<Box flex="1" overflow="auto">
				<Outlet />
			</Box>
		</Box>
	);
};

export const Route = createFileRoute("/questions/networking")({
	component: NetworkingModuleLayout,
});
