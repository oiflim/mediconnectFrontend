
function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export async function getAuthItem(
  key: string
): Promise<string | null> {
  return getBrowserStorage()?.getItem(key) ?? null;
}

export async function setAuthItem(
  key: string,
  value: string
): Promise<void> {
  const storage = getBrowserStorage();

  if (!storage) {
    throw new Error('Browser session storage is unavailable.');
  }

  storage.setItem(key, value);
}

export async function deleteAuthItem(
  key: string
): Promise<void> {
  getBrowserStorage()?.removeItem(key);
}
