const ACCESS_KEY = 'uniflow-access-token';
const REFRESH_KEY = 'uniflow-refresh-token';

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

function stores(): Storage[] {
  try {
    return [localStorage, sessionStorage];
  } catch {
    return [];
  }
}

function persistentStore(): Storage | null {
  for (const store of stores()) {
    if (store.getItem(REFRESH_KEY)) return store;
  }
  return null;
}

export const tokenStorage = {
  getAccess(): string | null {
    return persistentStore()?.getItem(ACCESS_KEY) ?? null;
  },

  getRefresh(): string | null {
    return persistentStore()?.getItem(REFRESH_KEY) ?? null;
  },

  save(tokens: Tokens, remember?: boolean) {
    const current = persistentStore();
    const all = stores();
    const target =
      remember === undefined
        ? (current ?? all[1])
        : remember
          ? all[0]
          : all[1];
    if (!target) return;

    this.clear();
    try {
      target.setItem(ACCESS_KEY, tokens.access_token);
      target.setItem(REFRESH_KEY, tokens.refresh_token);
    } catch {
      return;
    }
  },

  clear() {
    for (const store of stores()) {
      store.removeItem(ACCESS_KEY);
      store.removeItem(REFRESH_KEY);
    }
  },
};
