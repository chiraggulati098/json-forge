import { useRef, useCallback } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

const JsonEditor = ({ value, onChange, error }: JsonEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split("\n");
  const lineCount = lines.length;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
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
    <div className="relative flex h-full overflow-hidden bg-surface">
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 overflow-hidden select-none py-3 pl-3 pr-2 text-right font-mono text-xs leading-[1.65rem] text-muted-foreground/50"
        style={{ width: "3.5rem" }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1}>{i + 1}</div>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className={`flex-1 resize-none bg-transparent py-3 pr-4 font-mono text-sm leading-[1.65rem] text-foreground outline-none placeholder:text-muted-foreground/40 ${
          error ? "ring-1 ring-inset ring-destructive/30" : ""
        }`}
        placeholder="Paste or type JSON here..."
      />

      {error && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-1.5 bg-destructive/95 border-t border-destructive/80 z-50">
          <p className="text-xs font-mono text-white truncate">{error}</p>
        </div>
      )}
    </div>
  );
};

export default JsonEditor;
