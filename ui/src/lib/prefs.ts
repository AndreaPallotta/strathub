export type UiPrefs = {
  selectedStrategyId?: string | null;
  pnlRange?: string;
  tradesRange?: string;
  autoScrollLogs?: boolean;
  logsHeight?: number;
};

const KEY = 'kalshi_ui_prefs_v1';

export function loadPrefs(): UiPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UiPrefs;
  } catch {
    return {};
  }
}

export function savePrefs(partial: UiPrefs) {
  if (typeof window === 'undefined') return;
  const current = loadPrefs();
  const next = { ...current, ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
