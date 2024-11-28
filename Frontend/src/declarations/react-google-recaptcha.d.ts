declare module 'react-google-recaptcha' {
    import React from 'react';
  
    export interface ReCAPTCHAProps {
      sitekey: string;
      onChange?: (token: string | null) => void;
      onExpired?: () => void;
      onErrored?: () => void;
      theme?: 'light' | 'dark';
      size?: 'compact' | 'normal' | 'invisible';
      tabindex?: number;
      badge?: 'bottomright' | 'bottomleft' | 'inline';
      hl?: string;
    }
  
    export default class ReCAPTCHA extends React.Component<ReCAPTCHAProps> {}
  }
  