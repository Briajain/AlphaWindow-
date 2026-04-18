import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Landing from './components/Landing';

type ViewState = 'landing' | 'auth' | 'dashboard';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [token, setToken] = useState<string | null>(localStorage.getItem('aw_token'));
  const [user, setUser] = useState<{ id: number; username: string } | null>(
    JSON.parse(localStorage.getItem('aw_user') || 'null')
  );

  const handleLogin = (newToken: string, newUser: { id: number; username: string }) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('aw_token', newToken);
    localStorage.setItem('aw_user', JSON.stringify(newUser));
    setView('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aw_token');
    localStorage.removeItem('aw_user');
    setView('landing'); // Return to landing on logout
  };

  // Verify token on load if exists
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          handleLogout();
        }
      })
      .catch(() => handleLogout());
    }
  }, []);

  // Conditional Routing
  if (view === 'landing') {
    return <Landing onEnter={() => setView('auth')} />;
  }

  if (view === 'auth') {
    return <Auth onLogin={handleLogin} />;
  }

  return <Dashboard token={token!} user={user!} onLogout={handleLogout} />;
}
