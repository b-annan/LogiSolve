import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/shell/ModulePage";
import { MODULES } from "@/components/shell/modules";
import { TruthTableModule } from "@/components/logic/TruthTableModule";

const module = MODULES[0]!;
const description =
  "Generate a full truth table for any propositional formula, with a column per sub-formula and a tautology / contradiction / contingency verdict.";

export const Route = createFileRoute("/truth-table")({
  head: () => ({
    meta: [
      { title: `${module.title} · ILVAR` },
      { name: "description", content: description },
      { property: "og:title", content: `${module.title} · ILVAR` },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePage module={module}>
      <TruthTableModule />
    </ModulePage>
  );
}
