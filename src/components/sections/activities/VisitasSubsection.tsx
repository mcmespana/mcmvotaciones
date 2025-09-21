import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Calendar, ExternalLink } from 'lucide-react';

interface Visita {
  titulo: string;
  subtitulo: string;
  texto: string;
  imagen: string;
  mapa: string;
  fecha?: string;
}

interface VisitasSubsectionProps {
  data: { data: Visita[]; updatedAt: string };
  onUpdate: (data: { data: Visita[]; updatedAt: string }) => void;
}

export function VisitasSubsection({ data, onUpdate }: VisitasSubsectionProps) {
  const [editingVisita, setEditingVisita] = useState<{ index: number; visita: Visita } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const visitas = data?.data || [];

  const handleSave = (visitaData: Partial<Visita>) => {
    if (editingVisita === null) return;

    const updatedVisitas = [...visitas];
    if (editingVisita.index === -1) {
      // Nueva visita
      updatedVisitas.push({
        titulo: '',
        subtitulo: '',
        texto: '',
        imagen: '',
        mapa: '',
        ...visitaData as Visita,
      });
    } else {
      // Editar visita existente
      updatedVisitas[editingVisita.index] = {
        ...editingVisita.visita,
        ...visitaData,
      };
    }

    onUpdate({ data: updatedVisitas, updatedAt: new Date().toISOString() });
    setEditingVisita(null);
    setIsDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    const updatedVisitas = visitas.filter((_, i) => i !== index);
    onUpdate({ data: updatedVisitas, updatedAt: new Date().toISOString() });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const VisitaDialog = () => {
    const [formData, setFormData] = useState({
      titulo: editingVisita?.visita.titulo || '',
      subtitulo: editingVisita?.visita.subtitulo || '',
      texto: editingVisita?.visita.texto || '',
      imagen: editingVisita?.visita.imagen || '',
      mapa: editingVisita?.visita.mapa || '',
      fecha: editingVisita?.visita.fecha || '',
    });

    return (
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingVisita?.index === -1 ? 'Nueva Visita' : 'Editar Visita'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fecha">Fecha (opcional)</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subtitulo">Subtítulo</Label>
            <Input
              id="subtitulo"
              value={formData.subtitulo}
              onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="imagen">URL de la Imagen</Label>
            <Input
              id="imagen"
              value={formData.imagen}
              onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          <div>
            <Label htmlFor="mapa">Enlace del Mapa</Label>
            <Input
              id="mapa"
              value={formData.mapa}
              onChange={(e) => setFormData({ ...formData, mapa: e.target.value })}
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>

          <div>
            <Label htmlFor="texto">Descripción</Label>
            <Textarea
              id="texto"
              value={formData.texto}
              onChange={(e) => setFormData({ ...formData, texto: e.target.value })}
              className="min-h-[200px]"
              placeholder="Descripción detallada de la visita..."
            />
          </div>

          {/* Preview de la imagen */}
          {formData.imagen && (
            <div>
              <Label>Vista Previa de la Imagen</Label>
              <div className="mt-2">
                <img
                  src={formData.imagen}
                  alt="Preview"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleSave(formData)}>
              {editingVisita?.index === -1 ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Visitas y Lugares</h3>
          <p className="text-sm text-muted-foreground">
            {visitas.length} visitas configuradas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setEditingVisita({ index: -1, visita: { titulo: '', subtitulo: '', texto: '', imagen: '', mapa: '' } })}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Visita
            </Button>
          </DialogTrigger>
          <VisitaDialog />
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {visitas.map((visita, index) => (
          <Card key={index} className="overflow-hidden transition-all hover:border-primary/30">
            {/* Imagen de la visita */}
            {visita.imagen && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={visita.imagen}
                  alt={visita.titulo}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.parentElement!.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{visita.titulo}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {visita.subtitulo}
                  </p>
                  
                  {/* Fecha si existe */}
                  {visita.fecha && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(visita.fecha)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingVisita({ index, visita });
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Descripción */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm whitespace-pre-wrap line-clamp-4">
                    {visita.texto}
                  </p>
                </div>
                
                {/* Enlace del mapa */}
                {visita.mapa && (
                  <div>
                    <a
                      href={visita.mapa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <MapPin className="w-4 h-4" />
                      Ver en el mapa
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {visitas.length === 0 && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <MapPin className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay visitas configuradas</p>
          </div>
        </Card>
      )}
    </div>
  );
}