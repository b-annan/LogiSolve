import { useCallback, useMemo, useState } from "react";
import { parse, LogicError, type Node } from "@/lib/logic/parser";

function parseOrError(text: string): { ast: Node | null; error: LogicError | null } {
  if (!text.trim()) return { ast: null, error: null };
  try {
    return { ast: parse(text), error: null };
  } catch (e) {
    return {
      ast: null,
      error: e instanceof LogicError ? e : new LogicError(String((e as Error).message)),
    };
  }
}

/**
 * Holds a formula the user is typing plus the last one they ran.
 *
 * The modules only compute from `ast` — the committed formula — so results stay
 * on screen while the next formula is being typed, and the run button is what
 * moves them forward. `draftError` surfaces a parse error as soon as it appears.
 */
export function useFormula(initial = "") {
  const [draft, setDraft] = useState(initial);
  const [committed, setCommitted] = useState(initial);

  const { error: draftError } = useMemo(() => parseOrError(draft), [draft]);
  const { ast, error } = useMemo(() => parseOrError(committed), [committed]);

  const run = useCallback(() => setCommitted(draft), [draft]);
  /** Fill the field and run it in one step — used by example chips. */
  const runWith = useCallback((value: string) => {
    setDraft(value);
    setCommitted(value);
  }, []);

  return {
    draft,
    setDraft,
    committed,
    ast,
    error,
    draftError,
    run,
    runWith,
    /** True once something has been run and it parsed. */
    hasResult: ast !== null,
  };
}
