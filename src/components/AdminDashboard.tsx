import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from './UserManagement';
import { AdminVotingList } from './AdminVotingList';
import { 
  Users, 
  Vote, 
  Calendar, 
  Settings, 
  LogOut, 
  Plus,
  BarChart3,
  Download,
  Shield
} from 'lucide-react';

interface DashboardStats {
  totalRounds: number;
  activeRounds: number;
  totalVotes: number;
  totalCandidates: number;
}

export function AdminDashboard() {
  const { adminUser, isSuperAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalRounds: 0,
    activeRounds: 0,
    totalVotes: 0,
    totalCandidates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadDashboardStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Get rounds stats
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, is_active, is_closed');

      if (roundsError) {
        // Error loading rounds
        // Continue with other stats even if this fails
      }

      // Get votes count
      const { count: votesCount, error: votesError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });

      if (votesError) {
        // Error loading votes
      }

      // Get candidates count
      const { count: candidatesCount, error: candidatesError } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      if (candidatesError) {
        // Error loading candidates
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

    } catch (error: unknown) {
      // Provide more specific error messages
      let errorMessage = 'No se pudieron cargar las estadísticas';
      if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
        errorMessage = 'Error de permisos: Para desarrollo, ejecuta reset-database.sql en Supabase. Para producción, revisa las políticas RLS y permisos de usuario.';
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
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

  const handleNewVotation = () => {
    setActiveTab('votaciones');
    toast({
      title: 'Nueva Votación',
      description: 'Redirigiendo a la gestión de votaciones...',
    });
  };

  const handleExportData = async () => {
    try {
      // Get all voting data
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          id, title, description, is_active, is_closed, created_at,
          candidates!candidates_round_id_fkey (
            id, name, description, order_index,
            votes!votes_candidate_id_fkey (id, device_hash, created_at)
          )
        `);

      if (roundsError) {
        toast({
          title: 'Error',
          description: 'No se pudieron exportar los datos',
          variant: 'destructive',
        });
        return;
      }

      if (!rounds || rounds.length === 0) {
        toast({
          title: 'Sin datos',
          description: 'No hay datos para exportar',
        });
        return;
      }

      // Create export data
      const exportData = {
        timestamp: new Date().toISOString(),
        stats: stats,
        rounds: rounds.map(round => ({
          ...round,
          totalVotes: round.candidates.reduce((sum, c) => sum + (c.votes?.length || 0), 0),
          candidates: round.candidates.map(candidate => ({
            ...candidate,
            voteCount: candidate.votes?.length || 0,
            votes: candidate.votes?.map(vote => ({
              id: vote.id,
              timestamp: vote.created_at
              // device_hash excluded for privacy
            }))
          }))
        }))
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `votaciones-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Exportación completada',
        description: 'Los datos se han descargado correctamente',
      });
    } catch (error) {
      // Error exporting data
      toast({
        title: 'Error',
        description: 'Error al exportar los datos',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando panel...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-canvas min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-outline-variant/55 bg-surface-container-lowest/85 backdrop-blur-xl dark:border-outline-variant/65 dark:bg-surface-container-low/82">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6 xl:px-8">
          <div>
            <h1 className="font-headline text-3xl font-black tracking-tight">Panel de Administracion</h1>
            <p className="text-sm text-muted-foreground">
              Bienvenido, {adminUser?.name} ({adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'})
            </p>
          </div>
          <Button variant="outline" className="bg-surface-container-lowest/80" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl space-y-6 p-4 sm:p-6 xl:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={`grid h-12 w-full items-center rounded-2xl border border-outline-variant/55 bg-surface-container-lowest/88 p-1 dark:border-outline-variant/65 dark:bg-surface-container-low/86 ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}
          >
            <TabsTrigger value="dashboard" className="flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="votaciones" className="flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold">
              <Vote className="w-4 h-4" />
              Votaciones
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="usuarios" className="flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold">
                <Shield className="w-4 h-4" />
                Usuarios
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="admin-shell">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Votaciones Totales
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="font-headline text-4xl font-black tracking-tight">{stats.totalRounds}</div>
                  <p className="admin-chip mt-2 inline-flex">
                    {stats.activeRounds} activas
                  </p>
                </CardContent>
              </Card>

              <Card className="admin-shell">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Votos Emitidos
                  </CardTitle>
                  <Vote className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="font-headline text-4xl font-black tracking-tight">{stats.totalVotes}</div>
                  <p className="admin-chip mt-2 inline-flex">
                    Total acumulado
                  </p>
                </CardContent>
              </Card>

              <Card className="admin-shell">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Candidatos
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="font-headline text-4xl font-black tracking-tight">{stats.totalCandidates}</div>
                  <p className="admin-chip mt-2 inline-flex">
                    En todas las rondas
                  </p>
                </CardContent>
              </Card>

              <Card className="admin-shell">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Estado del Sistema
                  </CardTitle>
                  <Settings className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="font-headline text-4xl font-black tracking-tight text-emerald-500">●</div>
                  <p className="admin-chip mt-2 inline-flex">
                    Sistema operativo
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="admin-shell cursor-pointer transition-colors hover:border-primary/45">
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
                  <Button className="w-full" onClick={handleNewVotation}>
                    Crear Votación
                  </Button>
                </CardContent>
              </Card>

              <Card className="admin-shell cursor-pointer transition-colors hover:border-primary/45">
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
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('votaciones')}>
                    Ver Resultados
                  </Button>
                </CardContent>
              </Card>

              <Card className="admin-shell cursor-pointer transition-colors hover:border-primary/45">
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
                  <Button variant="outline" className="w-full" onClick={handleExportData}>
                    Exportar
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="admin-shell">
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
          </TabsContent>

          <TabsContent value="votaciones" className="space-y-6">
            <AdminVotingList />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="usuarios" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}