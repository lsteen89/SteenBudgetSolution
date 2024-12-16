import LoginPage from '@pages/auth/LoginPage';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';

describe('LoginPage', () => {
  it('displays validation messages when fields are empty', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole('button', { name: /logga in/i });

    // Simulate form submission
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check for validation messages
    expect(await screen.findByText(/Ogiltig epostadress/i)).toBeInTheDocument();
    expect(await screen.findByText(/vänligen ange ditt lösenord!/i)).toBeInTheDocument();
  });

  it('displays an error for invalid email format', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/ange din e-post/i);
    const submitButton = screen.getByRole('button', { name: /logga in/i });

    // Enter invalid email and submit
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check for invalid email error
    expect(await screen.findByText(/ogiltig epostadress/i)).toBeInTheDocument();
  });
});
