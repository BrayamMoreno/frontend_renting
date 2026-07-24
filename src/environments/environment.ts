const windowEnv = (typeof window !== 'undefined' && (window as any).__env) ? (window as any).__env : {};

export const environment = {
  production: false,
  port: windowEnv.port || '3000',
  apiUrl: windowEnv.apiUrl || '',
  googleClientId: windowEnv.googleClientId || ''
};
