import { BrowserRouter } from 'react-router-dom';
import { AuthProvider }   from '@/providers/AuthProvider';
import AppLayout          from '@/layout/AppLayout';
import AppRoutes          from '@/layout/AppRoutes';
import { useAuthWs }      from '@/hooks/auth/useAuthWs';

/**
 * App component
 * 
 * This is the main entry point of the application. It wraps the entire app in a
 * BrowserRouter and AuthProvider, and renders the AppLayout and AppRoutes.
 * 
 * @returns {JSX.Element} The main App component.
 */
export default function App() {
  useAuthWs();                        // safe: this runs only after AuthProvider is "ready"

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}