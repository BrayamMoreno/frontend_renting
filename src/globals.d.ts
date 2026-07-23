declare const GEMINI_API_KEY: string;
declare const APP_URL: string;

// Google Identity Services (GSI) library
declare const google: {
  accounts: {
    id: {
      initialize(config: any): void;
      prompt(callback?: (notification: any) => void): void;
      renderButton(parent: HTMLElement, options: any): void;
      revoke(hint: string, callback?: () => void): void;
    };
    oauth2: {
      initTokenClient(config: any): any;
    };
  };
};

