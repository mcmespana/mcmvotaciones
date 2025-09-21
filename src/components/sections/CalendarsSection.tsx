import { useState } from 'react';
import { Save, Edit3, Plus, Trash2, Calendar, ExternalLink, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CalendarConfig {
  id: string;
  name: string;
  url: string;
  color: string;
  defaultSelected: boolean;
}

interface CalendarsSectionProps {
  data: any;
  onUpdate: (data: any) => void;
}

const pastelColors = [
  '#FFB3B3', '#FFD1B3', '#FFFFB3', '#D1FFB3', '#B3FFB3',
  '#B3FFD1', '#B3FFFF', '#B3D1FF', '#B3B3FF', '#D1B3FF',
  '#FFB3FF', '#FFB3D1', '#31AADF', '#A3BD31', '#CC0628',
  '#F97316', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'
];

export function CalendarsSection({ data, onUpdate }: CalendarsSectionProps) {
  const [calendars, setCalendars] = useState<CalendarConfig[]>(data?.data || []);
  const [editingCalendar, setEditingCalendar] = useState<CalendarConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const saveChanges = () => {
    onUpdate({
      data: calendars,
      updatedAt: new Date().toISOString()
    });
  };

  const handleCreateCalendar = () => {
    const newCalendar: CalendarConfig = {
      id: '',
      name: '',
      url: '',
      color: pastelColors[0],
      defaultSelected: false
    };
    setEditingCalendar(newCalendar);
    setIsCreating(true);
  };

  const handleSaveCalendar = (calendar: CalendarConfig) => {
    if (isCreating) {
      setCalendars([...calendars, calendar]);
    } else {
      setCalendars(calendars.map(c => c.id === calendar.id ? calendar : c));
    }
    setEditingCalendar(null);
    setIsCreating(false);
  };

  const handleDeleteCalendar = (id: string) => {
    setCalendars(calendars.filter(c => c.id !== id));
    toast({
      title: "Calendario eliminado",
      description: "El calendario se ha eliminado correctamente",
    });
  };

  const handleToggleDefault = (id: string, defaultSelected: boolean) => {
    setCalendars(calendars.map(c => 
      c.id === id ? { ...c, defaultSelected } : c
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Configuración de Calendarios
          </h2>
          <p className="text-muted-foreground mt-1">
            Última actualización: {data?.updatedAt ? new Date(data.updatedAt).toLocaleDateString('es-ES') : 'No disponible'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button onClick={handleCreateCalendar} className="tech-glow">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Calendario
          </Button>
          <Button onClick={saveChanges} variant="outline" className="tech-glow">
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {calendars.length === 0 ? (
          <Card className="p-8 text-center bg-card/50 border-border/50">
            <p className="text-muted-foreground">No hay calendarios configurados</p>
          </Card>
        ) : (
          calendars.map((calendar) => (
            <Card key={calendar.id} className="p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold flex items-center space-x-2">
                      <span>{calendar.name}</span>
                      {calendar.defaultSelected && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          Por defecto
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      ID: {calendar.id}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={calendar.defaultSelected}
                      onCheckedChange={(checked) => 
                        handleToggleDefault(calendar.id, checked as boolean)
                      }
                    />
                    <Label className="text-sm">Predeterminado</Label>
                  </div>
                  
                  {calendar.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={calendar.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingCalendar(calendar)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <CalendarEditor
                        calendar={editingCalendar}
                        onSave={handleSaveCalendar}
                        onCancel={() => setEditingCalendar(null)}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCalendar(calendar.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {editingCalendar && (
        <Dialog open={!!editingCalendar} onOpenChange={() => setEditingCalendar(null)}>
          <DialogContent className="max-w-md">
            <CalendarEditor
              calendar={editingCalendar}
              onSave={handleSaveCalendar}
              onCancel={() => setEditingCalendar(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface CalendarEditorProps {
  calendar: CalendarConfig | null;
  onSave: (calendar: CalendarConfig) => void;
  onCancel: () => void;
}

function CalendarEditor({ calendar, onSave, onCancel }: CalendarEditorProps) {
  const [formData, setFormData] = useState<CalendarConfig>(
    calendar || {
      id: '',
      name: '',
      url: '',
      color: pastelColors[0],
      defaultSelected: false
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof CalendarConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>{calendar?.id ? 'Editar Calendario' : 'Nuevo Calendario'}</span>
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="id">ID del Calendario</Label>
          <Input
            id="id"
            value={formData.id}
            onChange={(e) => handleChange('id', e.target.value)}
            placeholder="mcm-europa"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="MCM Europa"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="url">URL del Calendario</Label>
          <Input
            id="url"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/..."
            required
          />
        </div>
        
        <div>
          <Label className="flex items-center space-x-2 mb-3">
            <Palette className="w-4 h-4" />
            <span>Color</span>
          </Label>
          <div className="grid grid-cols-10 gap-2">
            {pastelColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange('color', color)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  formData.color === color 
                    ? 'border-primary scale-110' 
                    : 'border-white/20 hover:border-white/40'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="defaultSelected"
            checked={formData.defaultSelected}
            onCheckedChange={(checked) => handleChange('defaultSelected', checked)}
          />
          <Label htmlFor="defaultSelected">Seleccionado por defecto</Label>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="tech-glow">
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </form>
    </>
  );
}