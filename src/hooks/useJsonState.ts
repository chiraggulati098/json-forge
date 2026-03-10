import { useState, useCallback, useEffect } from "react";

const SAMPLE_JSON = {
  name: "JSON Forge",
  version: "1.0.0",
  description: "A precision JSON editor / viewer",
  features: ["syntax highlighting", "tree view", "real-time validation"],
  config: {
    theme: "dark",
    autoFormat: true,
    tabSize: 2,
    maxDepth: null
  },
  stats: {
    launchedOn: "11-03-2026",
    live: true,
    isPublic: true,
    vibeCoded: true,
  },
  tags: [
    { id: 1, label: "viewer" },
    { id: 2, label: "json" },
    { id: 3, label: "editor" }
  ]
};

export function useJsonState() {
  const [rawJson, setRawJson] = useState(() => JSON.stringify(SAMPLE_JSON, null, 2));
  const [parsedJson, setParsedJson] = useState<unknown>(SAMPLE_JSON);
  const [error, setError] = useState<string | null>(null);

  const updateRawJson = useCallback((value: string) => {
    setRawJson(value);
    try {
      const parsed = JSON.parse(value);
      setParsedJson(parsed);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const beautify = useCallback(() => {
    if (parsedJson !== undefined && !error) {
      const formatted = JSON.stringify(parsedJson, null, 2);
      setRawJson(formatted);
    }
  }, [parsedJson, error]);

  const clear = useCallback(() => {
    setRawJson("");
    setParsedJson(undefined);
    setError(null);
  }, []);

  return { rawJson, parsedJson, error, updateRawJson, beautify, clear };
}
