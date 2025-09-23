import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Vote, 
  Settings, 
  Users, 
  Database, 
  Zap, 
  Plus,
  Play,
  Pause,
  Calendar,
  BarChart3,
  Download,
  LogOut,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

interface MockRound {
  id: string;
  title: string;
  description: string;
  year: number;
  team: string;
  expected_voters: number;
  is_active: boolean;
  is_closed: boolean;
  created_at: string;
  vote_count: number;
  candidates: Array<{
    id: string;
    name: string;
    surname: string;
    description: string;
    order_index: number;
  }>;
}

// Mock data for demonstration
const mockRounds: MockRound[] = [
  {
    id: '1',
    title: 'Votación MCM 2024 - Consejo Directivo',
    description: 'Elección de nuevos miembros del consejo directivo para el período 2024-2025',
    year: 2024,
    team: 'Consejo Directivo',
    expected_voters: 150,
    is_active: true,
    is_closed: false,
    created_at: '2024-01-15T10:00:00Z',
    vote_count: 87,
    candidates: [
      {
        id: '1-1',
        name: 'Ana García Rodríguez',
        description: 'Candidata con 5 años de experiencia en gestión empresarial',
        image_url: null,
        order_index: 1
      },
      {
        id: '1-2',
        name: 'Carlos Mendoza López',
        description: 'Ingeniero con especialización en desarrollo de proyectos',
        image_url: null,
        order_index: 2
      },
      {
        id: '1-3',
        name: 'María Elena Torres',
        description: 'Abogada especialista en derecho corporativo',
        image_url: null,
        order_index: 3
      }
    ]
  },
  {
    id: '2',
    title: 'Votación MCM 2024 - Mejor Proyecto',
    description: 'Selección del proyecto más innovador del año',
    year: 2024,
    team: 'Proyectos',
    expected_voters: 75,
    is_active: false,
    is_closed: false,
    created_at: '2024-01-10T09:00:00Z',
    vote_count: 0,
    candidates: [
      {
        id: '2-1',
        name: 'Proyecto Verde',
        description: 'Iniciativa de sostenibilidad ambiental',
        image_url: null,
        order_index: 1
      },
      {
        id: '2-2',
        name: 'Innovación Digital',
        description: 'Transformación digital de procesos internos',
        image_url: null,
        order_index: 2
      }
    ]
  },
  {
    id: '3',
    title: 'Votación MCM 2023 - Empleado del Año',
    description: 'Reconocimiento al empleado destacado del año anterior',
    year: 2023,
    team: 'Recursos Humanos',
    expected_voters: 120,
    is_active: false,
    is_closed: true,
    created_at: '2023-12-01T08:00:00Z',
    vote_count: 118,
    candidates: [
      {
        id: '3-1',
        name: 'Roberto Silva',
        description: 'Desarrollador senior con excelente desempeño',
        image_url: null,
        order_index: 1
      },
      {
        id: '3-2',
        name: 'Laura Fernández',
        description: 'Especialista en marketing digital',
        image_url: null,
        order_index: 2
      },
      {
        id: '3-3',
        name: 'Pedro Martínez',
        description: 'Coordinador de ventas con resultados excepcionales',
        image_url: null,
        order_index: 3
      }
    ]
  }
];

const mockStats = {
  totalRounds: 3,
  activeRounds: 1,
  totalVotes: 205,
  totalCandidates: 8
};

export function DemoAdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRound, setSelectedRound] = useState(mockRounds[0]);

  const getRoundStatusBadge = (round: MockRound) => {
    if (round.is_closed) {
      return <Badge variant="secondary">Cerrada</Badge>;
    }
    if (round.is_active) {
      return <Badge variant="default">Activa</Badge>;
    }
    return <Badge variant="outline">Inactiva</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <p className="text-center text-sm text-blue-700 dark:text-blue-300">
            <strong>MODO DEMO</strong> - Esta es una vista previa del panel de administración con datos de ejemplo
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-sm text-muted-foreground">
              Bienvenido, Admin Demo (Super Admin)
            </p>
          </div>
          <Button variant="outline" disabled>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="votaciones" className="flex items-center gap-2">
              <Vote className="w-4 h-4" />
              Votaciones
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Usuarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
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
                  <div className="text-2xl font-bold">{mockStats.totalRounds}</div>
                  <p className="text-xs text-muted-foreground">
                    {mockStats.activeRounds} activas
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
                  <div className="text-2xl font-bold">{mockStats.totalVotes}</div>
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
                  <div className="text-2xl font-bold">{mockStats.totalCandidates}</div>
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
                  <Button className="w-full" onClick={() => setActiveTab('votaciones')}>
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
                  <Button variant="outline" className="w-full" disabled>
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
                  <Button variant="outline" className="w-full" disabled>
                    Exportar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="votaciones" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gestión de Votaciones</h2>
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Votación
                </Button>
              </div>

              <Tabs defaultValue="rounds" className="w-full">
                <TabsList>
                  <TabsTrigger value="rounds">Votaciones</TabsTrigger>
                  <TabsTrigger value="candidates">
                    Candidatos ({selectedRound?.candidates.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoreo</TabsTrigger>
                </TabsList>

                <TabsContent value="rounds" className="space-y-4">
                  <div className="grid gap-4">
                    {mockRounds.map((round) => (
                      <Card key={round.id} className={`transition-colors cursor-pointer ${selectedRound?.id === round.id ? 'border-primary' : 'hover:border-primary/50'}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg">{round.title}</CardTitle>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{round.team}</span>
                                <span>•</span>
                                <span>{round.year}</span>
                                {getRoundStatusBadge(round)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRound(selectedRound?.id === round.id ? mockRounds[0] : round)}
                              >
                                {selectedRound?.id === round.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              {!round.is_closed && (
                                <Button
                                  variant={round.is_active ? "destructive" : "default"}
                                  size="sm"
                                  disabled
                                >
                                  {round.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                              )}
                              <Button variant="outline" size="sm" disabled>
                                <Users className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Candidatos:</span>
                              <p className="font-medium">{round.candidates.length}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Votos:</span>
                              <p className="font-medium">{round.vote_count || 0}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Esperados:</span>
                              <p className="font-medium">{round.expected_voters}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Participación:</span>
                              <p className="font-medium">
                                {round.expected_voters > 0 
                                  ? `${Math.round(((round.vote_count || 0) / round.expected_voters) * 100)}%`
                                  : '0%'
                                }
                              </p>
                            </div>
                          </div>
                          {round.description && (
                            <p className="text-muted-foreground mt-3">{round.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="candidates" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">
                        Candidatos para: {selectedRound?.title}
                      </h3>
                      <Button disabled>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Candidato
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {selectedRound?.candidates.map((candidate) => (
                        <Card key={candidate.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{candidate.name}</CardTitle>
                              <Button variant="outline" size="sm" disabled>
                                <Users className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          {candidate.description && (
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                {candidate.description}
                              </p>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monitoreo en Tiempo Real</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockRounds.filter(r => r.is_active).map((round) => (
                          <div key={round.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">{round.title}</h4>
                              <Badge variant="default">Activa</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Votos actuales:</span>
                                <p className="text-2xl font-bold">{round.vote_count || 0}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Meta esperada:</span>
                                <p className="text-2xl font-bold">{round.expected_voters}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Participación:</span>
                                <p className="text-2xl font-bold">
                                  {round.expected_voters > 0 
                                    ? `${Math.round(((round.vote_count || 0) / round.expected_voters) * 100)}%`
                                    : '0%'
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button variant="outline" size="sm" disabled>
                                <Pause className="w-4 h-4 mr-2" />
                                Pausar
                              </Button>
                              <Button variant="destructive" size="sm" disabled>
                                <Vote className="w-4 h-4 mr-2" />
                                Cerrar Votación
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Usuarios (Demo)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidad de gestión de usuarios</p>
                  <p className="text-sm">Disponible en la versión completa con Supabase configurado</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}