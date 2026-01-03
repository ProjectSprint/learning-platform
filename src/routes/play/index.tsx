import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/play/")({
	component: PlayPage,
});

function PlayPage() {
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const handleStartSession = async () => {
		setIsCreating(true);
		setError(null);

		try {
			const response = await fetch("/api/session/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to create session");
			}

			const data = await response.json();

			// Redirect to first question
			router.navigate({
				to: "/play/$questionId",
				params: { questionId: "next" },
				search: { sessionId: data.sessionId },
			});
		} catch (err) {
			console.error("Error creating session:", err);
			setError("Failed to create session. Please try again.");
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
			<div className="max-w-2xl w-full">
				<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 text-center">
					<PlayCircle className="w-20 h-20 text-cyan-400 mx-auto mb-6" />
					<h1 className="text-4xl font-bold text-white mb-4">
						Ready to Start Learning?
					</h1>
					<p className="text-lg text-gray-400 mb-8">
						Start a new session and earn XP by answering questions. Each session
						tracks your progress and helps you level up your skills!
					</p>

					<div className="space-y-4">
						<Button
							size="lg"
							className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={handleStartSession}
							disabled={isCreating}
						>
							{isCreating ? "Creating Session..." : "Start New Session"}
						</Button>

						{error && (
							<div className="text-sm text-red-400 bg-red-900/20 border border-red-700 rounded p-3">
								{error}
							</div>
						)}
					</div>

					<div className="mt-8 pt-8 border-t border-slate-700">
						<Link to="/">
							<Button variant="outline" className="text-gray-300">
								Back to Home
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
