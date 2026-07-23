const windowEnv = (typeof window !== 'undefined' && (window as any).__env) ? (window as any).__env : {};

export const environment = {
  production: false,
  apiUrl: windowEnv.apiUrl || '',
  googleClientId: windowEnv.googleClientId || ''
};
