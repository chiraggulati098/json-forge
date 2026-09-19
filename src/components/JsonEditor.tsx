import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import PaneSearch from "./PaneSearch";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  searchOpen: boolean;
  onSearchClose: () => void;
}

const JsonEditor = ({ value, onChange, error, searchOpen, onSearchClose }: JsonEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);

  const matches = useMemo(() => {
    if (!query) return [] as number[];
    const hay = value.toLowerCase();
    const needle = query.toLowerCase();
    const out: number[] = [];
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) out.push(i);
    return out;
  }, [value, query]);

  const safeCurrent = matches.length ? Math.min(current, matches.length - 1) : 0;

  const selectMatch = useCallback(
    (idx: number, focus: boolean) => {
      const ta = textareaRef.current;
      if (!ta || !matches.length) return;
      const start = matches[idx];
      const prevFocus = document.activeElement;
      ta.focus();
      ta.setSelectionRange(start, start + query.length);
      // scroll the match's line into view
      const line = value.slice(0, start).split("\n").length - 1;
      const lineHeight = 26.4; // 1.65rem
      const top = line * lineHeight;
      if (top < ta.scrollTop || top > ta.scrollTop + ta.clientHeight - lineHeight * 2) {
        ta.scrollTop = Math.max(0, top - ta.clientHeight / 2);
      }
      if (!focus && prevFocus instanceof HTMLElement) prevFocus.focus({ preventScroll: true });
    },
    [matches, query, value]
  );

  const goTo = useCallback(
    (idx: number) => {
      if (!matches.length) return;
      const n = (idx + matches.length) % matches.length;
      setCurrent(n);
      selectMatch(n, false);
    },
    [matches, selectMatch]
  );

  useEffect(() => {
    setCurrent(0);
    if (query && matches.length) selectMatch(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const backdropRef = useRef<HTMLDivElement>(null);

  const backdrop = useMemo(() => {
    if (!searchOpen || !query || !matches.length) return null;
    const nodes: React.ReactNode[] = [];
    let last = 0;
    matches.forEach((start, i) => {
      nodes.push(value.slice(last, start));
      nodes.push(
        <mark
          key={start}
          className={`rounded-sm text-transparent ${
            i === safeCurrent ? "bg-orange-400/80 ring-2 ring-orange-400" : "bg-yellow-300/40"
          }`}
        >
          {value.slice(start, start + query.length)}
        </mark>
      );
      last = start + query.length;
    });
    nodes.push(value.slice(last), "\n");
    return nodes;
  }, [searchOpen, query, matches, value, safeCurrent]);

  const lines = value.split("\n");
  const lineCount = lines.length;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const textarea = textareaRef.current;
          if (!textarea) return;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newValue = value.substring(0, start) + "  " + value.substring(end);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          });
        }
      },
      [value, onChange]
    );
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
    {searchOpen && (
      <PaneSearch
        query={query}
        onQueryChange={setQuery}
        total={matches.length}
        current={safeCurrent}
        onNext={() => goTo(safeCurrent + 1)}
        onPrev={() => goTo(safeCurrent - 1)}
        onClose={() => {
          onSearchClose();
          textareaRef.current?.focus();
        }}
      />
    )}
    <div className="relative flex flex-1 min-h-0 overflow-hidden bg-surface">
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 overflow-hidden select-none py-3 pl-3 pr-2 text-right font-mono text-xs leading-[1.65rem] text-muted-foreground/50"
        style={{ width: "3.5rem" }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1}>{i + 1}</div>
        ))}
      </div>

      <div className="relative flex-1 min-w-0">
      <div
        ref={backdropRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-y-scroll whitespace-pre-wrap break-words py-3 pr-4 font-mono text-sm leading-[1.65rem] text-transparent"
      >
        {backdrop}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className={`absolute inset-0 h-full w-full overflow-y-scroll resize-none bg-transparent py-3 pr-4 font-mono text-sm leading-[1.65rem] text-foreground outline-none placeholder:text-muted-foreground/40 ${
          error ? "ring-1 ring-inset ring-destructive/30" : ""
        }`}
        placeholder="Paste or type JSON here..."
      />
      </div>

      {error && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-1.5 bg-destructive/95 border-t border-destructive/80 z-50">
          <p className="text-xs font-mono text-white truncate">{error}</p>
        </div>
      )}
    </div>
    </div>
  );
};

export default JsonEditor;
