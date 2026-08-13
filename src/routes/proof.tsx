import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/shell/ModulePage";
import { MODULES } from "@/components/shell/modules";
import { ProofModule } from "@/components/logic/ProofModule";

const module = MODULES[6]!;
const description =
  "Build a proof from premises to a goal by direct proof, contradiction, contrapositive or natural deduction.";

export const Route = createFileRoute("/proof")({
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
      <ProofModule />
    </ModulePage>
  );
}
