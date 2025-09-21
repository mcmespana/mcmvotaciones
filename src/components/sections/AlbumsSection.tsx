import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Save, X, ExternalLink, CheckCircle2, Image as ImageIcon, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Album {
  id: string;
  title: string;
  albumUrl: string;
  imageUrl: string;
  date: string;
  location: string;
}

interface AlbumsSectionProps {
  data: any;
  onUpdate: (data: any) => void;
}

export function AlbumsSection({ data, onUpdate }: AlbumsSectionProps) {
  const [albums, setAlbums] = useState<Album[]>(data?.data || []);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Mantiene la lista ordenada por id desc al cargar por primera vez
  // pero permite reordenación manual posterior sin renumerar ids
  const [initialized, setInitialized] = useState(false);
  // Orden inicial por id desc para una primera experiencia consistente
  // sin renumerar ids. Tras ello se permite DnD libre.
  React.useEffect(() => {
    if (!initialized) {
      setAlbums((prev) => [...prev].sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0)));
      setInitialized(true);
    }
  }, [initialized]);
  const { toast } = useToast();

  const saveChanges = () => {
    onUpdate({
      data: albums,
      updatedAt: new Date().toISOString()
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handleCreateAlbum = () => {
    const newId = Math.max(...albums.map(a => parseInt(a.id)), 0) + 1;
    const newAlbum: Album = {
      id: newId.toString(),
      title: '',
      albumUrl: '',
      imageUrl: '',
      date: '',
      location: ''
    };
    setEditingAlbum(newAlbum);
    setIsCreating(true);
  };

  const handleSaveAlbum = (album: Album) => {
    let next = albums;
    if (isCreating) {
      next = [...albums, album];
    } else {
      next = albums.map(a => a.id === album.id ? album : a);
    }
    setAlbums(next);
    // Guardado inmediato y cierre de diálogo
    onUpdate({ data: next, updatedAt: new Date().toISOString() });
    setEditingAlbum(null);
    setIsCreating(false);
  };

  const handleDeleteAlbum = (id: string) => {
    setAlbums(albums.filter(a => a.id !== id));
    toast({
      title: "Álbum eliminado",
      description: "El álbum se ha eliminado correctamente",
    });
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const list = [...albums];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(index, 0, moved);
    setAlbums(list);
    setDraggedIndex(index);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestión de Álbumes
          </h2>
          <p className="text-muted-foreground mt-1">
            Última actualización: {data?.updatedAt ? new Date(data.updatedAt).toLocaleDateString('es-ES') : 'No disponible'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={handleCreateAlbum} className="tech-glow">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Álbum
          </Button>
          <Button onClick={saveChanges} variant={justSaved ? 'default' : 'outline'} className={`tech-glow ${justSaved ? 'bg-success text-success-foreground hover:bg-success/90' : ''}`}>
            {justSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Guardado
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {albums.length === 0 ? (
          <Card className="p-8 text-center bg-card/50 border-border/50">
            <p className="text-muted-foreground">No hay álbumes configurados</p>
          </Card>
        ) : (
          albums.map((album, index) => (
            <Card
              key={album.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={() => setDraggedIndex(null)}
              className="p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all cursor-move"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="w-16 h-10 bg-muted rounded overflow-hidden flex items-center justify-center">
                    {album.imageUrl ? (
                      <img src={album.imageUrl} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="w-12 h-10 bg-muted rounded-lg flex items-center justify-center text-sm font-mono">
                    #{album.id}
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{album.title || 'Sin título'}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">{album.location || 'Sin ubicación'}{album.date ? ` · ${album.date}` : ''}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {album.albumUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={album.albumUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setEditingAlbum(album); setIsCreating(false); }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAlbum(album.id)}
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

      {editingAlbum && (
        <Dialog open={!!editingAlbum} onOpenChange={() => setEditingAlbum(null)}>
          <DialogContent className="max-w-md">
            <AlbumEditor
              album={editingAlbum}
              onSave={handleSaveAlbum}
              onCancel={() => setEditingAlbum(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface AlbumEditorProps {
  album: Album | null;
  onSave: (album: Album) => void;
  onCancel: () => void;
}

function AlbumEditor({ album, onSave, onCancel }: AlbumEditorProps) {
  const [formData, setFormData] = useState<Album>(
    album || {
      id: '',
      title: '',
      albumUrl: '',
      imageUrl: '',
      date: '',
      location: ''
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof Album, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Edit3 className="w-5 h-5" />
          <span>{album?.id ? 'Editar Álbum' : 'Nuevo Álbum'}</span>
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Nombre del álbum"
          />
        </div>
        
        <div>
          <Label htmlFor="albumUrl">URL del Álbum</Label>
          <Input
            id="albumUrl"
            value={formData.albumUrl}
            onChange={(e) => handleChange('albumUrl', e.target.value)}
            placeholder="https://photos.app.goo.gl/..."
          />
        </div>
        
        <div>
          <Label htmlFor="imageUrl">URL de la Imagen</Label>
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e) => handleChange('imageUrl', e.target.value)}
            placeholder="https://firebasestorage.googleapis.com/..."
          />
        </div>
        
        <div>
          <Label htmlFor="date">Fecha</Label>
          <Input
            id="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            placeholder="Fecha del evento"
          />
        </div>
        
        <div>
          <Label htmlFor="location">Ubicación</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Ciudad, país"
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
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
