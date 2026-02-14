import { describe, expect, it } from "vitest";
import { readApi } from "../read";
import { transformApi } from "../transformers";

const hasAllowedPrefix = (value: string, prefixes: string[]) => {
	return prefixes.some((prefix) => value.startsWith(prefix));
};

describe("domain boundary contracts", () => {
	it("read API surface keeps is/get/select naming", () => {
		const keys = Object.keys(readApi);
		for (const key of keys) {
			expect(
				hasAllowedPrefix(key, ["is", "get", "select"]),
				`read API method "${key}" must start with is/get/select`,
			).toBe(true);
		}
	});

	it("transform API surface keeps apply/try naming for transitions", () => {
		const keys = Object.keys(transformApi).filter(
			(key) => key !== "getNextActionId" && key !== "applyAppendEvents",
		);
		for (const key of keys) {
			expect(
				hasAllowedPrefix(key, ["apply", "try"]),
				`transform API method "${key}" must start with apply/try`,
			).toBe(true);
		}
	});
});
