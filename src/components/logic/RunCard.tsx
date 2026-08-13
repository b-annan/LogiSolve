import { Card, ExampleChips, RunButton, SectionLabel } from "./Panel";
import { FormulaInput } from "./FormulaInput";

/**
 * The input card every single-formula module opens with: a caption, one field,
 * the run button, and a row of presets.
 *
 * `layout` follows the design — "inline" puts the button beside the field
 * (Truth Table, Predicate), "corner" puts it up beside the caption and lets the
 * field run full width (CNF, SAT).
 */
export function RunCard({
  label,
  action,
  value,
  onChange,
  onRun,
  placeholder,
  invalid,
  examples,
  onPickExample,
  layout = "inline",
}: {
  label: string;
  action: string;
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  placeholder?: string | undefined;
  invalid?: boolean | undefined;
  examples: string[];
  onPickExample: (v: string) => void;
  layout?: "inline" | "corner" | undefined;
}) {
  const button = (
    <RunButton onClick={onRun} disabled={!value.trim()}>
      {action}
    </RunButton>
  );

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <SectionLabel>{label}</SectionLabel>
        {layout === "corner" && button}
      </div>
      <div className="flex items-start gap-2.5 pt-2">
        <FormulaInput
          value={value}
          onChange={onChange}
          onSubmit={onRun}
          placeholder={placeholder}
          invalid={invalid}
          ariaLabel={label}
        />
        {layout === "inline" && button}
      </div>
      <ExampleChips items={examples} onPick={onPickExample} className="pt-2.5" />
    </Card>
  );
}
