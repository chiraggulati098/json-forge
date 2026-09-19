import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface PaneSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  total: number;
  current: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const PaneSearch = ({ query, onQueryChange, total, current, onNext, onPrev, onClose }: PaneSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="absolute top-2 right-4 z-40 flex items-center gap-1 w-72 max-w-[calc(100%-2rem)] pl-3 pr-1 h-8 rounded-md bg-popover border border-border shadow-lg font-sans text-xs">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="Search..."
        spellCheck={false}
        className="flex-1 min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      <span className="text-muted-foreground tabular-nums whitespace-nowrap">
        {query ? (total ? `${current + 1} / ${total}` : "No results") : ""}
      </span>
      <button onClick={onPrev} disabled={!total} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Previous (Shift+Enter)">
        <ChevronUp size={13} />
      </button>
      <button onClick={onNext} disabled={!total} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Next (Enter)">
        <ChevronDown size={13} />
      </button>
      <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" title="Close (Esc)">
        <X size={13} />
      </button>
    </div>
  );
};

export default PaneSearch;
