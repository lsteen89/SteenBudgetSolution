import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '@pages/dashboard/dashboardhome';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock the useAuth hook
jest.mock('@context/AuthProvider', () => ({
  useAuth: () => ({
    authenticated: true,
    firstTimeLogin: true,
    // add other properties if necessary
  }),
}));

describe('Dashboard', () => {
  test('renders SetupWizard overlay when firstTimeLogin is true', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    // Assert that the SetupWizard component is rendered (assuming it contains "Setup Wizard")
    expect(screen.getByText(/Setup Wizard/i)).toBeInTheDocument();
  });
});
