import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCodeExecution } from "@/hooks/useCodeExecution";

/**
 * CodingChallenge Component
 *
 * Features:
 * - Language selector (JS/Go/Java)
 * - Code editor with syntax highlighting
 * - "Run" button for sandbox execution
 * - Test results display (pass/fail per test)
 * - Hidden test count without details
 *
 * TODO: Integrate Monaco Editor or CodeMirror for better UX
 * - npm install @monaco-editor/react
 * - Replace textarea with <Editor />
 */

interface CodeTemplate {
	language: string;
	code: string;
}

interface CodingChallengeProps {
	challengeId: string;
	title: string;
	description: string;
	templates: Record<string, CodeTemplate>;
	onSubmit: (result: {
		testResults: { passed: number; total: number };
	}) => void;
	isSubmitting?: boolean;
}

export function CodingChallenge({
	challengeId,
	title,
	description,
	templates,
	onSubmit,
	isSubmitting = false,
}: CodingChallengeProps) {
	const [selectedLanguage, setSelectedLanguage] = useState<
		"javascript" | "go" | "java"
	>("javascript");
	const [code, setCode] = useState(templates[selectedLanguage]?.code || "");
	const { execute, isExecuting, results } = useCodeExecution();

	const handleLanguageChange = (lang: "javascript" | "go" | "java") => {
		setSelectedLanguage(lang);
		setCode(templates[lang]?.code || "");
	};

	const handleRun = () => {
		execute({
			challengeId,
			code,
			language: selectedLanguage,
		});
	};

	const handleSubmit = () => {
		if (results) {
			const passed = results.results.filter((r) => r.passed).length;
			const total = results.results.length;
			onSubmit({ testResults: { passed, total } });
		}
	};

	const visibleTests = results?.results.filter((r) => !r.isHidden) || [];
	const hiddenTestCount =
		results?.results.filter((r) => r.isHidden).length || 0;
	const passedCount = results?.results.filter((r) => r.passed).length || 0;
	const totalCount = results?.results.length || 0;

	return (
		<div className="space-y-4">
			{/* Challenge Info */}
			<div>
				<h2 className="text-xl font-semibold mb-2">{title}</h2>
				<p className="text-muted-foreground whitespace-pre-wrap">
					{description}
				</p>
			</div>

			{/* Language Selector */}
			<div>
				<label className="text-sm font-medium mb-2 block">Language</label>
				<div className="flex gap-2">
					{(["javascript", "go", "java"] as const).map(
						(lang) =>
							templates[lang] && (
								<button
									key={lang}
									onClick={() => handleLanguageChange(lang)}
									className={`px-4 py-2 rounded-lg border transition-colors ${
										selectedLanguage === lang
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted"
									}`}
								>
									{lang.charAt(0).toUpperCase() + lang.slice(1)}
								</button>
							),
					)}
				</div>
			</div>

			{/* Code Editor (Textarea placeholder) */}
			<div>
				<label htmlFor="code-editor" className="text-sm font-medium mb-2 block">
					Code Editor
				</label>
				<textarea
					id="code-editor"
					value={code}
					onChange={(e) => setCode(e.target.value)}
					className="w-full min-h-[400px] p-4 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
					spellCheck={false}
					disabled={isExecuting || isSubmitting}
				/>
				<p className="text-xs text-muted-foreground mt-1">
					TODO: Replace with Monaco Editor for syntax highlighting and
					autocomplete
				</p>
			</div>

			{/* Run Button */}
			<Button
				onClick={handleRun}
				disabled={isExecuting || isSubmitting}
				variant="outline"
			>
				{isExecuting ? "Running Tests..." : "Run Tests"}
			</Button>

			{/* Test Results */}
			{results && (
				<div className="border rounded-lg p-4 space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold">Test Results</h3>
						<span
							className={`text-sm ${passedCount === totalCount ? "text-green-600" : "text-red-600"}`}
						>
							{passedCount}/{totalCount} passed
						</span>
					</div>

					{/* Visible Test Results */}
					{visibleTests.map((test, index) => (
						<div
							key={test.testCaseId}
							className={`border rounded p-3 ${test.passed ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
						>
							<div className="flex items-center justify-between mb-1">
								<span className="text-sm font-medium">
									Test Case {index + 1}
								</span>
								<span
									className={`text-sm ${test.passed ? "text-green-600" : "text-red-600"}`}
								>
									{test.passed ? "✓ Passed" : "✗ Failed"}
								</span>
							</div>
							{!test.passed && test.error && (
								<p className="text-xs text-red-600 mt-1">{test.error}</p>
							)}
							{!test.passed && test.actualOutput !== undefined && (
								<div className="text-xs mt-1">
									<p>Expected: {JSON.stringify(test.expectedOutput)}</p>
									<p>Got: {JSON.stringify(test.actualOutput)}</p>
								</div>
							)}
						</div>
					))}

					{/* Hidden Tests Count */}
					{hiddenTestCount > 0 && (
						<p className="text-sm text-muted-foreground">
							+ {hiddenTestCount} hidden test{hiddenTestCount > 1 ? "s" : ""}
						</p>
					)}

					{results.error && (
						<div className="border border-red-500 rounded p-3 bg-red-50">
							<p className="text-sm text-red-600">{results.error}</p>
						</div>
					)}
				</div>
			)}

			{/* Submit */}
			<Button
				onClick={handleSubmit}
				disabled={isSubmitting || !results || results.results.length === 0}
			>
				{isSubmitting ? "Submitting..." : "Submit Solution"}
			</Button>
		</div>
	);
}
