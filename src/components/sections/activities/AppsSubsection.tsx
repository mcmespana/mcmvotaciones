import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface App {
  androidLink: string;
  androidScheme: string;
  descripcion: string;
  icono: string;
  iosLink: string;
  iosScheme: string;
  nombre: string;
  orden: number;
  tipo: 'Necesaria' | 'Opcional';
}

interface AppsSubsectionProps {
  data: { data: App[]; updatedAt: string };
  onUpdate: (data: { data: App[]; updatedAt: string }) => void;
}

export function AppsSubsection({ data, onUpdate }: AppsSubsectionProps) {
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const apps = data?.data || [];

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(apps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedApps = items.map((app, index) => ({
      ...app,
      orden: index + 1,
    }));

    onUpdate({ data: updatedApps, updatedAt: new Date().toISOString() });
  };

  const handleSave = (appData: Partial<App>) => {
    if (editingApp) {
      const updatedApps = apps.map(app => 
        app.orden === editingApp.orden ? { ...app, ...appData } : app
      );
      onUpdate({ data: updatedApps, updatedAt: new Date().toISOString() });
    } else {
      const newApp: App = {
        androidLink: '',
        androidScheme: '',
        descripcion: '',
        icono: '',
        iosLink: '',
        iosScheme: '',
        nombre: '',
        orden: apps.length + 1,
        tipo: 'Opcional',
        ...appData as App,
      };
      onUpdate({ data: [...apps, newApp], updatedAt: new Date().toISOString() });
    }
    setEditingApp(null);
    setIsDialogOpen(false);
  };

  const handleDelete = (orden: number) => {
    const updatedApps = apps.filter(app => app.orden !== orden);
    onUpdate({ data: updatedApps, updatedAt: new Date().toISOString() });
  };

  const AppForm = ({ app }: { app?: App }) => {
    const [formData, setFormData] = useState(app || {
      androidLink: '',
      androidScheme: '',
      descripcion: '',
      icono: '',
      iosLink: '',
      iosScheme: '',
      nombre: '',
      tipo: 'Opcional' as const,
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
          <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as 'Necesaria' | 'Opcional' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Necesaria">Necesaria</SelectItem>
              <SelectItem value="Opcional">Opcional</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="icono">URL del Icono</Label>
          <Input
            id="icono"
            value={formData.icono}
            onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="androidLink">Android Link</Label>
            <Input
              id="androidLink"
              value={formData.androidLink}
              onChange={(e) => setFormData({ ...formData, androidLink: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="androidScheme">Android Scheme</Label>
            <Input
              id="androidScheme"
              value={formData.androidScheme}
              onChange={(e) => setFormData({ ...formData, androidScheme: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="iosLink">iOS Link</Label>
            <Input
              id="iosLink"
              value={formData.iosLink}
              onChange={(e) => setFormData({ ...formData, iosLink: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="iosScheme">iOS Scheme</Label>
            <Input
              id="iosScheme"
              value={formData.iosScheme}
              onChange={(e) => setFormData({ ...formData, iosScheme: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => handleSave(formData)}>
            {app ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Apps Recomendadas</h3>
          <p className="text-sm text-muted-foreground">
            {apps.length} aplicaciones configuradas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingApp(null)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva App
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingApp ? 'Editar App' : 'Nueva App'}
              </DialogTitle>
            </DialogHeader>
            <AppForm app={editingApp || undefined} />
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="apps">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {apps.map((app, index) => (
                <Draggable key={app.orden} draggableId={app.orden.toString()} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="transition-all hover:border-primary/30"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                            </div>
                            {app.icono && (
                              <img src={app.icono} alt={app.nombre} className="w-8 h-8 rounded" />
                            )}
                            <div>
                              <CardTitle className="text-base">{app.nombre}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  app.tipo === 'Necesaria' 
                                    ? 'bg-destructive/20 text-destructive' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {app.tipo}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Orden: {app.orden}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingApp(app);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(app.orden)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{app.descripcion}</p>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}