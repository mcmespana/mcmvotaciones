import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VotingPage } from './VotingPage';
import { AuthForm } from './AuthForm';
import { AdminDashboard } from './AdminDashboard';
import { DemoPage } from './DemoPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Shield } from 'lucide-react';

export function AppRouter() {
  const { user, loading, isAdmin } = useAuth();
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
    // User is not authenticated
    if (!user) {
      return <AuthForm />;
    }
    
    // User is authenticated but not an admin
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
              <CardDescription>
                No tienes permisos para acceder al panel de administración
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Solo los administradores pueden acceder a esta sección.
              </p>
              <button
                onClick={() => {
                  setIsAdminMode(false);
                  localStorage.removeItem('adminMode');
                  window.location.href = '/';
                }}
                className="text-primary hover:text-primary/80 text-sm underline"
              >
                Volver a la página principal
              </button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // User is authenticated and is an admin
    return <AdminDashboard />;
  }

  // Public voting page
  return <VotingPage />;
}