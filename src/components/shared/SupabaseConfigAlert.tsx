import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function SupabaseConfigAlert() {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>⚠️ Supabase no configurado</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          Para que la aplicación funcione correctamente, debes configurar las credenciales de Supabase.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Crea un archivo <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> en la raíz del proyecto</li>
          <li>Agrega tus credenciales de Supabase (URL y anon key)</li>
          <li>Ejecuta el script <code className="bg-muted px-1 py-0.5 rounded">setup-database.sql</code> en Supabase</li>
          <li>Reinicia el servidor de desarrollo</li>
        </ol>
        <a 
          href="https://github.com/mcmespana/mcmvotaciones/blob/main/SUPABASE_SETUP.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-sm font-medium hover:underline"
        >
          Ver guía completa de configuración
          <ExternalLink className="w-3 h-3" />
        </a>
      </AlertDescription>
    </Alert>
  );
}
