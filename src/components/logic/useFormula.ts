import { useMemo, useState } from "react";
import { parse, LogicError, type Node } from "@/lib/logic/parser";

export function useFormula(initial: string) {
  const [text, setText] = useState(initial);
  const { ast, error } = useMemo(() => {
    if (!text.trim()) return { ast: null as Node | null, error: null as LogicError | null };
    try {
      return { ast: parse(text), error: null as LogicError | null };
    } catch (e) {
      return {
        ast: null,
        error: e instanceof LogicError ? e : new LogicError(String((e as Error).message)),
      };
    }
  }, [text]);
  return { text, setText, ast, error };
}