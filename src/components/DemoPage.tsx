import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Vote, Settings, Users, Database, Zap } from 'lucide-react';

export function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="mb-4">
            <Vote className="w-16 h-16 mx-auto text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">MCM Votaciones</h1>
          <p className="text-xl text-muted-foreground">
            Sistema de votaciones internas basado en Supabase y Vercel
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Configuration Notice */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Settings className="w-5 h-5" />
              Configuración Requerida
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-700 dark:text-yellow-300">
            <p className="mb-4">
              Para usar el sistema de votaciones, necesitas configurar Supabase:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Crear un proyecto en <a href="https://supabase.com" className="underline" target="_blank" rel="noopener noreferrer">Supabase</a></li>
              <li>Ejecutar el script <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">supabase-schema.sql</code></li>
              <li>Configurar las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY</li>
              <li>Crear tu primer usuario administrador</li>
            </ol>
            <p className="mt-4 text-sm">
              Ver <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">README.md</code> para instrucciones detalladas.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-primary" />
                Votación Pública
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Interfaz responsive y móvil para que los usuarios voten de manera sencilla y segura.
              </p>
              <ul className="text-sm space-y-1">
                <li>✓ Sin necesidad de registro</li>
                <li>✓ Prevención de votos duplicados</li>
                <li>✓ Optimizada para móviles</li>
                <li>✓ Interfaz intuitiva</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Panel de Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Dashboard completo para gestionar votaciones, candidatos y consultar resultados.
              </p>
              <ul className="text-sm space-y-1">
                <li>✓ Autenticación segura</li>
                <li>✓ Gestión de rondas</li>
                <li>✓ Control de candidatos</li>
                <li>✓ Exportación de datos</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Base de Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                PostgreSQL con Supabase, incluyendo seguridad a nivel de fila y políticas granulares.
              </p>
              <ul className="text-sm space-y-1">
                <li>✓ Row Level Security (RLS)</li>
                <li>✓ Políticas de acceso</li>
                <li>✓ Histórico de votaciones</li>
                <li>✓ Backup automático</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Demo Screenshots Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Capturas del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-muted rounded-lg p-8 text-center">
                <Vote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Página de Votación</h3>
                <p className="text-sm text-muted-foreground">
                  Interfaz limpia y responsive para seleccionar candidatos
                </p>
              </div>
              <div className="bg-muted rounded-lg p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Panel de Administración</h3>
                <p className="text-sm text-muted-foreground">
                  Dashboard con estadísticas y gestión completa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Stack Tecnológico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-center">
              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-1">Frontend</div>
                <div className="text-sm text-muted-foreground">React + TypeScript + Vite</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-1">Backend</div>
                <div className="text-sm text-muted-foreground">Supabase (PostgreSQL)</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-1">UI/UX</div>
                <div className="text-sm text-muted-foreground">Tailwind + shadcn/ui</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-1">Deploy</div>
                <div className="text-sm text-muted-foreground">Vercel</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8 text-muted-foreground">
          <p>Sistema de votaciones MCM - Desarrollado con ❤️ para la comunidad</p>
        </div>
      </div>
    </div>
  );
}