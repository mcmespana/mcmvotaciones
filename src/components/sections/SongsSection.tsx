import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Download, 
  Music, 
  ArrowLeft, 
  Edit, 
  GripVertical,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Song {
  author: string;
  capo: number;
  content: string;
  filename: string;
  info: string;
  key: string;
  title: string;
}

interface Category {
  categoryTitle: string;
  songs: Song[];
}

interface SongsData {
  data?: Record<string, Category>;
  updatedAt?: string;
}

interface SongsSectionProps {
  data: SongsData;
  onUpdate: (data: SongsData) => void;
}

type ViewMode = 'categories' | 'songs' | 'edit';

export function SongsSection({ data, onUpdate }: SongsSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingSongIndex, setEditingSongIndex] = useState<number>(-1);
  const [draggedIndex, setDraggedIndex] = useState<number>(-1);
  const [showDoneFallitos, setShowDoneFallitos] = useState(false);
  const { toast } = useToast();

  const categories = data?.data || {};
  const sortedCategories = Object.entries(categories).sort(([, a], [, b]) => 
    a.categoryTitle.localeCompare(b.categoryTitle)
  );

  // Fallitos: estructura flexible. Se espera en data.fallitos por categorías (catXXXXX) -> id -> item
  const fallitosRaw = (data as any)?.fallitos || {};

  const formatCategoryKey = (catKey: string) => {
    const key = catKey.startsWith('cat') ? catKey.slice(3) : catKey;
    if (!key) return 'General';
    const first = key[0];
    const rest = key.slice(1);
    return `${first.toUpperCase()}. ${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
  };

  type Fallito = { status?: string; [k: string]: any };
  type FallitoEntry = { id: string; categoryKey: string; songKey?: string; title: string; status: string; raw: Fallito };

  const flattenFallitos = (): FallitoEntry[] => {
    const out: FallitoEntry[] = [];
    Object.entries(fallitosRaw || {}).forEach(([catKey, level1]) => {
      if (!level1) return;
      // Case A: category -> array of items
      if (Array.isArray(level1)) {
        level1.forEach((it: any, idx) => {
          const status = String(it?.status || '').toLowerCase();
          const title = it?.songTitle || it?.title || it?.['Song Title'] || `Item ${idx + 1}`;
          out.push({ id: String(idx), categoryKey: catKey, title, status, raw: it });
        });
        return;
      }
      // Case B: category -> direct map id -> item
      if (typeof level1 === 'object' && Object.values(level1).every(v => v && (v as any).status !== undefined || (v as any).songTitle !== undefined)) {
        Object.entries(level1 as Record<string, any>).forEach(([id, it]) => {
          const status = String(it?.status || '').toLowerCase();
          const title = it?.songTitle || it?.title || it?.['Song Title'] || id;
          out.push({ id, categoryKey: catKey, title, status, raw: it });
        });
        return;
      }
      // Case C: category -> songName -> id -> item (estructura del ejemplo)
      Object.entries(level1 as Record<string, any>).forEach(([songKey, idMap]) => {
        if (!idMap) return;
        if (Array.isArray(idMap)) {
          (idMap as any[]).forEach((it, idx) => {
            const status = String(it?.status || '').toLowerCase();
            const title = it?.songTitle || it?.title || it?.['Song Title'] || songKey;
            out.push({ id: String(idx), categoryKey: catKey, songKey, title, status, raw: it });
          });
        } else if (typeof idMap === 'object') {
          Object.entries(idMap as Record<string, any>).forEach(([id, it]) => {
            const status = String(it?.status || '').toLowerCase();
            const title = it?.songTitle || it?.title || it?.['Song Title'] || songKey;
            out.push({ id, categoryKey: catKey, songKey, title, status, raw: it });
          });
        }
      });
    });
    return out;
  };

  const fallitos = flattenFallitos().filter(f => showDoneFallitos ? true : f.status !== 'done');
  const [openFallito, setOpenFallito] = useState<FallitoEntry | null>(null);

  const updateFallito = (entry: FallitoEntry, patch: Partial<Fallito>) => {
    const updated: any = { ...(data as any) };
    const cat = updated.fallitos?.[entry.categoryKey];
    if (!cat) return;
    if (entry.songKey && cat[entry.songKey]) {
      if (Array.isArray(cat[entry.songKey])) {
        const idx = Number(entry.id);
        cat[entry.songKey][idx] = { ...cat[entry.songKey][idx], ...patch };
      } else {
        cat[entry.songKey][entry.id] = { ...cat[entry.songKey][entry.id], ...patch };
      }
    } else if (Array.isArray(cat)) {
      const idx = Number(entry.id);
      cat[idx] = { ...cat[idx], ...patch };
    } else if (typeof cat === 'object') {
      cat[entry.id] = { ...cat[entry.id], ...patch };
    }
    updated.fallitos[entry.categoryKey] = cat;
    onUpdate(updated);
  };

  const fallitoStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in progress', label: 'In progress' },
    { value: 'done', label: 'Done' },
  ];

  const deleteFallito = (entry: FallitoEntry) => {
    const updated: any = { ...(data as any) };
    if (!updated.fallitos || !updated.fallitos[entry.categoryKey]) return;
    const cat = updated.fallitos[entry.categoryKey];
    if (entry.songKey && cat[entry.songKey]) {
      if (Array.isArray(cat[entry.songKey])) {
        cat[entry.songKey].splice(Number(entry.id), 1);
      } else if (typeof cat[entry.songKey] === 'object') {
        delete cat[entry.songKey][entry.id];
        if (Object.keys(cat[entry.songKey]).length === 0) delete cat[entry.songKey];
      }
    } else if (Array.isArray(cat)) {
      cat.splice(Number(entry.id), 1);
    } else if (typeof cat === 'object') {
      delete cat[entry.id];
    }
    updated.fallitos[entry.categoryKey] = cat;
    onUpdate(updated);
    toast({ title: 'Fallito eliminado', description: `${entry.title}` });
  };

  const handleDownloadSongs = () => {
    const songsData = JSON.stringify(data, null, 2);
    const blob = new Blob([songsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `songs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Songs descargado",
      description: "El archivo songs.json se ha descargado exitosamente",
    });
  };

  const updateSongsData = (newData: Record<string, Category>) => {
    onUpdate({
      data: newData,
      updatedAt: new Date().toISOString()
    });
  };

  const reorderSongs = (categoryKey: string, fromIndex: number, toIndex: number) => {
    const newCategories = { ...categories };
    const songs = [...newCategories[categoryKey].songs];
    const [removed] = songs.splice(fromIndex, 1);
    songs.splice(toIndex, 0, removed);

    // Update the numbering based on new order
    songs.forEach((song, index) => {
      const currentNumber = String(index + 1).padStart(2, '0');
      const titleWithoutNumber = song.title.replace(/^\d+\.\s*/, '');
      song.title = `${currentNumber}. ${titleWithoutNumber}`;
    });

    newCategories[categoryKey].songs = songs;
    updateSongsData(newCategories);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
      reorderSongs(selectedCategory, draggedIndex, dropIndex);
    }
    setDraggedIndex(-1);
  };

  const saveSongEdit = () => {
    if (!editingSong || editingSongIndex === -1) return;

    const newCategories = { ...categories };
    newCategories[selectedCategory].songs[editingSongIndex] = { ...editingSong };
    updateSongsData(newCategories);

    toast({
      title: "Canción actualizada",
      description: "Los cambios se han guardado correctamente",
    });

    setEditingSong(null);
    setEditingSongIndex(-1);
    setViewMode('songs');
  };

  const addNewSong = () => {
    const newCategories = { ...categories };
    const songs = newCategories[selectedCategory].songs;
    const nextNumber = String(songs.length + 1).padStart(2, '0');
    
    const newSong: Song = {
      author: '',
      capo: 0,
      content: '',
      filename: '',
      info: '',
      key: 'C',
      title: `${nextNumber}. Nueva Canción`
    };

    newCategories[selectedCategory].songs.push(newSong);
    updateSongsData(newCategories);

    toast({
      title: "Nueva canción añadida",
      description: "Se ha creado una nueva canción en la categoría",
    });
  };

  const deleteSong = (songIndex: number) => {
    const newCategories = { ...categories };
    newCategories[selectedCategory].songs.splice(songIndex, 1);
    
    // Renumber remaining songs
    newCategories[selectedCategory].songs.forEach((song, index) => {
      const currentNumber = String(index + 1).padStart(2, '0');
      const titleWithoutNumber = song.title.replace(/^\d+\.\s*/, '');
      song.title = `${currentNumber}. ${titleWithoutNumber}`;
    });

    updateSongsData(newCategories);

    toast({
      title: "Canción eliminada",
      description: "La canción se ha eliminado de la categoría",
    });
  };

  if (viewMode === 'edit' && editingSong) {
    return (
      <div className="h-full bg-background/50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setViewMode('songs');
                  setEditingSong(null);
                  setEditingSongIndex(-1);
                }}
                className="tech-glow"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a canciones
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                Editar Canción
              </h1>
            </div>
            <div className="flex space-x-2">
              <Button onClick={saveSongEdit} className="tech-glow">
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-tech">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={editingSong.title}
                    onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Autor</Label>
                  <Input
                    id="author"
                    value={editingSong.author}
                    onChange={(e) => setEditingSong({ ...editingSong, author: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key">Tonalidad</Label>
                  <Input
                    id="key"
                    value={editingSong.key}
                    onChange={(e) => setEditingSong({ ...editingSong, key: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capo">Cejilla</Label>
                  <Input
                    id="capo"
                    type="number"
                    value={editingSong.capo}
                    onChange={(e) => setEditingSong({ ...editingSong, capo: parseInt(e.target.value) || 0 })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filename">Nombre de archivo</Label>
                  <Input
                    id="filename"
                    value={editingSong.filename}
                    onChange={(e) => setEditingSong({ ...editingSong, filename: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="info">Información</Label>
                  <Input
                    id="info"
                    value={editingSong.info}
                    onChange={(e) => setEditingSong({ ...editingSong, info: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenido de la canción</Label>
                <Textarea
                  id="content"
                  value={editingSong.content}
                  onChange={(e) => setEditingSong({ ...editingSong, content: e.target.value })}
                  className="min-h-[400px] bg-background/50 font-mono text-sm"
                  placeholder="Contenido de la canción con acordes..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (viewMode === 'songs' && selectedCategory) {
    const categoryData = categories[selectedCategory];
    
    return (
      <div className="h-full bg-background/50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setViewMode('categories')}
                className="tech-glow"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a categorías
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {categoryData.categoryTitle}
                </h1>
                <p className="text-muted-foreground">
                  {categoryData.songs.length} canciones
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={addNewSong} variant="outline" className="tech-glow">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Canción
              </Button>
            </div>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-tech">
            <CardContent className="p-6">
              <div className="space-y-3">
                {categoryData.songs.map((song, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-move ${
                      draggedIndex === index 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border/50 bg-background/30 hover:bg-primary/5 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {song.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {song.author || 'Sin autor'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {song.key}
                          </Badge>
                          {song.capo > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Capo {song.capo}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSong(song);
                          setEditingSongIndex(index);
                          setViewMode('edit');
                        }}
                        className="tech-glow"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSong(index)}
                        className="text-destructive hover:text-destructive tech-glow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {categoryData.songs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No hay canciones en esta categoría</p>
                    <p className="text-sm">Añade tu primera canción para comenzar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background/50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Music className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cantoral</h1>
              <p className="text-muted-foreground">
                Gestiona las canciones y categorías del cantoral
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleDownloadSongs} variant="outline" className="tech-glow">
              <Download className="w-4 h-4 mr-2" />
              Descargar Songs.json
            </Button>
          </div>
        </div>

        {/* Fallitos destacados */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-tech">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Fallitos del Cantoral</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{fallitos.length}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setShowDoneFallitos(v => !v)}>
                  {showDoneFallitos ? 'Ocultar done' : 'Mostrar done'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {fallitos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay fallitos pendientes.</p>
            ) : (
              fallitos.map((f) => (
                <div key={`${f.categoryKey}-${f.id}`} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/30">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{formatCategoryKey(f.categoryKey)}</Badge>
                      <Select value={f.status} onValueChange={(v) => updateFallito(f, { status: v })}>
                        <SelectTrigger className="w-40 h-7">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {fallitoStatusOptions.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setOpenFallito(f)}>Ver</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteFallito(f)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {openFallito && (
          <Dialog open={!!openFallito} onOpenChange={() => setOpenFallito(null)}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Detalle del fallito</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Canción:</span> {openFallito.raw.songTitle || '-'}</div>
                  <div><span className="text-muted-foreground">Archivo:</span> {openFallito.raw.songFilename || '-'}</div>
                  <div><span className="text-muted-foreground">Plataforma:</span> {openFallito.raw.platform || '-'}</div>
                  <div><span className="text-muted-foreground">Fecha:</span> {openFallito.raw.reportedAt ? new Date(openFallito.raw.reportedAt).toLocaleString() : '-'}</div>
                  <div><span className="text-muted-foreground">Usuario:</span> {openFallito.raw.userName || '-'}</div>
                  <div><span className="text-muted-foreground">Ubicación:</span> {openFallito.raw.userLocation || '-'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Descripción:</span> {openFallito.raw.description || '-'}</div>
                </div>
                <div className="pt-2">
                  <Label>Estado</Label>
                  <Select value={openFallito.status} onValueChange={(v) => { updateFallito(openFallito, { status: v }); setOpenFallito({ ...openFallito, status: v }); }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {fallitoStatusOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCategories.map(([categoryKey, category]) => (
            <Card 
              key={categoryKey}
              className="bg-card/50 backdrop-blur-sm border-border/50 shadow-tech hover:shadow-glow transition-all duration-200 cursor-pointer group"
              onClick={() => {
                setSelectedCategory(categoryKey);
                setViewMode('songs');
              }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-foreground group-hover:text-primary transition-colors">
                  <span className="truncate">{category.categoryTitle}</span>
                  <Badge variant="secondary" className="ml-2 group-hover:bg-primary/10">
                    {category.songs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {category.songs.length} canción{category.songs.length !== 1 ? 'es' : ''}
                  </p>
                  {category.songs.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Última: {category.songs[category.songs.length - 1]?.title || 'Sin título'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedCategories.length === 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-tech">
            <CardContent className="text-center py-12">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No hay categorías disponibles</h3>
              <p className="text-muted-foreground">
                Importa un archivo JSON con datos de canciones para comenzar
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Panel de Solicitudes del Cantoral
function SolicitudesPanel({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
  const solicitudesRaw = data?.solicitudes || {};
  const [openId, setOpenId] = useState<string | null>(null);
  const [current, setCurrent] = useState<any>(null);
  const statusOptions = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en progreso', label: 'En progreso' },
    { value: 'hecho', label: 'Hecho' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  const entries = Object.entries(solicitudesRaw) as [string, any][];

  const updateStatus = (id: string, status: string) => {
    const updated = { ...(data || {}) };
    if (!updated.solicitudes) updated.solicitudes = {};
    updated.solicitudes[id] = { ...updated.solicitudes[id], status };
    onUpdate(updated);
  };

  const remove = (id: string) => {
    const updated = { ...(data || {}) } as any;
    if (updated.solicitudes && updated.solicitudes[id]) {
      delete updated.solicitudes[id];
      onUpdate(updated);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-tech">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Solicitudes del Cantoral</CardTitle>
          <Badge variant="secondary">{entries.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay solicitudes.</p>
        ) : (
          entries.map(([id, item]) => (
            <div key={id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/30">
              <div className="min-w-0">
                <div className="font-medium truncate">{item.title || 'Sin título'}</div>
                <div className="text-xs text-muted-foreground truncate">{item.author || 'Autor desconocido'}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{item.category || 'General'}</Badge>
                  <Select value={item.status} onValueChange={(v) => updateStatus(id, v)}>
                    <SelectTrigger className="h-7 w-40">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => { setOpenId(id); setCurrent(item); }}>Ver</Button>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {openId && current && (
        <Dialog open={!!openId} onOpenChange={() => { setOpenId(null); setCurrent(null); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Detalle de la solicitud</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Título:</span> {current.title || '-'}</div>
                <div><span className="text-muted-foreground">Autor:</span> {current.author || '-'}</div>
                <div><span className="text-muted-foreground">Plataforma:</span> {current.platform || '-'}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {current.requestedAt ? new Date(current.requestedAt).toLocaleString() : '-'}</div>
                <div><span className="text-muted-foreground">Usuario:</span> {current.userName || '-'}</div>
                <div><span className="text-muted-foreground">Ubicación:</span> {current.userLocation || '-'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Contenido:</span>
                  <pre className="mt-1 whitespace-pre-wrap text-xs bg-background/50 p-2 rounded">{current.content || '-'}</pre>
                </div>
              </div>
              <div className="pt-2">
                <Label>Estado</Label>
                <Select value={current.status} onValueChange={(v) => { updateStatus(openId, v); setCurrent({ ...current, status: v }); }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
