import { describe, expect, it } from "bun:test";
import { normalizeGeneratedTypebot } from "./normalizeGeneratedTypebot";
import type { RawGeneratedTypebot } from "./rawGeneratedTypebotSchema";

const geminiQuirkyTypebot: RawGeneratedTypebot = {
  name: "Lead capture",
  groups: [
    {
      title: "Welcome",
      blocks: [
        {
          type: "text",
          content: ["Hello!", "How can we help?"],
        },
        {
          type: "choice input",
          items: ["Sales", "Support"],
        },
      ],
    },
    {
      title: "Email",
      blocks: [
        {
          type: "text",
          content: {
            richText: [{ type: "p", children: [{ text: "Your email?" }] }],
          },
        },
        {
          type: "email input",
          options: [{ labels: { placeholder: "you@company.com" } }],
        },
      ],
    },
  ],
  edges: [
    {
      from: { kind: "start" },
      to: { groupTitle: "Welcome" },
    },
    {
      from: {
        kind: "block",
        groupTitle: "Welcome",
        blockIndex: 1,
        choice: "Sales",
      },
      to: { groupTitle: "Email" },
    },
  ],
};

describe("normalizeGeneratedTypebot", () => {
  it("coerces Gemini array content and options before strict validation", () => {
    const normalized = normalizeGeneratedTypebot(geminiQuirkyTypebot);

    expect(normalized.name).toBe("Lead capture");
    expect(normalized.groups[0]?.blocks[0]).toEqual({
      type: "text",
      content: {
        richText: [
          { type: "p", children: [{ text: "Hello!" }] },
          { type: "p", children: [{ text: "How can we help?" }] },
        ],
      },
    });
    expect(normalized.groups[1]?.blocks[1]).toEqual({
      type: "email input",
      options: {
        labels: { placeholder: "you@company.com" },
      },
    });
    expect(normalized.edges[1]?.from).toEqual({
      kind: "block",
      groupTitle: "Welcome",
      blockIndex: 1,
      itemIndex: 0,
    });
  });
});
