import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
import Toolbar from "@/components/Toolbar";
import JsonEditor, { JsonEditorHandle } from "@/components/JsonEditor";
import JsonTreeView, { JsonTreeViewHandle } from "@/components/JsonTreeView";
import { useJsonState } from "@/hooks/useJsonState";

type MaximizedPane = "none" | "editor" | "viewer";

export default function Index() {
  const { rawJson, parsedJson, error, updateRawJson, beautify, clear } = useJsonState();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });
  const [maximized, setMaximized] = useState<MaximizedPane>("none");
  const [gutterDragging, setGutterDragging] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);

  const editorRef = useRef<JsonEditorHandle>(null);
  const viewerRef = useRef<JsonTreeViewHandle>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(rawJson);
  }, [rawJson]);

  const toggleTheme = useCallback(() => setIsDark((d) => !d), []);

  const handleGutterMouseDown = useCallback(() => {
    setGutterDragging(true);
  }, []);

  useEffect(() => {
    if (!gutterDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const percent = (e.clientX / window.innerWidth) * 100;
      setSplitPercent(Math.max(20, Math.min(80, percent)));
    };
    const handleMouseUp = () => setGutterDragging(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [gutterDragging]);

  // Synchronized scrolling by percentage
  const handleEditorScroll = useCallback((percent: number) => {
    viewerRef.current?.setScrollPercent(percent);
  }, []);

  const handleViewerScroll = useCallback((percent: number) => {
    editorRef.current?.setScrollPercent(percent);
  }, []);

  const showEditor = maximized !== "viewer";
  const showViewer = maximized !== "editor";

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Toolbar
        onBeautify={beautify}
        onCopy={handleCopy}
        onClear={clear}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        error={error}
      />

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence mode="sync" initial={false}>
          {showEditor && (
            <motion.div
              key="editor-pane"
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: maximized === "editor" ? "100%" : `${splitPercent}%`,
                opacity: 1,
              }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative flex flex-col overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 h-8 bg-surface border-b border-border select-none"
                onDoubleClick={() => setMaximized((m) => (m === "editor" ? "none" : "editor"))}
              >
                <span className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider">Editor</span>
                <button
                  onClick={() => setMaximized((m) => (m === "editor" ? "none" : "editor"))}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {maximized === "editor" ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <JsonEditor
                  ref={editorRef}
                  value={rawJson}
                  onChange={updateRawJson}
                  error={error}
                  onScroll={handleEditorScroll}
                />
              </div>
            </motion.div>
          )}

          {maximized === "none" && (
            <div
              onMouseDown={handleGutterMouseDown}
              className={`relative flex-shrink-0 w-2 cursor-col-resize bg-gutter group flex items-center justify-center ${
                gutterDragging ? "bg-primary/10" : ""
              }`}
            >
              <div
                className={`w-0.5 h-8 rounded-full transition-colors duration-150 ${
                  gutterDragging ? "bg-primary" : "bg-transparent group-hover:bg-primary"
                }`}
              />
            </div>
          )}

          {showViewer && (
            <motion.div
              key="viewer-pane"
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: maximized === "viewer" ? "100%" : `${100 - splitPercent}%`,
                opacity: 1,
              }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative flex flex-col overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 h-8 bg-surface border-b border-border select-none"
                onDoubleClick={() => setMaximized((m) => (m === "viewer" ? "none" : "viewer"))}
              >
                <span className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider">Viewer</span>
                <button
                  onClick={() => setMaximized((m) => (m === "viewer" ? "none" : "viewer"))}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {maximized === "viewer" ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-surface">
                <JsonTreeView
                  ref={viewerRef}
                  data={error ? undefined : parsedJson}
                  onScroll={handleViewerScroll}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5 bg-surface border-t border-border text-[11px] font-sans text-muted-foreground">
        <span>JSON Forge</span>
        <span>{error ? "⚠ Invalid JSON" : "✓ Valid JSON"}</span>
      </div>
    </div>
  );
}
