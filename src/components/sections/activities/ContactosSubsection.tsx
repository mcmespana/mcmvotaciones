import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Phone, User, Plus, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Contacto {
  nombre: string;
  responsabilidad: string;
  telefono?: string;
}

interface ContactosSubsectionProps {
  data: { data: Contacto[]; updatedAt: string };
  onUpdate: (data: { data: Contacto[]; updatedAt: string }) => void;
}

export function ContactosSubsection({ data, onUpdate }: ContactosSubsectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<Contacto>({ nombre: '', responsabilidad: '', telefono: '' });

  const contactos = data?.data || [];

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(contactos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onUpdate({ data: items, updatedAt: new Date().toISOString() });
  };

  const handleEdit = (index: number, contacto: Contacto) => {
    setEditingIndex(index);
    setEditData({ ...contacto });
  };

  const handleSave = () => {
    if (editingIndex === null) return;

    const updatedContactos = [...contactos];
    updatedContactos[editingIndex] = editData;

    onUpdate({ data: updatedContactos, updatedAt: new Date().toISOString() });
    setEditingIndex(null);
    setEditData({ nombre: '', responsabilidad: '', telefono: '' });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditData({ nombre: '', responsabilidad: '', telefono: '' });
  };

  const handleAdd = () => {
    const newContacto: Contacto = {
      nombre: 'Nuevo Contacto',
      responsabilidad: 'Responsabilidad',
      telefono: '',
    };

    onUpdate({ 
      data: [...contactos, newContacto], 
      updatedAt: new Date().toISOString() 
    });
  };

  const handleDelete = (index: number) => {
    const updatedContactos = contactos.filter((_, i) => i !== index);
    onUpdate({ data: updatedContactos, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Contactos Importantes</h3>
          <p className="text-sm text-muted-foreground">
            {contactos.length} contactos configurados
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Contacto
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="contactos">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {contactos.map((contacto, index) => (
                <Draggable key={index} draggableId={index.toString()} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="transition-all hover:border-primary/30"
                    >
                      <CardContent className="p-4">
                        {editingIndex === index ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium mb-1 block">
                                  Nombre
                                </label>
                                <Input
                                  value={editData.nombre}
                                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">
                                  Teléfono
                                </label>
                                <Input
                                  value={editData.telefono || ''}
                                  onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Responsabilidad
                              </label>
                              <Input
                                value={editData.responsabilidad}
                                onChange={(e) => setEditData({ ...editData, responsabilidad: e.target.value })}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={handleCancel}>
                                Cancelar
                              </Button>
                              <Button onClick={handleSave}>
                                Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-primary" />
                                  <span className="font-medium">{contacto.nombre}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span>{contacto.responsabilidad}</span>
                                  {contacto.telefono && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{contacto.telefono}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(index, contacto)}
                              >
                                Editar
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
                        )}
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

      {contactos.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay contactos configurados</p>
        </Card>
      )}
    </div>
  );
}