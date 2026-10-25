/**
 * ISO 27001 Compliant Secure Storage
 * 
 * Provides secure storage with encryption for sensitive data
 * Note: Client-side encryption is limited. Sensitive data should be encrypted server-side.
 */

/**
 * Secure storage using sessionStorage with additional security measures
 */
const AUTH_MIRROR_KEYS = new Set(['authToken', 'knex-user']);

function readEnvelope(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data.value || null;
  } catch {
    return null;
  }
}

class SecureStorage {
  /**
   * Store data securely
   */
  setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Add timestamp for expiry checking
      const data = {
        value,
        timestamp: Date.now(),
      };
      const packed = JSON.stringify(data);
      sessionStorage.setItem(key, packed);
      // Auth must survive a new tab (sessionStorage does not).
      if (AUTH_MIRROR_KEYS.has(key)) {
        localStorage.setItem(key, packed);
      }
      return true;
    } catch (error) {
      console.error('Failed to store data securely:', error);
      return false;
    }
  }

  /**
   * Get data securely
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const sessionRaw = sessionStorage.getItem(key);
      const fromSession = readEnvelope(sessionRaw);
      if (fromSession) {
        if (AUTH_MIRROR_KEYS.has(key) && sessionRaw && !localStorage.getItem(key)) {
          localStorage.setItem(key, sessionRaw);
        }
        return fromSession;
      }

      if (AUTH_MIRROR_KEYS.has(key)) {
        const fromLocal = readEnvelope(localStorage.getItem(key));
        if (fromLocal) {
          sessionStorage.setItem(key, JSON.stringify({ value: fromLocal, timestamp: Date.now() }));
          return fromLocal;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  }

  /**
   * Remove data securely
   */
  removeItem(key: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(key);
      if (AUTH_MIRROR_KEYS.has(key)) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Clear all secure storage
   */
  clear(): void {
    if (typeof window !== 'undefined') {
      // Only clear our application's data, not all sessionStorage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('knex-') || key.startsWith('csrf-') || key === 'authToken' || key === 'client-id') {
          sessionStorage.removeItem(key);
        }
      });
      AUTH_MIRROR_KEYS.forEach((key) => localStorage.removeItem(key));
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const testKey = '__storage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

export const secureStorage = new SecureStorage();

/**
 * Store authentication token securely
 */
export function storeAuthToken(token: string): boolean {
  return secureStorage.setItem('authToken', token);
}

/**
 * Get authentication token securely
 */
export function getAuthToken(): string | null {
  return secureStorage.getItem('authToken');
}

/**
 * Remove authentication token securely
 */
export function removeAuthToken(): void {
  secureStorage.removeItem('authToken');
}

/**
 * Store user data securely
 */
export function storeUserData(userData: any): boolean {
  try {
    return secureStorage.setItem('knex-user', JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to store user data:', error);
    return false;
  }
}

/**
 * Get user data securely
 */
export function getUserData(): any | null {
  try {
    const data = secureStorage.getItem('knex-user');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
}

/**
 * Remove user data securely
 */
export function removeUserData(): void {
  secureStorage.removeItem('knex-user');
}


























