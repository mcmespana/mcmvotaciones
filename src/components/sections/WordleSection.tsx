import { useState } from 'react';
import { Plus, Trash2, Calendar, Save, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface WordleDay {
  date: string;
  words: string[];
}

interface WordleSectionProps {
  data: any;
  onUpdate: (data: any) => void;
}

export function WordleSection({ data, onUpdate }: WordleSectionProps) {
  const [dailyWords, setDailyWords] = useState<Record<string, string[]>>(data?.['daily-words'] || {});
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const { toast } = useToast();

  const saveChanges = () => {
    onUpdate({
      'daily-words': dailyWords,
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddDate = () => {
    if (!newDate) return;
    
    const dateKey = newDate;
    if (dailyWords[dateKey]) {
      toast({
        title: "Error",
        description: "Ya existe una entrada para esta fecha",
        variant: "destructive"
      });
      return;
    }
    
    setDailyWords({
      ...dailyWords,
      [dateKey]: ['', '']
    });
    setNewDate('');
    setEditingDate(dateKey);
  };

  const handleDeleteDate = (date: string) => {
    const updatedWords = { ...dailyWords };
    delete updatedWords[date];
    setDailyWords(updatedWords);
    
    toast({
      title: "Fecha eliminada",
      description: "La fecha se ha eliminado correctamente",
    });
  };

  const handleUpdateWords = (date: string, words: string[]) => {
    setDailyWords({
      ...dailyWords,
      [date]: words
    });
    setEditingDate(null);
  };

  const sortedDates = Object.keys(dailyWords).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Wordle - Palabras Diarias
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestión de palabras para el juego Wordle diario
          </p>
        </div>
        
        <Button onClick={saveChanges} className="tech-glow">
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>

      <Card className="p-4 bg-card/50 border-border/50">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Label htmlFor="new-date">Nueva fecha</Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Button 
            onClick={handleAddDate} 
            disabled={!newDate}
            className="tech-glow mt-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Fecha
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        {sortedDates.length === 0 ? (
          <Card className="p-8 text-center bg-card/50 border-border/50">
            <p className="text-muted-foreground">No hay fechas configuradas</p>
          </Card>
        ) : (
          sortedDates.map((date) => (
            <Card key={date} className="p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">
                      {new Date(date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {dailyWords[date].map((word, index) => (
                        <Badge key={index} variant="outline" className="font-mono">
                          {word || `Palabra ${index + 1}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingDate(date)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <WordsEditor
                        date={date}
                        words={dailyWords[date]}
                        onSave={(words) => handleUpdateWords(date, words)}
                        onCancel={() => setEditingDate(null)}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDate(date)}
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

      {editingDate && (
        <Dialog open={!!editingDate} onOpenChange={() => setEditingDate(null)}>
          <DialogContent className="max-w-md">
            <WordsEditor
              date={editingDate}
              words={dailyWords[editingDate]}
              onSave={(words) => handleUpdateWords(editingDate, words)}
              onCancel={() => setEditingDate(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface WordsEditorProps {
  date: string;
  words: string[];
  onSave: (words: string[]) => void;
  onCancel: () => void;
}

function WordsEditor({ date, words, onSave, onCancel }: WordsEditorProps) {
  const [formWords, setFormWords] = useState<string[]>(words || ['', '']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formWords.filter(word => word.trim() !== ''));
  };

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...formWords];
    newWords[index] = value.toUpperCase();
    setFormWords(newWords);
  };

  const addWord = () => {
    setFormWords([...formWords, '']);
  };

  const removeWord = (index: number) => {
    setFormWords(formWords.filter((_, i) => i !== index));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Editar palabras para {new Date(date).toLocaleDateString('es-ES')}</span>
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          {formWords.map((word, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-1">
                <Label htmlFor={`word-${index}`}>Palabra {index + 1}</Label>
                <Input
                  id={`word-${index}`}
                  value={word}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  placeholder="PALABRA"
                  className="font-mono uppercase"
                  maxLength={10}
                />
              </div>
              {formWords.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeWord(index)}
                  className="mt-6"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={addWord}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Palabra
        </Button>
        
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