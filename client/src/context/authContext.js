import { createContext } from 'react';

/**
 * Kept in its own module so the provider file exports a component and
 * nothing else, which is what React Fast Refresh requires.
 */
export const AuthContext = createContext(null);
