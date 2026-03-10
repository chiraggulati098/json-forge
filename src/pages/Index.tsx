import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
import Toolbar from "@/components/Toolbar";
import JsonEditor from "@/components/JsonEditor";
import JsonTreeView from "@/components/JsonTreeView";
import { useJsonState } from "@/hooks/useJsonState";

// ---------------------------------------------------------------------------
// Theme-transition animation
// CSS transitions don't apply to ::-webkit-scrollbar-* pseudo-elements because
// they're painted on the compositor thread. Animating the CSS custom-property
// values themselves via rAF is the only reliable way to keep scrollbars in
// lockstep with the rest of the UI during a theme switch.
// ---------------------------------------------------------------------------
type Hsl = [number, number, number];

function parseHsl(v: string): Hsl {
  const p = v.trim().split(/\s+/);
  return [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2])];
}

function lerpHsl(a: Hsl, b: Hsl, t: number): string {
  // Interpolate hue on the shortest angular distance to avoid passing
  // through unrelated hues (prevents a green flash between themes).
  const h0 = a[0];
  const h1 = b[0];
  const dh = ((h1 - h0 + 540) % 360) - 180; // shortest delta (-180..180]
  const h = (h0 + dh * t + 360) % 360;
  const s = a[1] + (b[1] - a[1]) * t;
  const l = a[2] + (b[2] - a[2]) * t;
  return `${h} ${s}% ${l}%`;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const THEME_VARS = {
  light: {
    "--background":             "220 20% 97%",
    "--foreground":             "222 47% 11%",
    "--card":                   "0 0% 100%",
    "--card-foreground":        "222 47% 11%",
    "--popover":                "0 0% 100%",
    "--popover-foreground":     "222 47% 11%",
    "--primary":                "214 100% 40%",
    "--primary-foreground":     "0 0% 100%",
    "--secondary":              "220 14% 93%",
    "--secondary-foreground":   "222 47% 11%",
    "--muted":                  "220 14% 93%",
    "--muted-foreground":       "220 10% 46%",
    "--accent":                 "214 100% 50%",
    "--accent-foreground":      "0 0% 100%",
    "--destructive":            "0 72% 51%",
    "--destructive-foreground": "0 0% 100%",
    "--border":                 "220 13% 87%",
    "--input":                  "220 13% 87%",
    "--ring":                   "214 100% 50%",
    "--surface":                "0 0% 100%",
    "--gutter":                 "220 14% 90%",
    "--syntax-key":             "214 60% 30%",
    "--syntax-string":          "150 50% 35%",
    "--syntax-number":          "30 80% 45%",
    "--syntax-boolean":         "270 60% 45%",
    "--syntax-null":            "0 50% 50%",
    "--syntax-bracket":         "220 10% 55%",
  },
  dark: {
    "--background":             "225 50% 5%",
    "--foreground":             "210 40% 92%",
    "--card":                   "224 40% 10%",
    "--card-foreground":        "210 40% 92%",
    "--popover":                "224 40% 10%",
    "--popover-foreground":     "210 40% 92%",
    "--primary":                "214 100% 61%",
    "--primary-foreground":     "225 50% 5%",
    "--secondary":              "224 30% 16%",
    "--secondary-foreground":   "210 40% 92%",
    "--muted":                  "224 30% 16%",
    "--muted-foreground":       "220 15% 55%",
    "--accent":                 "214 100% 61%",
    "--accent-foreground":      "225 50% 5%",
    "--destructive":            "0 70% 50%",
    "--destructive-foreground": "0 0% 100%",
    "--border":                 "224 25% 18%",
    "--input":                  "224 25% 18%",
    "--ring":                   "214 100% 61%",
    "--surface":                "224 35% 12%",
    "--gutter":                 "224 30% 8%",
    "--syntax-key":             "205 70% 80%",
    "--syntax-string":          "150 50% 65%",
    "--syntax-number":          "30 80% 70%",
    "--syntax-boolean":         "270 60% 75%",
    "--syntax-null":            "0 50% 65%",
    "--syntax-bracket":         "220 15% 45%",
  },
} as const;

let _themeRafId: number | null = null;

function animateThemeChange(toDark: boolean, duration = 100) {
  if (_themeRafId !== null) { cancelAnimationFrame(_themeRafId); _themeRafId = null; }

  const el = document.documentElement;
  const targetVars = toDark ? THEME_VARS.dark : THEME_VARS.light;
  const fallbackFrom = toDark ? THEME_VARS.light : THEME_VARS.dark;

  // Sample current computed values as the animation "from" (handles mid-transition cancellation)
  const computed = getComputedStyle(el);
  const fromParsed: Record<string, Hsl> = {};
  for (const key of Object.keys(targetVars) as (keyof typeof targetVars)[]) {
    const live = computed.getPropertyValue(key).trim();
    fromParsed[key] = parseHsl(live || fallbackFrom[key]);
  }
  const toParsed: Record<string, Hsl> = {};
  for (const key of Object.keys(targetVars) as (keyof typeof targetVars)[]) {
    toParsed[key] = parseHsl(targetVars[key]);
  }

  // Toggle the class now so the cascade is correct once inline overrides are removed
  el.classList.toggle("dark", toDark);
  // Let JS drive rendering; suppress CSS transitions to avoid fighting the rAF loop
  el.classList.add("theme-animating");
  // Pin variables at the sampled "from" values so the class change doesn't cause a jump
  for (const key of Object.keys(fromParsed)) {
    el.style.setProperty(key, `${fromParsed[key][0]} ${fromParsed[key][1]}% ${fromParsed[key][2]}%`);
  }

  const start = performance.now();
  function frame(now: number) {
    const raw = Math.min((now - start) / duration, 1);
    const t = easeInOut(raw);
    for (const key of Object.keys(toParsed)) {
      el.style.setProperty(key, lerpHsl(fromParsed[key], toParsed[key], t));
    }
    if (raw < 1) {
      _themeRafId = requestAnimationFrame(frame);
    } else {
      for (const key of Object.keys(toParsed)) el.style.removeProperty(key);
      el.classList.remove("theme-animating");
      _themeRafId = null;
    }
  }
  _themeRafId = requestAnimationFrame(frame);
}
// ---------------------------------------------------------------------------

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

  // refs for scroll-sync removed
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Apply initial theme instantly (no animation on first paint)
      document.documentElement.classList.toggle("dark", isDark);
      return;
    }
    animateThemeChange(isDark);
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



  const showEditor = maximized !== "viewer";
  const showViewer = maximized !== "editor";

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden transition-colors duration-150">
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
                className="flex items-center justify-between px-4 h-8 bg-surface border-b border-border select-none transition-colors duration-150"
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
                  value={rawJson}
                  onChange={updateRawJson}
                  error={error}
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
                className="flex items-center justify-between px-4 h-8 bg-surface border-b border-border select-none transition-colors duration-150"
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
                <JsonTreeView data={error ? undefined : parsedJson} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5 bg-surface border-t border-border text-[11px] font-sans text-muted-foreground transition-colors duration-150">
        <span>JSON Forge</span>
        <span>{error ? "⚠ Invalid JSON" : "✓ Valid JSON"}</span>
      </div>
    </div>
  );
}
