import { RankBadge } from "@/components/game/RankBadge";
import { Button } from "@/components/ui/button";
import { RANK_THRESHOLDS, getRankInfo } from "@/lib/rank";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Code, MessageSquare, Puzzle, Radio, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const ranks = ["newcomer", "junior", "medior", "master", "shaman"] as const;

	const questionTypes = [
		{
			icon: <Puzzle className="w-10 h-10 text-cyan-400" />,
			title: "Word Puzzles",
			description:
				"Connect actors with the right sequence of words. Order matters!",
		},
		{
			icon: <Code className="w-10 h-10 text-cyan-400" />,
			title: "Coding Challenges",
			description:
				"Fill in code placeholders and pass test cases. Multiple languages supported.",
		},
		{
			icon: <Radio className="w-10 h-10 text-cyan-400" />,
			title: "Multiple Choice",
			description:
				"Test your knowledge with carefully crafted questions and visual aids.",
		},
		{
			icon: <MessageSquare className="w-10 h-10 text-cyan-400" />,
			title: "Open Ended",
			description:
				"Demonstrate deep understanding with detailed written responses.",
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
			{/* Hero Section */}
			<section className="relative py-20 px-6 text-center overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
				<div className="relative max-w-5xl mx-auto">
					<div className="flex items-center justify-center gap-4 mb-6">
						<Trophy className="w-16 h-16 text-yellow-400" />
						<h1 className="text-6xl md:text-7xl font-black text-white">
							<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
								Lingo
							</span>
						</h1>
					</div>
					<p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
						Level up your software development skills
					</p>
					<p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
						An RPG-style learning platform where developers earn XP, climb ranks,
						and master new concepts through interactive puzzles and coding
						challenges.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link to="/play">
							<Button
								size="lg"
								className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-500/50"
							>
								Start Learning
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Rank System */}
			<section className="py-16 px-6 max-w-7xl mx-auto">
				<h2 className="text-3xl font-bold text-white text-center mb-12">
					Climb the Ranks
				</h2>
				<div className="flex flex-wrap justify-center gap-6">
					{ranks.map((rank) => {
						const rankInfo = getRankInfo(rank);
						return (
							<div
								key={rank}
								className="flex flex-col items-center gap-3 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl hover:border-cyan-500/50 transition-all"
							>
								<span className="text-5xl">{rankInfo.icon}</span>
								<RankBadge rank={rank} size="lg" showIcon={false} />
								<span className="text-sm text-gray-400">
									{RANK_THRESHOLDS[rank].toLocaleString()} XP
								</span>
							</div>
						);
					})}
				</div>
			</section>

			{/* Question Types */}
			<section className="py-16 px-6 max-w-7xl mx-auto">
				<h2 className="text-3xl font-bold text-white text-center mb-12">
					Master Multiple Skills
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{questionTypes.map((type, index) => (
						<div
							key={index}
							className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
						>
							<div className="mb-4">{type.icon}</div>
							<h3 className="text-xl font-semibold text-white mb-3">
								{type.title}
							</h3>
							<p className="text-gray-400 leading-relaxed">{type.description}</p>
						</div>
					))}
				</div>
			</section>

			{/* Features */}
			<section className="py-16 px-6 max-w-5xl mx-auto text-center">
				<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
					<h3 className="text-2xl font-bold text-white mb-4">
						How It Works
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
						<div>
							<div className="text-cyan-400 text-4xl font-bold mb-2">1</div>
							<h4 className="text-white font-semibold mb-2">
								Answer Questions
							</h4>
							<p className="text-gray-400 text-sm">
								Tackle challenges across multiple question types and earn XP
							</p>
						</div>
						<div>
							<div className="text-cyan-400 text-4xl font-bold mb-2">2</div>
							<h4 className="text-white font-semibold mb-2">Earn XP</h4>
							<p className="text-gray-400 text-sm">
								Green answers give full XP, yellow gives 50%, wrong gives 0%
							</p>
						</div>
						<div>
							<div className="text-cyan-400 text-4xl font-bold mb-2">3</div>
							<h4 className="text-white font-semibold mb-2">Rank Up</h4>
							<p className="text-gray-400 text-sm">
								Progress from Newcomer to Shaman as you accumulate XP
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
