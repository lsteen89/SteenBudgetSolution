// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { withRouter } from 'storybook-addon-react-router-v6';

const preview: Preview = {
  decorators: [withRouter],
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // Global default for the router; per-story can override
    reactRouter: {
      routePath: '/',                           // default route
      routing: { initialEntries: ['/'] },       // default location
    },
    a11y: {
      // keep checks on, mark violations in UI; fail CI in your test runner instead
      manual: false,
    },
  },
};

export default preview;
