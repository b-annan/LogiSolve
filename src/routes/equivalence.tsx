import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/shell/ModulePage";
import { MODULES } from "@/components/shell/modules";
import { EquivalenceModule } from "@/components/logic/EquivalenceModule";

const module = MODULES[1]!;
const description =
  "Check whether two propositional formulas are logically equivalent by comparing their truth values across every assignment.";

export const Route = createFileRoute("/equivalence")({
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
      <EquivalenceModule />
    </ModulePage>
  );
}
