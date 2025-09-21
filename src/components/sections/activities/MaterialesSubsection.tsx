import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Calendar, ArrowLeft, FileText } from 'lucide-react';

interface Pagina {
  titulo: string;
  texto: string;
}

interface Actividad {
  color: string;
  emoji: string;
  nombre: string;
  paginas: Pagina[];
}

interface FechaMaterial {
  fecha: string;
  actividades: Actividad[];
}

interface MaterialesSubsectionProps {
  data: { data: FechaMaterial[]; updatedAt: string };
  onUpdate: (data: { data: FechaMaterial[]; updatedAt: string }) => void;
}

export function MaterialesSubsection({ data, onUpdate }: MaterialesSubsectionProps) {
  const [selectedFecha, setSelectedFecha] = useState<number | null>(null);
  const [selectedActividad, setSelectedActividad] = useState<{ fechaIndex: number; actividadIndex: number } | null>(null);
  const [editingActividad, setEditingActividad] = useState<{ fechaIndex: number; actividadIndex: number; actividad: Actividad } | null>(null);
  const [editingPagina, setEditingPagina] = useState<{ fechaIndex: number; actividadIndex: number; paginaIndex: number; pagina: Pagina } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'fecha' | 'actividad' | 'pagina'>('fecha');

  const fechas = data?.data || [];

  const handleSaveFecha = (fechaData: { fecha: string }) => {
    const newFecha: FechaMaterial = {
      fecha: fechaData.fecha,
      actividades: [],
    };

    onUpdate({
      data: [...fechas, newFecha],
      updatedAt: new Date().toISOString(),
    });
    setIsDialogOpen(false);
  };

  const handleSaveActividad = (actividadData: Partial<Actividad>) => {
    if (editingActividad === null) return;

    const updatedFechas = [...fechas];
    if (editingActividad.actividadIndex === -1) {
      // Nueva actividad
      updatedFechas[editingActividad.fechaIndex].actividades.push({
        color: '#00ACC1',
        emoji: '📝',
        nombre: '',
        paginas: [],
        ...actividadData as Actividad,
      });
    } else {
      // Editar actividad existente
      updatedFechas[editingActividad.fechaIndex].actividades[editingActividad.actividadIndex] = {
        ...editingActividad.actividad,
        ...actividadData,
      };
    }

    onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
    setEditingActividad(null);
    setIsDialogOpen(false);
  };

  const handleSavePagina = (paginaData: Partial<Pagina>) => {
    if (editingPagina === null) return;

    const updatedFechas = [...fechas];
    const actividad = updatedFechas[editingPagina.fechaIndex].actividades[editingPagina.actividadIndex];
    
    if (editingPagina.paginaIndex === -1) {
      // Nueva página
      actividad.paginas.push({
        titulo: '',
        texto: '',
        ...paginaData as Pagina,
      });
    } else {
      // Editar página existente
      actividad.paginas[editingPagina.paginaIndex] = {
        ...editingPagina.pagina,
        ...paginaData,
      };
    }

    onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
    setEditingPagina(null);
    setIsDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Vista de páginas de una actividad
  if (selectedActividad) {
    const actividad = fechas[selectedActividad.fechaIndex].actividades[selectedActividad.actividadIndex];
    
    const PaginaDialog = () => {
      const [formData, setFormData] = useState({
        titulo: editingPagina?.pagina.titulo || '',
        texto: editingPagina?.pagina.texto || '',
      });

      return (
        <Dialog open={isDialogOpen && dialogType === 'pagina'} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPagina?.paginaIndex === -1 ? 'Nueva Página' : 'Editar Página'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="texto">Contenido</Label>
                <Textarea
                  id="texto"
                  value={formData.texto}
                  onChange={(e) => setFormData({ ...formData, texto: e.target.value })}
                  className="min-h-[400px] font-mono"
                  placeholder="Escribe el contenido de la página. Puedes usar [b]texto[/b] para negritas, [br] para saltos de línea, [list][*]item[/list] para listas..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: [b]negrita[/b], [br] = salto de línea, [list][*]item[/list] = lista
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSavePagina(formData)}>
                  {editingPagina?.paginaIndex === -1 ? 'Crear' : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedActividad(null)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{actividad.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold">{actividad.nombre}</h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(fechas[selectedActividad.fechaIndex].fecha)}
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingPagina({
                fechaIndex: selectedActividad.fechaIndex,
                actividadIndex: selectedActividad.actividadIndex,
                paginaIndex: -1,
                pagina: { titulo: '', texto: '' },
              });
              setDialogType('pagina');
              setIsDialogOpen(true);
            }}
            className="gap-2 ml-auto"
          >
            <Plus className="w-4 h-4" />
            Nueva Página
          </Button>
        </div>

        <div className="grid gap-4">
          {actividad.paginas.map((pagina, paginaIndex) => (
            <Card key={paginaIndex} className="transition-all hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">{pagina.titulo}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPagina({
                          fechaIndex: selectedActividad.fechaIndex,
                          actividadIndex: selectedActividad.actividadIndex,
                          paginaIndex,
                          pagina,
                        });
                        setDialogType('pagina');
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedFechas = [...fechas];
                        updatedFechas[selectedActividad.fechaIndex].actividades[selectedActividad.actividadIndex].paginas = 
                          updatedFechas[selectedActividad.fechaIndex].actividades[selectedActividad.actividadIndex].paginas.filter((_, i) => i !== paginaIndex);
                        onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-sm line-clamp-3">
                    {pagina.texto}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {actividad.paginas.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No hay páginas en esta actividad</p>
          </Card>
        )}

        <PaginaDialog />
      </div>
    );
  }

  // Vista de actividades de una fecha
  if (selectedFecha !== null) {
    const fecha = fechas[selectedFecha];
    
    const ActividadDialog = () => {
      const [formData, setFormData] = useState({
        nombre: editingActividad?.actividad.nombre || '',
        emoji: editingActividad?.actividad.emoji || '📝',
        color: editingActividad?.actividad.color || '#00ACC1',
      });

      return (
        <Dialog open={isDialogOpen && dialogType === 'actividad'} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingActividad?.actividadIndex === -1 ? 'Nueva Actividad' : 'Editar Actividad'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emoji">Emoji</Label>
                  <Input
                    id="emoji"
                    value={formData.emoji}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSaveActividad(formData)}>
                  {editingActividad?.actividadIndex === -1 ? 'Crear' : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedFecha(null)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Fechas
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">{formatDate(fecha.fecha)}</h3>
          </div>
          <Button
            onClick={() => {
              setEditingActividad({
                fechaIndex: selectedFecha,
                actividadIndex: -1,
                actividad: { color: '#00ACC1', emoji: '📝', nombre: '', paginas: [] },
              });
              setDialogType('actividad');
              setIsDialogOpen(true);
            }}
            className="gap-2 ml-auto"
          >
            <Plus className="w-4 h-4" />
            Nueva Actividad
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {fecha.actividades.map((actividad, actividadIndex) => (
            <Card
              key={actividadIndex}
              className="cursor-pointer transition-all hover:border-primary/30 hover:bg-card/80"
              onClick={() => setSelectedActividad({ fechaIndex: selectedFecha, actividadIndex })}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{actividad.emoji}</span>
                    <div>
                      <h4 className="font-semibold">{actividad.nombre}</h4>
                      <p className="text-sm text-muted-foreground">
                        {actividad.paginas.length} páginas
                      </p>
                    </div>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: actividad.color }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingActividad({
                      fechaIndex: selectedFecha,
                      actividadIndex,
                      actividad,
                    });
                    setDialogType('actividad');
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {fecha.actividades.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No hay actividades para esta fecha</p>
          </Card>
        )}

        <ActividadDialog />
      </div>
    );
  }

  // Vista principal de fechas
  const FechaDialog = () => {
    const [formData, setFormData] = useState({ fecha: '' });

    return (
      <Dialog open={isDialogOpen && dialogType === 'fecha'} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Fecha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ fecha: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSaveFecha(formData)}>
                Crear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Materiales por Fecha</h3>
          <p className="text-sm text-muted-foreground">
            {fechas.length} fechas con materiales
          </p>
        </div>
        <Button
          onClick={() => {
            setDialogType('fecha');
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Fecha
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fechas.map((fecha, index) => (
          <Card
            key={index}
            className="cursor-pointer transition-all hover:border-primary/30 hover:bg-card/80"
            onClick={() => setSelectedFecha(index)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <h4 className="font-semibold">
                    {formatDate(fecha.fecha)}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {fecha.actividades.length} actividades
                  </p>
                </div>
              </div>
              <div className="flex -space-x-2">
                {fecha.actividades.slice(0, 3).map((actividad, i) => (
                  <span
                    key={i}
                    className="text-lg border-2 border-background rounded-full"
                  >
                    {actividad.emoji}
                  </span>
                ))}
                {fecha.actividades.length > 3 && (
                  <span className="text-xs bg-muted rounded-full w-6 h-6 flex items-center justify-center border-2 border-background">
                    +{fecha.actividades.length - 3}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {fechas.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay materiales configurados</p>
        </Card>
      )}

      <FechaDialog />
    </div>
  );
}