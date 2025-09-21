import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Download, FileJson, Cpu, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AlbumsSection } from './sections/AlbumsSection';
import { AppSection } from './sections/AppSection';
import { CalendarsSection } from './sections/CalendarsSection';
import { SongsSection } from './sections/SongsSection';
import { WordleSection } from './sections/WordleSection';
import { JubileoSection } from './sections/JubileoSection';
import { ActivitiesSection } from './sections/ActivitiesSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { useToast } from '@/hooks/use-toast';
import { getDB } from '@/lib/firebase';
import { onValue, ref, set } from 'firebase/database';

export type JSONData = {
  albums?: any;
  app?: any;
  calendars?: any;
  songs?: any;
  wordle?: any;
  jubileo?: any;
  activities?: any;
};

export type ActiveSection = 'albums' | 'app' | 'calendars' | 'songs' | 'wordle' | 'jubileo' | 'activities' | 'notifications';

export function JSONManager() {
  const [jsonData, setJsonData] = useState<JSONData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('albums');
  const { toast } = useToast();
  const pendingUpdates = useRef<Record<string, any>>({});

  // Suscripción en tiempo real a la raíz de la DB
  useEffect(() => {
    const db = getDB();
    const rootRef = ref(db, '/');
    const unsub = onValue(
      rootRef,
      (snap) => {
        const val = snap.val();
        if (val && typeof val === 'object') {
          setJsonData(val);
        } else {
          setJsonData({} as JSONData);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firebase onValue error', err);
        setLoading(false);
        toast({
          title: 'Error conectando con Firebase',
          description: 'Revisa las credenciales y las reglas de la Realtime Database',
          variant: 'destructive',
        });
      }
    );

    return () => unsub();
  }, [toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setJsonData(data);
        setDirty(true);
        toast({
          title: "JSON cargado correctamente",
          description: "El archivo se ha importado exitosamente",
        });
      } catch (error) {
        toast({
          title: "Error al cargar JSON",
          description: "El archivo no es un JSON válido",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!jsonData) return;

    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `json-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateSectionData = (section: ActiveSection, newData: any) => {
    if (!jsonData) return;

    const updatedData = {
      ...jsonData,
      [section]: {
        ...newData,
        updatedAt: new Date().toISOString()
      }
    };
    
    setJsonData(updatedData);
    setDirty(true);
    pendingUpdates.current[section] = updatedData[section];
    toast({
      title: "Datos actualizados",
      description: `La sección ${section} se ha actualizado correctamente`,
    });
  };

  const writePending = async () => {
    const db = getDB();
    const entries = Object.entries(pendingUpdates.current);
    for (const [key, value] of entries) {
      if (key === 'wordle') {
        // Solo actualiza daily-words y updatedAt
        if (value && typeof value === 'object') {
          if (value['daily-words'] !== undefined) {
            await set(ref(db, '/wordle/daily-words'), value['daily-words']);
          }
          if (value['updatedAt'] !== undefined) {
            await set(ref(db, '/wordle/updatedAt'), value['updatedAt']);
          }
        }
        continue;
      }
      await set(ref(db, `/${key}`), (jsonData as any)[key]);
    }
  };

  const forceSave = async () => {
    if (!jsonData) return;
    try {
      setSaveStatus('saving');
      await writePending();
      setSaveStatus('saved');
      setDirty(false);
      pendingUpdates.current = {};
      toast({ title: 'Guardado en Firebase', description: 'Los cambios se han sincronizado.' });
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      toast({ title: 'Error al guardar', description: 'No se pudo guardar en Firebase', variant: 'destructive' });
    }
  };

  // Auto-guardado cada 10s si hay cambios
  useEffect(() => {
    if (saveTimer.current) window.clearInterval(saveTimer.current);
    saveTimer.current = window.setInterval(() => {
      if (dirty && jsonData && Object.keys(pendingUpdates.current).length > 0) {
        setSaveStatus('saving');
        writePending()
          .then(() => {
            setSaveStatus('saved');
            setDirty(false);
            pendingUpdates.current = {};
          })
          .catch((e) => {
            console.error(e);
            setSaveStatus('error');
          });
      }
    }, 10000) as unknown as number;
    return () => {
      if (saveTimer.current) window.clearInterval(saveTimer.current);
    };
  }, [dirty, jsonData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-tech text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Conectando con Firebase…</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!jsonData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-tech">
          <div className="text-center space-y-6">
            <div className="relative">
              <Cpu className="w-16 h-16 mx-auto text-primary animate-pulse-glow" />
              <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 blur-xl" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                MCM Panel · MCM App
              </h1>
              <p className="text-muted-foreground">
                Conecta a Firebase o importa un JSON como base
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Button size="lg" className="w-full tech-glow relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                  <Upload className="w-5 h-5 mr-2" />
                  Cargar archivo JSON
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileJson className="w-4 h-4" />
                <span>Selecciona un archivo .json para comenzar</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'albums':
        return <AlbumsSection data={jsonData.albums} onUpdate={(data) => updateSectionData('albums', data)} />;
      case 'app':
        return <AppSection data={jsonData.app} onUpdate={(data) => updateSectionData('app', data)} />;
      case 'calendars':
        return <CalendarsSection data={jsonData.calendars} onUpdate={(data) => updateSectionData('calendars', data)} />;
      case 'songs':
        return <SongsSection data={jsonData.songs} onUpdate={(data) => updateSectionData('songs', data)} />;
      case 'wordle':
        return <WordleSection data={jsonData.wordle} onUpdate={(data) => updateSectionData('wordle', data)} />;
      case 'jubileo':
        return (
          <ActivitiesSection 
            data={jsonData.jubileo ? { jubileo: jsonData.jubileo } : {}} 
            onUpdate={(data) => updateSectionData('jubileo', data.jubileo)} 
          />
        );
      case 'activities':
        return (
          <ActivitiesSection 
            data={jsonData.activities || {}} 
            onUpdate={(data) => updateSectionData('activities', data)} 
          />
        );
      case 'notifications':
        return <NotificationsSection />;
      default:
        return <div className="p-8 text-center text-muted-foreground">Sección en desarrollo</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          jsonData={jsonData}
        />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border/50 bg-card/30 backdrop-blur-sm flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="text-foreground hover:text-primary" />
              <div className="flex items-center space-x-2">
                <Cpu className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold">MCM Panel</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {import.meta.env.DEV && (
                <Button onClick={() => {
                  toast({ title: 'Comprobando conexión…' });
                  set(ref(getDB(), '/__health'), { t: Date.now() })
                    .then(() => toast({ title: 'Conexión OK', description: 'Se pudo escribir en /__health' }))
                    .catch(() => toast({ title: 'Fallo de conexión', variant: 'destructive' }));
                }} variant="ghost" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Probar conexión
                </Button>
              )}
              <Button onClick={handleDownload} variant="outline" size="sm" className="tech-glow">
                <Download className="w-4 h-4 mr-2" />
                Descargar JSON
              </Button>
              <Button 
                onClick={forceSave} 
                size="sm" 
                className={`tech-glow ${dirty ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                variant={dirty ? 'default' : 'secondary'}
                disabled={!dirty && saveStatus !== 'error'}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar ahora
              </Button>
            </div>
          </header>
          {/* Indicador de guardado en la franja inferior del header */}
          {!dirty && (
            <div className="px-6 py-1 text-xs border-b border-border/50 bg-card/20">
              {saveStatus === 'saving' && (
                <span className="flex items-center text-muted-foreground"><Save className="w-3 h-3 mr-1 animate-pulse" /> Guardando…</span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Guardado</span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center text-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Error al guardar</span>
              )}
              {saveStatus === 'idle' && (
                <span className="flex items-center text-muted-foreground"><CheckCircle2 className="w-3 h-3 mr-1" /> Sin cambios</span>
              )}
            </div>
          )}

          <main className="flex-1 overflow-auto">
            {renderActiveSection()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
