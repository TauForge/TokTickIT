import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface DevRequester {
  id: number;
  name: string;
  email: string;
}

interface DevRequesterContextValue {
  requesters: DevRequester[];
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  select: (id: number) => void;
  clearSelection: () => void;
  reload: () => void;
}

const STORAGE_KEY = "toktickit.devRequesterId";
const DevRequesterCtx = createContext<DevRequesterContextValue | null>(null);

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export function DevRequesterProvider({ children }: { children: ReactNode }) {
  const [requesters, setRequesters] = useState<DevRequester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${apiBaseUrl}/api/dev-requesters`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: DevRequester[]) => setRequesters(data))
      .catch(() =>
        setError("Unable to load development requesters. Check the backend and try again."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const select = useCallback((id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setSelectedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedId(null);
  }, []);

  return (
    <DevRequesterCtx.Provider
      value={{ requesters, loading, error, selectedId, select, clearSelection, reload: load }}
    >
      {children}
    </DevRequesterCtx.Provider>
  );
}

export function useDevRequester(): DevRequesterContextValue {
  const ctx = useContext(DevRequesterCtx);
  if (!ctx) throw new Error("useDevRequester must be used within a DevRequesterProvider");
  return ctx;
}
