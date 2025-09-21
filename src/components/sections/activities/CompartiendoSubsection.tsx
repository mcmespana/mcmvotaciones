import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, User, Calendar, Users } from 'lucide-react';

interface CompartiendoPost {
  autor: string;
  contenido: string;
  fecha: string;
  grupal: boolean;
  id: string;
  titulo: string;
}

interface CompartiendoSubsectionProps {
  data: { data: Record<string, CompartiendoPost>; updatedAt: string };
  onUpdate: (data: { data: Record<string, CompartiendoPost>; updatedAt: string }) => void;
}

export function CompartiendoSubsection({ data, onUpdate }: CompartiendoSubsectionProps) {
  const [editingPost, setEditingPost] = useState<{ key: string; post: CompartiendoPost } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const posts = data?.data || {};
  const postEntries = Object.entries(posts).sort((a, b) => 
    new Date(b[1].fecha).getTime() - new Date(a[1].fecha).getTime()
  );

  const handleSave = (contenido: string) => {
    if (!editingPost) return;

    const updatedPosts = {
      ...posts,
      [editingPost.key]: {
        ...editingPost.post,
        contenido,
      },
    };

    onUpdate({ data: updatedPosts, updatedAt: new Date().toISOString() });
    setEditingPost(null);
    setIsDialogOpen(false);
  };

  const handleDelete = (key: string) => {
    const updatedPosts = { ...posts };
    delete updatedPosts[key];
    onUpdate({ data: updatedPosts, updatedAt: new Date().toISOString() });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const EditDialog = () => {
    const [contenido, setContenido] = useState(editingPost?.post.contenido || '');

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Contenido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {editingPost?.post.autor || 'Anónimo'}
                </span>
                {editingPost?.post.grupal && (
                  <Users className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">
                  {editingPost && formatDate(editingPost.post.fecha)}
                </span>
              </div>
            </div>

            <div>
              <Textarea
                placeholder="Contenido del post..."
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className="min-h-[200px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleSave(contenido)}>
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
      <div>
        <h3 className="text-lg font-semibold">Posts Compartidos</h3>
        <p className="text-sm text-muted-foreground">
          {postEntries.length} posts compartidos
        </p>
      </div>

      <div className="space-y-4">
        {postEntries.map(([key, post]) => (
          <Card key={key} className="transition-all hover:border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  {post.titulo && (
                    <CardTitle className="text-base">{post.titulo}</CardTitle>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{post.autor || 'Anónimo'}</span>
                    {post.grupal && (
                      <>
                        <span>•</span>
                        <Users className="w-4 h-4" />
                        <span>Grupal</span>
                      </>
                    )}
                    <span>•</span>
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(post.fecha)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPost({ key, post });
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm">
                  {post.contenido}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {postEntries.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No hay posts compartidos</p>
          </Card>
        )}
      </div>

      <EditDialog />
    </div>
  );
}