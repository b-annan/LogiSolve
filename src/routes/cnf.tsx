import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/shell/ModulePage";
import { MODULES } from "@/components/shell/modules";
import { CNFModule } from "@/components/logic/CNFModule";

const module = MODULES[2]!;
const description =
  "Convert any propositional formula to conjunctive normal form, one explained rewriting step at a time.";

export const Route = createFileRoute("/cnf")({
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
      <CNFModule />
    </ModulePage>
  );
}
