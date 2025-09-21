import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Users, MapPin, Hotel, Bus, Trophy, Navigation } from 'lucide-react';

interface Grupo {
  nombre: string;
  responsable?: string;
  subtitulo: string;
  miembros: string[];
  mapa?: string;
}

interface GruposSubsectionProps {
  data: { data: Record<string, Grupo[]>; updatedAt: string };
  onUpdate: (data: { data: Record<string, Grupo[]>; updatedAt: string }) => void;
}

const getGroupIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'alojamiento':
      return Hotel;
    case 'autobuses':
      return Bus;
    case 'conso+':
      return Trophy;
    case 'movilidad':
      return Navigation;
    default:
      return Users;
  }
};

export function GruposSubsection({ data, onUpdate }: GruposSubsectionProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ index: number; group: Grupo } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const grupos = data?.data || {};
  const groupTypes = Object.keys(grupos);

  const handleSaveGroup = (groupData: Partial<Grupo>) => {
    if (!selectedType || editingGroup === null) return;

    const updatedGroups = [...grupos[selectedType]];
    
    // Convert members text to array
    const miembrosText = (groupData as any).miembrosText || '';
    const miembros = miembrosText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    updatedGroups[editingGroup.index] = {
      ...editingGroup.group,
      ...groupData,
      miembros,
    };

    onUpdate({
      data: {
        ...grupos,
        [selectedType]: updatedGroups,
      },
      updatedAt: new Date().toISOString(),
    });

    setEditingGroup(null);
    setIsDialogOpen(false);
  };

  if (editingGroup && selectedType) {
    const GroupEditDialog = () => {
      const [formData, setFormData] = useState({
        nombre: editingGroup.group.nombre,
        responsable: editingGroup.group.responsable || '',
        subtitulo: editingGroup.group.subtitulo,
        miembrosText: editingGroup.group.miembros.join('\n'),
        mapa: editingGroup.group.mapa || '',
      });

      return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Grupo - {selectedType}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Grupo</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="responsable">Responsable</Label>
                <Input
                  id="responsable"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="subtitulo">Subtítulo</Label>
                <Input
                  id="subtitulo"
                  value={formData.subtitulo}
                  onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                />
              </div>

              {selectedType.toLowerCase() === 'alojamiento' && (
                <div>
                  <Label htmlFor="mapa">Enlace del Mapa</Label>
                  <Input
                    id="mapa"
                    value={formData.mapa}
                    onChange={(e) => setFormData({ ...formData, mapa: e.target.value })}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
              )}

              <div>
                <Label htmlFor="miembros">Miembros (uno por línea)</Label>
                <Textarea
                  id="miembros"
                  value={formData.miembrosText}
                  onChange={(e) => setFormData({ ...formData, miembrosText: e.target.value })}
                  placeholder="Juan P. (Madrid)&#10;María S. (Barcelona)&#10;..."
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Escribe cada persona en una línea nueva. Se convertirá automáticamente al formato JSON.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSaveGroup(formData)}>
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };

    return <GroupEditDialog />;
  }

  if (selectedType) {
    const groupsOfType = grupos[selectedType] || [];
    const Icon = getGroupIcon(selectedType);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedType(null)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">{selectedType}</h3>
          </div>
        </div>

        <div className="grid gap-4">
          {groupsOfType.map((group, index) => (
            <Card key={index} className="transition-all hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{group.nombre}</CardTitle>
                    {group.subtitulo && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.subtitulo}
                      </p>
                    )}
                    {group.responsable && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Responsable:</strong> {group.responsable}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{group.miembros.length} miembros</span>
                      </div>
                      {group.mapa && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4" />
                          <a 
                            href={group.mapa} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Ver mapa
                          </a>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingGroup({ index, group });
                        setIsDialogOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Miembros:</p>
                  <div className="flex flex-wrap gap-2">
                    {group.miembros.map((miembro, mIndex) => (
                      <span
                        key={mIndex}
                        className="px-2 py-1 bg-muted rounded-full text-xs"
                      >
                        {miembro}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {groupsOfType.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No hay grupos de tipo {selectedType}
            </p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Tipos de Grupos</h3>
        <p className="text-sm text-muted-foreground">
          {groupTypes.length} tipos de grupos configurados
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groupTypes.map((type) => {
          const Icon = getGroupIcon(type);
          const groupsCount = grupos[type]?.length || 0;
          const totalMembers = grupos[type]?.reduce((sum, group) => sum + group.miembros.length, 0) || 0;

          return (
            <Card
              key={type}
              className="cursor-pointer transition-all hover:border-primary/30 hover:bg-card/80"
              onClick={() => setSelectedType(type)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Icon className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">{type}</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>{groupsCount} grupos</p>
                      <p>{totalMembers} miembros total</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {groupTypes.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay grupos configurados</p>
        </Card>
      )}
    </div>
  );
}