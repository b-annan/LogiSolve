import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/shell/ModulePage";
import { MODULES } from "@/components/shell/modules";
import { PredicateModule } from "@/components/logic/PredicateModule";

const module = MODULES[5]!;
const description =
  "Translate controlled English into first-order predicate logic, with the phrase-by-phrase symbol mapping.";

export const Route = createFileRoute("/predicate")({
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
      <PredicateModule />
    </ModulePage>
  );
}
