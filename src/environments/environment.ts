const windowEnv = (typeof window !== 'undefined' && (window as any).__env) ? (window as any).__env : {};

export const environment = {
  production: false,
  apiUrl: windowEnv.apiUrl || 'http://localhost:8000/api',
  googleClientId: windowEnv.googleClientId || '731815648196-0i12ig1acoqt3gj2tg4jlh1ge3p6nb79.apps.googleusercontent.com'
};
