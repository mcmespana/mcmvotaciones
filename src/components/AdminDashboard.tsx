import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Vote, 
  Calendar, 
  Settings, 
  LogOut, 
  Plus,
  BarChart3,
  Download 
} from 'lucide-react';

interface DashboardStats {
  totalRounds: number;
  activeRounds: number;
  totalVotes: number;
  totalCandidates: number;
}

export function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalRounds: 0,
    activeRounds: 0,
    totalVotes: 0,
    totalCandidates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Get rounds stats
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, is_active, is_closed');

      if (roundsError) {
        console.error('Error loading rounds:', roundsError);
        // Continue with other stats even if this fails
      }

      // Get votes count
      const { count: votesCount, error: votesError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });

      if (votesError) {
        console.error('Error loading votes:', votesError);
      }

      // Get candidates count
      const { count: candidatesCount, error: candidatesError } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      if (candidatesError) {
        console.error('Error loading candidates:', candidatesError);
      }

      // Calculate stats
      const totalRounds = rounds?.length || 0;
      const activeRounds = rounds?.filter(r => r.is_active && !r.is_closed).length || 0;

      setStats({
        totalRounds,
        activeRounds,
        totalVotes: votesCount || 0,
        totalCandidates: candidatesCount || 0,
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Error al cerrar sesión',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando panel...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-sm text-muted-foreground">
              Bienvenido, {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Votaciones Totales
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRounds}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeRounds} activas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Votos Emitidos
              </CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVotes}</div>
              <p className="text-xs text-muted-foreground">
                Total acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Candidatos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCandidates}</div>
              <p className="text-xs text-muted-foreground">
                En todas las rondas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Estado del Sistema
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">●</div>
              <p className="text-xs text-muted-foreground">
                Sistema operativo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Nueva Votación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Crear una nueva ronda de votación con candidatos
              </p>
              <Button className="w-full">
                Crear Votación
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Ver Resultados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Consultar los resultados de las votaciones
              </p>
              <Button variant="outline" className="w-full">
                Ver Resultados
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Exportar Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Descargar resultados en formato Excel o JSON
              </p>
              <Button variant="outline" className="w-full">
                Exportar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividad reciente</p>
              <p className="text-sm">Las acciones aparecerán aquí cuando se realicen</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}