import { useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JsonTreeViewProps {
  data: unknown;
  onScroll?: (scrollPercent: number) => void;
}

export interface JsonTreeViewHandle {
  setScrollPercent: (percent: number) => void;
}

const JsonTreeView = forwardRef<JsonTreeViewHandle, JsonTreeViewProps>(
  ({ data, onScroll }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isSyncingRef = useRef(false);

    useImperativeHandle(ref, () => ({
      setScrollPercent(percent: number) {
        if (containerRef.current) {
          isSyncingRef.current = true;
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
          containerRef.current.scrollTop = maxScroll * percent;
          requestAnimationFrame(() => {
            isSyncingRef.current = false;
          });
        }
      },
    }));

    const handleScroll = useCallback(() => {
      if (!isSyncingRef.current && containerRef.current && onScroll) {
        const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        const percent = maxScroll > 0 ? containerRef.current.scrollTop / maxScroll : 0;
        onScroll(percent);
      }
    }, [onScroll]);

    if (data === undefined) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground/50 font-sans text-sm">
          No valid JSON to display
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-auto py-3 px-4 font-mono text-sm"
      >
        <JsonNode value={data} depth={0} isLast={true} />
      </div>
    );
  }
);

JsonTreeView.displayName = "JsonTreeView";
export default JsonTreeView;

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  isLast: boolean;
}

function JsonNode({ keyName, value, depth, isLast }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < 3);
  const indent = depth * 16;

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  if (value === null) {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-syntax-null">null</span>
        {!isLast && <Comma />}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-syntax-boolean">{value ? "true" : "false"}</span>
        {!isLast && <Comma />}
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-syntax-number">{value}</span>
        {!isLast && <Comma />}
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-syntax-string">"{value}"</span>
        {!isLast && <Comma />}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [i, v] as const)
    : Object.entries(value as Record<string, unknown>);
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const isEmpty = entries.length === 0;

  if (isEmpty) {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-syntax-bracket">{openBracket}{closeBracket}</span>
        {!isLast && <Comma />}
      </div>
    );
  }

  return (
    <div>
      <div
        style={{ paddingLeft: indent }}
        className="leading-7 flex items-center cursor-pointer group"
        onClick={toggle}
      >
        <motion.span
          animate={{ scale: expanded ? 1 : 0.85 }}
          className="inline-flex items-center justify-center w-4 h-4 mr-1.5 flex-shrink-0"
        >
          <motion.div
            animate={{
              borderWidth: expanded ? 2 : 5,
              borderColor: "hsl(var(--primary))",
            }}
            transition={{ duration: 0.2 }}
            className="w-2.5 h-2.5 rounded-full border-primary"
            style={{ borderStyle: "solid" }}
          />
        </motion.span>

        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-syntax-bracket">{openBracket}</span>
        {!expanded && (
          <span className="text-muted-foreground/40 mx-1 text-xs">
            {entries.length} {entries.length === 1 ? "item" : "items"}
          </span>
        )}
        {!expanded && <span className="text-syntax-bracket">{closeBracket}</span>}
        {!expanded && !isLast && <Comma />}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {entries.map(([key, val], index) => (
              <JsonNode
                key={String(key)}
                keyName={isArray ? undefined : String(key)}
                value={val}
                depth={depth + 1}
                isLast={index === entries.length - 1}
              />
            ))}
            <div style={{ paddingLeft: indent }} className="leading-7">
              <span className="text-syntax-bracket">{closeBracket}</span>
              {!isLast && <Comma />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KeyLabel({ name }: { name: string }) {
  return <span className="text-syntax-key mr-1">"{name}"<span className="text-syntax-bracket">: </span></span>;
}

function Comma() {
  return <span className="text-syntax-bracket">,</span>;
}
