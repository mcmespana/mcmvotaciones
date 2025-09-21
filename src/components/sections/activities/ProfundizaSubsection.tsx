import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, BookOpen, FileText } from 'lucide-react';

interface PaginaProfundiza {
  color: string;
  subtitulo: string;
  texto: string;
  titulo: string;
}

interface ProfundizaData {
  introduccion: string;
  paginas: PaginaProfundiza[];
  titulo?: string;
}

interface ProfundizaSubsectionProps {
  data: { data: ProfundizaData; updatedAt: string };
  onUpdate: (data: { data: ProfundizaData; updatedAt: string }) => void;
}

export function ProfundizaSubsection({ data, onUpdate }: ProfundizaSubsectionProps) {
  const [editingPagina, setEditingPagina] = useState<{ index: number; pagina: PaginaProfundiza } | null>(null);
  const [editingIntro, setEditingIntro] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'pagina' | 'intro'>('pagina');

  const profundizaData = data?.data || { introduccion: '', paginas: [] };

  const handleSavePagina = (paginaData: Partial<PaginaProfundiza>) => {
    if (editingPagina === null) return;

    const updatedPaginas = [...profundizaData.paginas];
    if (editingPagina.index === -1) {
      // Nueva página
      updatedPaginas.push({
        color: '#E10600',
        subtitulo: '',
        texto: '',
        titulo: '',
        ...paginaData as PaginaProfundiza,
      });
    } else {
      // Editar página existente
      updatedPaginas[editingPagina.index] = {
        ...editingPagina.pagina,
        ...paginaData,
      };
    }

    onUpdate({
      data: {
        ...profundizaData,
        paginas: updatedPaginas,
      },
      updatedAt: new Date().toISOString(),
    });

    setEditingPagina(null);
    setIsDialogOpen(false);
  };

  const handleSaveIntro = (introduccion: string) => {
    onUpdate({
      data: {
        ...profundizaData,
        introduccion,
      },
      updatedAt: new Date().toISOString(),
    });
    setEditingIntro(false);
    setIsDialogOpen(false);
  };

  const handleDeletePagina = (index: number) => {
    const updatedPaginas = profundizaData.paginas.filter((_, i) => i !== index);
    onUpdate({
      data: {
        ...profundizaData,
        paginas: updatedPaginas,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const PaginaDialog = () => {
    const [formData, setFormData] = useState({
      titulo: editingPagina?.pagina.titulo || '',
      subtitulo: editingPagina?.pagina.subtitulo || '',
      color: editingPagina?.pagina.color || '#E10600',
      texto: editingPagina?.pagina.texto || '',
    });

    return (
      <Dialog open={isDialogOpen && dialogType === 'pagina'} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPagina?.index === -1 ? 'Nueva Página' : 'Editar Página'}
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
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
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
              <Label htmlFor="texto">Contenido</Label>
              <Textarea
                id="texto"
                value={formData.texto}
                onChange={(e) => setFormData({ ...formData, texto: e.target.value })}
                className="min-h-[300px]"
                placeholder="Escribe el contenido de la página..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSavePagina(formData)}>
                {editingPagina?.index === -1 ? 'Crear' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const IntroDialog = () => {
    const [introduccion, setIntroduccion] = useState(profundizaData.introduccion);

    return (
      <Dialog open={isDialogOpen && dialogType === 'intro'} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Introducción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="introduccion">Introducción</Label>
              <Textarea
                id="introduccion"
                value={introduccion}
                onChange={(e) => setIntroduccion(e.target.value)}
                className="min-h-[400px]"
                placeholder="Escribe la introducción para la sección de profundización..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSaveIntro(introduccion)}>
                Guardar
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
          <h3 className="text-lg font-semibold">Material de Profundización</h3>
          <p className="text-sm text-muted-foreground">
            {profundizaData.paginas.length} páginas de contenido
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPagina({ index: -1, pagina: { color: '#E10600', subtitulo: '', texto: '', titulo: '' } });
            setDialogType('pagina');
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Página
        </Button>
      </div>

      {/* Sección de Introducción */}
      <Card className="transition-all hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Introducción</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingIntro(true);
                setDialogType('intro');
                setIsDialogOpen(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {profundizaData.introduccion ? (
            <p className="text-sm whitespace-pre-wrap line-clamp-3">
              {profundizaData.introduccion}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No hay introducción configurada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Páginas de Profundización */}
      <div className="grid gap-4">
        {profundizaData.paginas.map((pagina, index) => (
          <Card key={index} className="transition-all hover:border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-16 rounded-full"
                    style={{ backgroundColor: pagina.color }}
                  />
                  <div>
                    <CardTitle className="text-base">{pagina.titulo}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pagina.subtitulo}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPagina({ index, pagina });
                      setDialogType('pagina');
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePagina(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm whitespace-pre-wrap line-clamp-4">
                  {pagina.texto}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profundizaData.paginas.length === 0 && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay páginas de profundización</p>
          </div>
        </Card>
      )}

      <PaginaDialog />
      <IntroDialog />
    </div>
  );
}