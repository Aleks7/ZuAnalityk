// localStorage can be unavailable (private mode, blocked site data) – never let it break the game.
export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export interface Records {
  bestScore: number;
  bestStage: number;
}

export function loadRecords(): Records {
  return { bestScore: load('zu_best_score', 0), bestStage: load('zu_best_stage', 0) };
}

export function saveRecords(score: number, stage: number): Records {
  const r = loadRecords();
  if (score > r.bestScore) r.bestScore = score;
  if (stage > r.bestStage) r.bestStage = stage;
  save('zu_best_score', r.bestScore);
  save('zu_best_stage', r.bestStage);
  return r;
}
