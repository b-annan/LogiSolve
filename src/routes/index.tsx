import { createFileRoute } from "@tanstack/react-router";
import { Toolkit } from "@/components/logic/Toolkit";

const title = "Logic Verification & Automated Reasoning Toolkit";
const description =
  "Truth tables, equivalence checking, CNF conversion, resolution proving, DPLL SAT solving and predicate logic translation — all in the browser.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Toolkit />;
}
