import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { ComunicaImport } from './ComunicaImport';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export function ComunicaRouter() {
  const { adminUser, loading, isAdmin } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Supabase no configurado</CardTitle>
            <CardDescription>
              Configura las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar esta sección.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </Card>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <Routes>
        <Route path="/*" element={<AuthForm />} />
      </Routes>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
            <CardDescription>
              Solo los administradores pueden acceder a esta sección.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              variant="link"
              onClick={() => { window.location.href = '/'; }}
            >
              Volver a la página principal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/*" element={<ComunicaImport />} />
    </Routes>
  );
}
