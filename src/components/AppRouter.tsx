import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VotingPage } from './VotingPage';
import { LoginPage } from './LoginPage';
import { AdminDashboard } from './AdminDashboard';
import { DemoPage } from './DemoPage';
import { Card } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AppRouter() {
  const { user, loading } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    // Check if we're in admin mode based on URL params or local storage
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');
    const savedMode = localStorage.getItem('adminMode');
    
    if (adminParam === 'true' || savedMode === 'true') {
      setIsAdminMode(true);
      localStorage.setItem('adminMode', 'true');
    }
  }, []);

  // Show demo page if Supabase is not configured
  if (!isSupabaseConfigured) {
    return <DemoPage />;
  }

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </Card>
      </div>
    );
  }

  // Admin mode logic
  if (isAdminMode) {
    return user ? <AdminDashboard /> : <LoginPage />;
  }

  // Public voting page
  return <VotingPage />;
}