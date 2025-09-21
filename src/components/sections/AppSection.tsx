import { useState } from 'react';
import { Trash2, MessageSquare, Bug, Lightbulb, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface FeedbackItem {
  category: string;
  platform: string;
  reportedAt: string;
  status: 'pending' | 'in development' | 'done' | 'cancelled';
  text: string;
  timestamp: number;
  userLocation?: string;
  userName?: string;
}

interface AppSectionProps {
  data: any;
  onUpdate: (data: any) => void;
}

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning' },
  { value: 'in development', label: 'En desarrollo', color: 'bg-primary' },
  { value: 'done', label: 'Completado', color: 'bg-success' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-destructive' },
];

const categoryIcons = {
  bug: { icon: Bug, label: 'Errores', color: 'text-destructive' },
  congratulations: { icon: Trophy, label: 'Felicitaciones', color: 'text-success' },
  suggestion: { icon: Lightbulb, label: 'Sugerencias', color: 'text-warning' },
};

export function AppSection({ data, onUpdate }: AppSectionProps) {
  const [feedback, setFeedback] = useState(data?.feedback || {});
  const { toast } = useToast();
  const [justSaved, setJustSaved] = useState(false);

  const saveChanges = () => {
    onUpdate({
      feedback,
      updatedAt: new Date().toISOString()
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
    toast({ title: 'Cambios guardados', description: 'Feedback actualizado' });
  };

  const handleStatusChange = (category: string, id: string, newStatus: string) => {
    const updatedFeedback = {
      ...feedback,
      [category]: {
        ...feedback[category],
        [id]: {
          ...feedback[category][id],
          status: newStatus
        }
      }
    };
    setFeedback(updatedFeedback);
  };

  const handleTextChange = (category: string, id: string, newText: string) => {
    const updatedFeedback = {
      ...feedback,
      [category]: {
        ...feedback[category],
        [id]: {
          ...feedback[category][id],
          text: newText
        }
      }
    };
    setFeedback(updatedFeedback);
  };

  const handleDelete = (category: string, id: string) => {
    const updatedFeedback = { ...feedback };
    delete updatedFeedback[category][id];
    setFeedback(updatedFeedback);
    
    toast({
      title: "Feedback eliminado",
      description: "El elemento se ha eliminado correctamente",
    });
  };

  const renderFeedbackItems = (category: string, items: Record<string, FeedbackItem>) => {
    const categoryInfo = categoryIcons[category as keyof typeof categoryIcons];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <categoryInfo.icon className={`w-6 h-6 ${categoryInfo.color}`} />
          <h3 className="text-xl font-semibold">{categoryInfo.label}</h3>
          <Badge variant="outline" className="ml-auto">
            {Object.keys(items).length} elementos
          </Badge>
        </div>

        {Object.keys(items).length === 0 ? (
          <Card className="p-6 text-center bg-card/50 border-border/50">
            <p className="text-muted-foreground">No hay elementos en esta categoría</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(items).map(([id, item]) => (
              <Card key={id} className="p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {item.platform}
                        </Badge>
                        {item.userName && (
                          <span className="text-sm text-muted-foreground">
                            por {item.userName}
                          </span>
                        )}
                        {item.userLocation && (
                          <span className="text-sm text-muted-foreground">
                            desde {item.userLocation}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.reportedAt).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      
                      <Textarea
                        value={item.text}
                        onChange={(e) => handleTextChange(category, id, e.target.value)}
                        className="min-h-[80px] bg-background/50 border-border/50 resize-none"
                        placeholder="Contenido del feedback..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Select
                      value={item.status}
                      onValueChange={(value) => handleStatusChange(category, id, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${option.color}`} />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(category, id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Feedback de la App
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestión de comentarios, errores y sugerencias
          </p>
        </div>
        
        <Button onClick={saveChanges} className={`tech-glow ${justSaved ? 'bg-success text-success-foreground hover:bg-success/90' : ''}`}>
          {justSaved ? (
            <>
              <MessageSquare className="w-4 h-4 mr-2" /> Guardado
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" /> Guardar Cambios
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="bug" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 border border-border/50">
          {Object.entries(categoryIcons).map(([key, info]) => (
            <TabsTrigger 
              key={key} 
              value={key}
              className="flex items-center space-x-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <info.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{info.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {Object.entries(categoryIcons).map(([category]) => (
          <TabsContent key={category} value={category} className="mt-6">
            {renderFeedbackItems(category, feedback[category] || {})}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
