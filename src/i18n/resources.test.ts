import { resources } from "@/i18n/resources";
import { describe, expect, it } from "vitest";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

describe("translation resources", () => {
  const languages = Object.keys(resources) as (keyof typeof resources)[];
  const expected = leafPaths(resources.en.common).sort();

  it.each(languages)("%s defines exactly the same keys as en", (language) => {
    expect(leafPaths(resources[language].common).sort()).toEqual(expected);
  });

  it("has no empty translations", () => {
    for (const language of languages) {
      const values = Object.values(resources[language].common).flatMap((group) =>
        Object.values(group as Record<string, string>),
      );
      expect(values.every((v) => v.trim().length > 0)).toBe(true);
    }
  });
});
