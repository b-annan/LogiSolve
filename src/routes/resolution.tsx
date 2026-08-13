import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/shell/ModulePage";
import { MODULES } from "@/components/shell/modules";
import { ResolutionModule } from "@/components/logic/ResolutionModule";

const module = MODULES[3]!;
const description =
  "Prove an argument valid by resolution refutation, with the full clause derivation drawn as a proof tree.";

export const Route = createFileRoute("/resolution")({
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
      <ResolutionModule />
    </ModulePage>
  );
}
