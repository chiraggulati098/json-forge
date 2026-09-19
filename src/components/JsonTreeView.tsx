import { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PaneSearch from "./PaneSearch";

interface JsonTreeViewProps {
  data: unknown;
  searchOpen: boolean;
  onSearchClose: () => void;
}

const SEP = "\u0001";

interface Match {
  id: string; // `${path}#k` or `${path}#v`
  path: string;
}

function collectMatches(value: unknown, needle: string): Match[] {
  const out: Match[] = [];
  const walk = (v: unknown, path: string, key?: string) => {
    if (key !== undefined && key.toLowerCase().includes(needle)) out.push({ id: `${path}#k`, path });
    if (v !== null && typeof v === "object") {
      if (Array.isArray(v)) v.forEach((c, i) => walk(c, path + SEP + i));
      else for (const [k, c] of Object.entries(v)) walk(c, path + SEP + k, k);
    } else if (String(v).toLowerCase().includes(needle)) {
      out.push({ id: `${path}#v`, path });
    }
  };
  walk(value, "");
  return out;
}

interface SearchCtx {
  needle: string;
  currentId: string | null;
  currentPath: string | null;
}
const SearchContext = createContext<SearchCtx>({ needle: "", currentId: null, currentPath: null });

const JsonTreeView = ({ data, searchOpen, onSearchClose }: JsonTreeViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);

  const needle = searchOpen ? query.toLowerCase() : "";

  const matches = useMemo(
    () => (needle && data !== undefined ? collectMatches(data, needle) : []),
    [data, needle]
  );
  const safeCurrent = matches.length ? Math.min(current, matches.length - 1) : 0;
  const currentId = matches.length ? matches[safeCurrent].id : null;

  const currentPath = matches.length ? matches[safeCurrent].path : null;
  const ctx = useMemo(
    () => ({ needle, currentId, currentPath }),
    [needle, currentId, currentPath]
  );

  useEffect(() => setCurrent(0), [needle]);

  // Scroll the current match into view (after expand animation starts)
  useEffect(() => {
    if (!currentId) return;
    // The match may not be mounted until ancestors finish expanding; retry briefly.
    let tries = 0;
    let t: ReturnType<typeof setTimeout>;
    const attempt = () => {
      const el = containerRef.current?.querySelector('[data-current-match="true"]');
      if (el) el.scrollIntoView({ block: "center" });
      if (++tries < 8) t = setTimeout(attempt, 60);
    };
    t = setTimeout(attempt, 30);
    return () => clearTimeout(t);
  }, [currentId]);

  const goTo = (idx: number) => {
    if (matches.length) setCurrent((idx + matches.length) % matches.length);
  };

  if (data === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground/50 font-sans text-sm">
        No valid JSON to display
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {searchOpen && (
        <PaneSearch
          query={query}
          onQueryChange={setQuery}
          total={matches.length}
          current={safeCurrent}
          onNext={() => goTo(safeCurrent + 1)}
          onPrev={() => goTo(safeCurrent - 1)}
          onClose={onSearchClose}
        />
      )}
      <div ref={containerRef} className="relative flex-1 min-h-0 overflow-auto py-3 px-4 font-mono text-sm">
        <SearchContext.Provider value={ctx}>
          <JsonNode value={data} depth={0} isLast={true} path="" />
        </SearchContext.Provider>
      </div>
    </div>
  );
};

JsonTreeView.displayName = "JsonTreeView";
export default JsonTreeView;

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  isLast: boolean;
  path: string;
}

function Highlight({ text, id }: { text: string; id: string }) {
  const { needle, currentId } = useContext(SearchContext);
  if (!needle) return <>{text}</>;
  const lower = text.toLowerCase();
  const isCurrent = currentId === id;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (let i = lower.indexOf(needle), n = 0; i !== -1; i = lower.indexOf(needle, i + needle.length), n++) {
    if (i > last) parts.push(text.slice(last, i));
    parts.push(
      <mark
        key={i}
        data-current-match={isCurrent && n === 0 ? "true" : undefined}
        className={`rounded-sm ${isCurrent ? "bg-orange-400 text-black ring-2 ring-orange-400" : "bg-yellow-300/40"}`}
      >
        {text.slice(i, i + needle.length)}
      </mark>
    );
    last = i + needle.length;
  }
  if (!parts.length) return <>{text}</>;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function JsonNode({ keyName, value, depth, isLast, path }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < 3);
  const { currentPath } = useContext(SearchContext);
  const indent = depth * 16;

  const containsCurrent = currentPath !== null && currentPath.startsWith(path + SEP);
  // Expand only along the path to the current match; stays open afterwards
  useLayoutEffect(() => {
    if (containsCurrent) setExpanded(true);
  }, [containsCurrent, currentPath]);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  if (value === null) {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} id={`${path}#k`} />}
        <span className="text-syntax-null"><Highlight text="null" id={`${path}#v`} /></span>
        {!isLast && <Comma />}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} id={`${path}#k`} />}
        <span className="text-syntax-boolean"><Highlight text={value ? "true" : "false"} id={`${path}#v`} /></span>
        {!isLast && <Comma />}
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} id={`${path}#k`} />}
        <span className="text-syntax-number"><Highlight text={String(value)} id={`${path}#v`} /></span>
        {!isLast && <Comma />}
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-7">
        {keyName !== undefined && <KeyLabel name={keyName} id={`${path}#k`} />}
        <span className="text-syntax-string">"<Highlight text={value} id={`${path}#v`} />"</span>
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
        {keyName !== undefined && <KeyLabel name={keyName} id={`${path}#k`} />}
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

        {keyName !== undefined && <KeyLabel name={keyName} id={`${path}#k`} />}
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
                path={path + SEP + String(key)}
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

function KeyLabel({ name, id }: { name: string; id: string }) {
  return <span className="text-syntax-key mr-1">"<Highlight text={name} id={id} />"<span className="text-syntax-bracket">: </span></span>;
}

function Comma() {
  return <span className="text-syntax-bracket">,</span>;
}
