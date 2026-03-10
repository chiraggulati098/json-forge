import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Copy, Check, Trash2, Sun, Moon } from "lucide-react";

interface ToolbarProps {
  onBeautify: () => void;
  onCopy: () => void;
  onClear: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  error: string | null;
}

const ToolbarButton = ({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className="group relative flex items-center gap-2 px-3 py-2 rounded-md bg-surface text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150 font-sans text-sm font-medium"
    title={label}
  >
    {children}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default function Toolbar({ onBeautify, onCopy, onClear, isDark, onToggleTheme, error }: ToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border transition-colors duration-150">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <h1 className="font-sans font-semibold text-sm text-foreground tracking-tight">JSON Forge</h1>
        </div>

        <ToolbarButton onClick={onBeautify} label="Beautify">
          <Wand2 size={15} />
        </ToolbarButton>

        <ToolbarButton onClick={handleCopy} label={copied ? "Copied" : "Copy"}>
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                <Check size={15} className="text-primary" />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ duration: 0.15 }}
              >
                <Copy size={15} />
              </motion.span>
            )}
          </AnimatePresence>
        </ToolbarButton>

        <ToolbarButton onClick={onClear} label="Clear">
          <Trash2 size={15} />
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-3">
        {error && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-mono text-destructive truncate max-w-[200px] sm:max-w-[350px]"
          >
            {error}
          </motion.span>
        )}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-md bg-surface text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150"
          title="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.span key="sun" initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={{ duration: 0.15 }}>
                <Sun size={16} />
              </motion.span>
            ) : (
              <motion.span key="moon" initial={{ rotate: 90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -90, scale: 0 }} transition={{ duration: 0.15 }}>
                <Moon size={16} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
