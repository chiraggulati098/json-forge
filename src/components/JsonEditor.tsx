import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  onScroll?: (scrollPercent: number) => void;
}

export interface JsonEditorHandle {
  setScrollPercent: (percent: number) => void;
}

const JsonEditor = forwardRef<JsonEditorHandle, JsonEditorProps>(
  ({ value, onChange, error, onScroll }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const isSyncingRef = useRef(false);

    const lines = value.split("\n");
    const lineCount = lines.length;

    useImperativeHandle(ref, () => ({
      setScrollPercent(percent: number) {
        if (textareaRef.current) {
          isSyncingRef.current = true;
          const maxScroll = textareaRef.current.scrollHeight - textareaRef.current.clientHeight;
          textareaRef.current.scrollTop = maxScroll * percent;
          if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
          }
          requestAnimationFrame(() => {
            isSyncingRef.current = false;
          });
        }
      },
    }));

    const handleScroll = useCallback(() => {
      if (textareaRef.current && lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
      if (!isSyncingRef.current && textareaRef.current && onScroll) {
        const maxScroll = textareaRef.current.scrollHeight - textareaRef.current.clientHeight;
        const percent = maxScroll > 0 ? textareaRef.current.scrollTop / maxScroll : 0;
        onScroll(percent);
      }
    }, [onScroll]);

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
          <div className="absolute bottom-0 left-0 right-0 px-4 py-1.5 bg-destructive/10 border-t border-destructive/20">
            <p className="text-xs font-mono text-destructive truncate">{error}</p>
          </div>
        )}
      </div>
    );
  }
);

JsonEditor.displayName = "JsonEditor";
export default JsonEditor;
