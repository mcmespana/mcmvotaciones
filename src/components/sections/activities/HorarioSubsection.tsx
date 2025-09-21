import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Calendar, Clock, MapPin, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Evento {
  hora?: string;
  icono: string;
  lugar: string;
  nombre: string;
  subtitulo: string;
  maps?: string;
  materiales?: boolean;
}

interface FechaEvento {
  fecha: string;
  titulo: string;
  eventos: Evento[];
}

interface HorarioSubsectionProps {
  data: { data: FechaEvento[]; updatedAt: string };
  onUpdate: (data: { data: FechaEvento[]; updatedAt: string }) => void;
}

export function HorarioSubsection({ data, onUpdate }: HorarioSubsectionProps) {
  const [editingFecha, setEditingFecha] = useState<{ index: number; fecha: FechaEvento } | null>(null);
  const [editingEvento, setEditingEvento] = useState<{ fechaIndex: number; eventoIndex: number; evento: Evento } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'fecha' | 'evento'>('fecha');

  const fechas = data?.data || [];

  const handleSaveFecha = (fechaData: Partial<FechaEvento>) => {
    if (editingFecha === null) return;

    const updatedFechas = [...fechas];
    if (editingFecha.index === -1) {
      // Nueva fecha
      updatedFechas.push({
        fecha: '',
        titulo: '',
        eventos: [],
        ...fechaData as FechaEvento,
      });
    } else {
      // Editar fecha existente
      updatedFechas[editingFecha.index] = {
        ...editingFecha.fecha,
        ...fechaData,
      };
    }

    onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
    setEditingFecha(null);
    setIsDialogOpen(false);
  };

  const handleSaveEvento = (eventoData: Partial<Evento>) => {
    if (editingEvento === null) return;

    const updatedFechas = [...fechas];
    const fecha = updatedFechas[editingEvento.fechaIndex];
    
    if (editingEvento.eventoIndex === -1) {
      // Nuevo evento
      fecha.eventos.push({
        icono: '📅',
        lugar: '',
        nombre: '',
        subtitulo: '',
        ...eventoData as Evento,
      });
    } else {
      // Editar evento existente
      fecha.eventos[editingEvento.eventoIndex] = {
        ...editingEvento.evento,
        ...eventoData,
      };
    }

    onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
    setEditingEvento(null);
    setIsDialogOpen(false);
  };

  const handleDeleteFecha = (index: number) => {
    const updatedFechas = fechas.filter((_, i) => i !== index);
    onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
  };

  const handleDeleteEvento = (fechaIndex: number, eventoIndex: number) => {
    const updatedFechas = [...fechas];
    updatedFechas[fechaIndex].eventos = updatedFechas[fechaIndex].eventos.filter((_, i) => i !== eventoIndex);
    onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
  };

  const handleDragEnd = (result: any, fechaIndex: number) => {
    if (!result.destination) return;

    const updatedFechas = [...fechas];
    const eventos = Array.from(updatedFechas[fechaIndex].eventos);
    const [reorderedItem] = eventos.splice(result.source.index, 1);
    eventos.splice(result.destination.index, 0, reorderedItem);
    updatedFechas[fechaIndex].eventos = eventos;

    onUpdate({ data: updatedFechas, updatedAt: new Date().toISOString() });
  };

  const FechaDialog = () => {
    const [formData, setFormData] = useState({
      fecha: editingFecha?.fecha.fecha || '',
      titulo: editingFecha?.fecha.titulo || '',
    });

    return (
      <Dialog open={isDialogOpen && dialogType === 'fecha'} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFecha?.index === -1 ? 'Nueva Fecha' : 'Editar Fecha'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSaveFecha(formData)}>
                {editingFecha?.index === -1 ? 'Crear' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const EventoDialog = () => {
    const [formData, setFormData] = useState({
      hora: editingEvento?.evento.hora || '',
      icono: editingEvento?.evento.icono || '📅',
      lugar: editingEvento?.evento.lugar || '',
      nombre: editingEvento?.evento.nombre || '',
      subtitulo: editingEvento?.evento.subtitulo || '',
      maps: editingEvento?.evento.maps || '',
      materiales: editingEvento?.evento.materiales || false,
    });

    return (
      <Dialog open={isDialogOpen && dialogType === 'evento'} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEvento?.eventoIndex === -1 ? 'Nuevo Evento' : 'Editar Evento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre del Evento</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hora">Hora</Label>
                <Input
                  id="hora"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  placeholder="08:40"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icono">Icono (emoji)</Label>
                <Input
                  id="icono"
                  value={formData.icono}
                  onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lugar">Lugar</Label>
                <Input
                  id="lugar"
                  value={formData.lugar}
                  onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="subtitulo">Subtítulo/Descripción</Label>
              <Textarea
                id="subtitulo"
                value={formData.subtitulo}
                onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="maps">Enlace de Maps (opcional)</Label>
              <Input
                id="maps"
                value={formData.maps}
                onChange={(e) => setFormData({ ...formData, maps: e.target.value })}
                placeholder="https://maps.app.goo.gl/..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="materiales"
                checked={formData.materiales}
                onChange={(e) => setFormData({ ...formData, materiales: e.target.checked })}
              />
              <Label htmlFor="materiales">Tiene materiales asociados</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSaveEvento(formData)}>
                {editingEvento?.eventoIndex === -1 ? 'Crear' : 'Guardar'}
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
          <h3 className="text-lg font-semibold">Horario de Eventos</h3>
          <p className="text-sm text-muted-foreground">
            {fechas.length} fechas programadas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingFecha({ index: -1, fecha: { fecha: '', titulo: '', eventos: [] } });
            setDialogType('fecha');
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Fecha
        </Button>
      </div>

      <div className="space-y-6">
        {fechas.map((fecha, fechaIndex) => (
          <Card key={fechaIndex} className="overflow-hidden">
            <CardHeader className="bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{fecha.titulo}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(fecha.fecha).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingEvento({ fechaIndex, eventoIndex: -1, evento: { icono: '📅', lugar: '', nombre: '', subtitulo: '' } });
                      setDialogType('evento');
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFecha({ index: fechaIndex, fecha });
                      setDialogType('fecha');
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFecha(fechaIndex)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, fechaIndex)}>
                <Droppable droppableId={`fecha-${fechaIndex}`}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {fecha.eventos.map((evento, eventoIndex) => (
                        <Draggable key={eventoIndex} draggableId={`${fechaIndex}-${eventoIndex}`} index={eventoIndex}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border-b border-border/50 p-4 hover:bg-muted/10 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                                </div>
                                
                                <div className="text-2xl">{evento.icono}</div>
                                
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-medium">{evento.nombre}</h4>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {evento.subtitulo}
                                      </p>
                                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        {evento.hora && (
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{evento.hora}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-4 h-4" />
                                          <span>{evento.lugar}</span>
                                        </div>
                                        {evento.maps && (
                                          <a
                                            href={evento.maps}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                          >
                                            Ver mapa
                                          </a>
                                        )}
                                        {evento.materiales && (
                                          <span className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs">
                                            Con materiales
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingEvento({ fechaIndex, eventoIndex, evento });
                                          setDialogType('evento');
                                          setIsDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteEvento(fechaIndex, eventoIndex)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {fecha.eventos.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No hay eventos para esta fecha
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {fechas.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay fechas programadas</p>
        </Card>
      )}

      <FechaDialog />
      <EventoDialog />
    </div>
  );
}