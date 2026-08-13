import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/shell/ModulePage";
import { MODULES } from "@/components/shell/modules";
import { SatModule } from "@/components/logic/SatModule";

const module = MODULES[4]!;
const description =
  "Decide satisfiability with the DPLL algorithm, including unit propagation, pure-literal elimination and the search log.";

export const Route = createFileRoute("/sat")({
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
      <SatModule />
    </ModulePage>
  );
}
