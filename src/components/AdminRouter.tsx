import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { AdminDashboard } from './AdminDashboard';
import { DemoPage } from './DemoPage';
import { DemoAdminDashboard } from './DemoAdminDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Shield } from 'lucide-react';

export function AdminRouter() {
  const { adminUser, loading, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Set admin mode in localStorage when accessing admin routes
    localStorage.setItem('adminMode', 'true');
    
    // Clean up when component unmounts
    return () => {
      // Only remove if we're actually leaving admin routes
      if (!location.pathname.startsWith('/admin')) {
        localStorage.removeItem('adminMode');
      }
    };
  }, [location.pathname]);

  // Show demo page if Supabase is not configured
  if (!isSupabaseConfigured) {
    return (
      <Routes>
        <Route path="/demo" element={<DemoAdminDashboard />} />
        <Route path="/*" element={<DemoPage />} />
      </Routes>
    );
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

  // User is not authenticated
  if (!adminUser) {
    return (
      <Routes>
        <Route path="/*" element={<AuthForm />} />
      </Routes>
    );
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
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}