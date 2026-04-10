import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllCRMContacts, groupByLocation, CRMContact, CRMContactGroup } from '@/lib/sinergiaCRM';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Users, RefreshCw, Download, Search, CheckSquare, Square, ArrowLeft, Database } from 'lucide-react';

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------

interface Round {
  id: string;
  title: string;
  year: number;
  team: string;
  candidate_count: number;
}

type WizardStep = 'select-round' | 'confirm-fetch' | 'review' | 'importing' | 'done';

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ComunicaImport() {
  const { toast } = useToast();

  // — Wizard state —
  const [step, setStep] = useState<WizardStep>('select-round');

  // — Paso 1: votación —
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(true);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  // — Paso 2-3: contactos CRM —
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [groups, setGroups] = useState<CRMContactGroup[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [existingCrmIds, setExistingCrmIds] = useState<Set<string>>(new Set());

  // — Paso 3: selección y filtro —
  const [selected, setSelected] = useState<Set<string>>(new Set()); // crm_id
  const [search, setSearch] = useState('');

  // — Confirmación de importación —
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);

  // ---------------------------------------------------------------------------
  // Cargar votaciones al montar
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadRounds() {
      setRoundsLoading(true);
      const { data, error } = await supabase
        .from('rounds')
        .select('id, title, year, team')
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error', description: 'No se pudieron cargar las votaciones.', variant: 'destructive' });
        setRoundsLoading(false);
        return;
      }

      // Contar candidatos actuales de cada ronda
      const ids = (data ?? []).map(r => r.id);
      const { data: counts } = await supabase
        .from('candidates')
        .select('round_id')
        .in('round_id', ids);

      const countMap: Record<string, number> = {};
      (counts ?? []).forEach(c => {
        countMap[c.round_id] = (countMap[c.round_id] ?? 0) + 1;
      });

      setRounds((data ?? []).map(r => ({ ...r, candidate_count: countMap[r.id] ?? 0 })));
      setRoundsLoading(false);
    }

    loadRounds();
  }, []);

  // ---------------------------------------------------------------------------
  // Paso 2: traer contactos del CRM
  // ---------------------------------------------------------------------------

  async function handleFetchContacts() {
    setFetchLoading(true);
    setStep('confirm-fetch');
    try {
      const data = await fetchAllCRMContacts();
      setContacts(data);
      setGroups(groupByLocation(data));
      setSelected(new Set(data.map(c => c.crm_id))); // todos seleccionados por defecto

      // Obtener crm_ids que ya existen en esta ronda
      const { data: existing } = await supabase
        .from('candidates')
        .select('crm_id')
        .eq('round_id', selectedRoundId)
        .not('crm_id', 'is', null);

      setExistingCrmIds(new Set((existing ?? []).map(e => e.crm_id as string)));

      setStep('review');
    } catch (err) {
      toast({
        title: 'Error al conectar con SinergiaCRM',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
      setStep('select-round');
    } finally {
      setFetchLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Paso 3: filtrado por búsqueda
  // ---------------------------------------------------------------------------

  const filteredGroups = useMemo<CRMContactGroup[]>(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map(g => ({
        ...g,
        contacts: g.contacts.filter(
          c =>
            c.full_name.toLowerCase().includes(q) ||
            (c.dni ?? '').toLowerCase().includes(q) ||
            (c.location ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter(g => g.contacts.length > 0);
  }, [groups, search]);

  const totalFiltered = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.contacts.length, 0),
    [filteredGroups],
  );

  const selectedCount = useMemo(
    () => [...selected].filter(id => contacts.some(c => c.crm_id === id)).length,
    [selected, contacts],
  );

  function toggleContact(crmId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(crmId) ? next.delete(crmId) : next.add(crmId);
      return next;
    });
  }

  function selectAll() {
    const visible = filteredGroups.flatMap(g => g.contacts.map(c => c.crm_id));
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(id => next.add(id));
      return next;
    });
  }

  function selectNone() {
    const visible = new Set(filteredGroups.flatMap(g => g.contacts.map(c => c.crm_id)));
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(id => next.delete(id));
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Paso 4: importar
  // ---------------------------------------------------------------------------

  async function handleImport() {
    setConfirmOpen(false);
    setStep('importing');

    const toImport = contacts.filter(c => selected.has(c.crm_id));

    // Calcular order_index: los contactos ya vienen ordenados por (location, age)
    const rows = toImport.map((c, idx) => ({
      round_id: selectedRoundId,
      name: c.first_name,
      surname: c.last_name,
      location: c.location,
      age: c.age,
      birthdate: c.birthdate || null,
      crm_id: c.crm_id,
      dni: c.dni,
      etapa: c.etapa,
      asamblea_movimiento_es: c.asamblea_movimiento_es,
      asamblea_responsabilidad: c.asamblea_responsabilidad,
      monitor_desde: c.monitor_desde,
      monitor_de: c.monitor_de,
      crm_source: 'sinergiacrm',
      order_index: idx,
    }));

    // Obtener crm_ids que ya existen en esta ronda para no duplicar
    const { data: existing } = await supabase
      .from('candidates')
      .select('crm_id')
      .eq('round_id', selectedRoundId)
      .not('crm_id', 'is', null);

    const alreadyExists = new Set((existing ?? []).map(e => e.crm_id as string));
    const newRows = rows.filter(r => !alreadyExists.has(r.crm_id));
    const skipped = rows.length - newRows.length;

    // Insertar en lotes de 100
    const BATCH = 100;
    let inserted = 0;

    for (let i = 0; i < newRows.length; i += BATCH) {
      const batch = newRows.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from('candidates')
        .insert(batch)
        .select('id');

      if (error) {
        toast({
          title: 'Error durante la importación',
          description: error.message,
          variant: 'destructive',
        });
        setStep('review');
        return;
      }

      inserted += (data ?? []).length;
    }

    setImportResult({ inserted, skipped });
    setStep('done');
    toast({
      title: 'Importación completada',
      description: `${inserted} candidatos añadidos${skipped > 0 ? `, ${skipped} ya existían (omitidos)` : ''}.`,
    });
  }

  function resetWizard() {
    setStep('select-round');
    setSelectedRoundId('');
    setContacts([]);
    setGroups([]);
    setSelected(new Set());
    setSearch('');
    setImportResult(null);
    setExistingCrmIds(new Set());
    // Recargar candidatos count
    setRoundsLoading(true);
    supabase
      .from('rounds')
      .select('id, title, year, team')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) { setRoundsLoading(false); return; }
        supabase
          .from('candidates')
          .select('round_id')
          .in('round_id', data.map(r => r.id))
          .then(({ data: counts }) => {
            const countMap: Record<string, number> = {};
            (counts ?? []).forEach(c => { countMap[c.round_id] = (countMap[c.round_id] ?? 0) + 1; });
            setRounds(data.map(r => ({ ...r, candidate_count: countMap[r.id] ?? 0 })));
            setRoundsLoading(false);
          });
      });
  }

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Importar candidatos desde SinergiaCRM</h1>
            <p className="text-sm text-muted-foreground">
              Importa personas del CRM directamente a una votación existente
            </p>
          </div>
        </div>

        {/* ================================================================
            PASO 1 — Seleccionar votación
        ================================================================ */}
        {(step === 'select-round') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                Selecciona la votación de destino
              </CardTitle>
              <CardDescription>
                Los candidatos importados quedarán vinculados a esta votación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {roundsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  Cargando votaciones...
                </div>
              ) : rounds.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">
                  No hay votaciones creadas. Crea una desde el panel de administración primero.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Votación</Label>
                    <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige una votación..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.title} — {r.year} · {r.team}
                            {r.candidate_count > 0 && ` (${r.candidate_count} candidatos)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRound && (
                    <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
                      <p><span className="font-medium">Votación:</span> {selectedRound.title}</p>
                      <p><span className="font-medium">Año / Equipo:</span> {selectedRound.year} · {selectedRound.team}</p>
                      <p><span className="font-medium">Candidatos actuales:</span> {selectedRound.candidate_count}</p>
                    </div>
                  )}

                  <Button
                    disabled={!selectedRoundId}
                    onClick={() => setStep('confirm-fetch')}
                    className="w-full"
                  >
                    Continuar
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            PASO 2 — Confirmar consulta al CRM
        ================================================================ */}
        {step === 'confirm-fetch' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                Consultar SinergiaCRM
              </CardTitle>
              <CardDescription>
                Se descargarán <strong>todas las personas</strong> registradas en el CRM.
                Esto puede tardar unos segundos dependiendo del número de registros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fetchLoading ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                  <p className="text-muted-foreground text-sm">
                    Conectando con SinergiaCRM y descargando registros…<br />
                    <span className="text-xs">Esto puede tardar 15-30 segundos si hay muchos registros.</span>
                  </p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('select-round')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                  </Button>
                  <Button onClick={handleFetchContacts} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Traer personas de SinergiaCRM
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            PASO 3 — Revisar y seleccionar
        ================================================================ */}
        {step === 'review' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                  Selecciona los candidatos a importar
                </CardTitle>
                <CardDescription>
                  {contacts.length} personas encontradas en SinergiaCRM.
                  {existingCrmIds.size > 0 && (
                    <> <span className="text-amber-600">{existingCrmIds.size} ya están en esta votación</span> (marcadas en naranja).</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nombre, DNI o delegación..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* Controles globales */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Seleccionar todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>
                    <Square className="w-4 h-4 mr-1" />
                    Ninguno
                  </Button>
                  <span className="text-sm text-muted-foreground ml-auto">
                    <strong>{selectedCount}</strong> de <strong>{contacts.length}</strong> seleccionados
                    {search && ` · mostrando ${totalFiltered}`}
                  </span>
                </div>

                {/* Lista agrupada por delegación */}
                {filteredGroups.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    No hay resultados para «{search}»
                  </p>
                ) : (
                  <Accordion type="multiple" defaultValue={filteredGroups.map(g => g.location)}>
                    {filteredGroups.map(group => {
                      const groupSelected = group.contacts.filter(c => selected.has(c.crm_id)).length;
                      return (
                        <AccordionItem key={group.location} value={group.location}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="font-medium">{group.location}</span>
                              <Badge variant="secondary" className="ml-1">
                                {groupSelected}/{group.contacts.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-muted-foreground">
                                    <th className="w-8 pb-2 text-left" />
                                    <th className="pb-2 text-left font-medium">Nombre</th>
                                    <th className="pb-2 text-left font-medium">Apellidos</th>
                                    <th className="pb-2 text-center font-medium">Edad</th>
                                    <th className="pb-2 text-left font-medium hidden md:table-cell">DNI</th>
                                    <th className="pb-2 text-left font-medium hidden md:table-cell">Etapa</th>
                                    <th className="pb-2 text-left font-medium hidden lg:table-cell">Monitor de</th>
                                    <th className="pb-2 text-left font-medium hidden lg:table-cell">Desde</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.contacts.map(c => {
                                    const alreadyIn = existingCrmIds.has(c.crm_id);
                                    return (
                                      <tr
                                        key={c.crm_id}
                                        className={`border-b last:border-0 hover:bg-muted/40 cursor-pointer ${alreadyIn ? 'opacity-60' : ''}`}
                                        onClick={() => toggleContact(c.crm_id)}
                                      >
                                        <td className="py-2 pr-2">
                                          <Checkbox
                                            checked={selected.has(c.crm_id)}
                                            onCheckedChange={() => toggleContact(c.crm_id)}
                                            onClick={e => e.stopPropagation()}
                                          />
                                        </td>
                                        <td className="py-2 pr-3">
                                          {c.first_name}
                                          {alreadyIn && (
                                            <Badge variant="outline" className="ml-1 text-xs text-amber-600 border-amber-400">
                                              ya importada
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="py-2 pr-3">{c.last_name}</td>
                                        <td className="py-2 pr-3 text-center">{c.age ?? '—'}</td>
                                        <td className="py-2 pr-3 hidden md:table-cell">{c.dni ?? '—'}</td>
                                        <td className="py-2 pr-3 hidden md:table-cell">{c.etapa ?? '—'}</td>
                                        <td className="py-2 pr-3 hidden lg:table-cell">{c.monitor_de ?? '—'}</td>
                                        <td className="py-2 hidden lg:table-cell">{c.monitor_desde ?? '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('confirm-fetch')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button
                disabled={selectedCount === 0}
                onClick={() => setConfirmOpen(true)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Importar {selectedCount} candidato{selectedCount !== 1 ? 's' : ''} a «{selectedRound?.title}»
              </Button>
            </div>
          </>
        )}

        {/* ================================================================
            PASO 4 — Importando
        ================================================================ */}
        {step === 'importing' && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
              <p className="text-lg font-medium">Importando candidatos…</p>
              <p className="text-muted-foreground text-sm">Por favor espera.</p>
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            PASO 5 — Hecho
        ================================================================ */}
        {step === 'done' && importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Importación completada</CardTitle>
              <CardDescription>
                Los candidatos han sido añadidos a la votación «{selectedRound?.title}».
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-muted/40 p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{importResult.inserted}</p>
                  <p className="text-sm text-muted-foreground mt-1">Candidatos añadidos</p>
                </div>
                {importResult.skipped > 0 && (
                  <div className="rounded-lg border bg-muted/40 p-4 text-center">
                    <p className="text-3xl font-bold text-muted-foreground">{importResult.skipped}</p>
                    <p className="text-sm text-muted-foreground mt-1">Ya existían (omitidos)</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={resetWizard} className="flex-1">
                  Importar a otra votación
                </Button>
                <Button onClick={() => { window.location.href = '/admin'; }} className="flex-1">
                  Ir al panel de administración
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            Diálogo de confirmación antes de importar
        ================================================================ */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar importación?</AlertDialogTitle>
              <AlertDialogDescription>
                Se importarán <strong>{selectedCount} candidatos</strong> a la votación{' '}
                <strong>«{selectedRound?.title}»</strong>.
                {existingCrmIds.size > 0 && (
                  <> Los que ya existan en la votación serán ignorados automáticamente.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleImport}>Importar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
