import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Inspect literal UI copy rather than markup, imports, or variable names.
function copyFragments(source: string): string[] {
  const file = ts.createSourceFile("ui.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fragments: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      fragments.push(node.text.replace(/\s+/g, " ").trim());
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return fragments;
}

function positiveClaims(copy: string): string[] {
  return copy.split(/[.!?;]|\bbut\b/i).filter((clause) => {
    const claim = /\b(?:confidence|probabilit(?:y|ies)|recommend(?:ation(?:s)?|s|ed)?|best trade|signal to buy)\b/i.exec(clause);
    if (!claim) return false;
    // A disclaimer must precede the claim in the same clause.
    return !/\b(?:not|never|no|without|unavailable|doesn't|isn't)\b/i.test(clause.slice(0, claim.index));
  });
}

const pages = ["overview", "reviews", "evidence", "onboarding"];
const files = [
  ...pages.map((page) => `src/app/${page}/page.tsx`),
  "src/app/page.tsx",
  "src/components/evidence-workspace.tsx",
  "src/components/review-queue.tsx",
];

describe("research-only UI copy", () => {
  it.each(files)("avoids positive confidence/probability/recommendation claims in %s", (path) => {
    const violations = copyFragments(readFileSync(path, "utf8")).flatMap(positiveClaims);
    expect(violations).toEqual([]);
  });

  it.each([
    "Setup Alignment is confidence.",
    "Setup Alignment measures probability of success.",
    "Our recommendation is to buy.",
    "Not probability, but confidence in the setup.",
  ])("catches positive copy: %s", (copy) => {
    expect(positiveClaims(copy)).not.toEqual([]);
  });

  it.each([
    "Setup Alignment is rule matching—not confidence or a recommendation.",
    "It is not a calibrated probability, investment recommendation, or expected return.",
    "Does not encode calibrated confidence.",
  ])("permits disclaimers: %s", (copy) => {
    expect(positiveClaims(copy)).toEqual([]);
  });
});
