import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { useToast } from "@/hooks/use-toast";
import type { RoundDetail, Candidate } from "./useRoundDetail";

export interface CandidateFormState {
  name: string;
  surname: string;
  location: string;
  group_name: string;
  age: number | "";
  description: string;
  image_url: string;
}

export type ImportCandidate = Omit<CandidateFormState, "age"> & { age: number | null };

const EMPTY_FORM: CandidateFormState = { name: "", surname: "", location: "", group_name: "", age: "", description: "", image_url: "" };

interface UseCandidateActionsOptions {
  roundId: string | undefined;
  round: RoundDetail | null;
  candidates: Candidate[];
  loadRound: () => Promise<void>;
  toast: ReturnType<typeof useToast>["toast"];
}

export function useCandidateActions({ roundId, round, candidates, loadRound, toast }: UseCandidateActionsOptions) {
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState<CandidateFormState>(EMPTY_FORM);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isEditCandidateOpen, setIsEditCandidateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [candidateToSelect, setCandidateToSelect] = useState<Candidate | null>(null);
  const [candidateToUnselect, setCandidateToUnselect] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [importingFile, setImportingFile] = useState(false);
  const [forceSelectingId, setForceSelectingId] = useState<string | null>(null);

  const resetCandidateForm = () => setCandidateForm(EMPTY_FORM);

  const openAddCandidateDialog = () => { setEditingCandidate(null); resetCandidateForm(); setIsAddCandidateOpen(true); };

  const openEditCandidateDialog = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setCandidateForm({ name: candidate.name, surname: candidate.surname, location: candidate.location || "", group_name: candidate.group_name || "", age: candidate.age || "", description: candidate.description || "", image_url: candidate.image_url || "" });
    setIsEditCandidateOpen(true);
  };

  const addCandidate = async () => {
    if (!round) return;
    if (!candidateForm.name.trim() || !candidateForm.surname.trim()) {
      toast({ title: "Campos obligatorios", description: "El nombre y apellido son obligatorios", variant: "destructive" });
      return;
    }
    const maxOrderIndex = Math.max(0, ...candidates.map((c) => c.order_index || 0));
    const { error } = await supabase.from("candidates").insert([{
      round_id: round.id, name: candidateForm.name.trim(), surname: candidateForm.surname.trim(),
      location: candidateForm.location.trim() || null, group_name: candidateForm.group_name.trim() || null,
      age: typeof candidateForm.age === "number" ? candidateForm.age : null,
      description: candidateForm.description.trim() || null, image_url: candidateForm.image_url.trim() || null,
      order_index: maxOrderIndex + 1,
    }]);
    if (error) { toast({ title: "Error", description: "No se pudo añadir el candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato añadido" });
    setIsAddCandidateOpen(false);
    resetCandidateForm();
    await loadRound();
  };

  const updateCandidate = async () => {
    if (!editingCandidate) return;
    if (!candidateForm.name.trim() || !candidateForm.surname.trim()) {
      toast({ title: "Campos obligatorios", description: "El nombre y apellido son obligatorios", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("candidates").update({
      name: candidateForm.name.trim(), surname: candidateForm.surname.trim(),
      location: candidateForm.location.trim() || null, group_name: candidateForm.group_name.trim() || null,
      age: typeof candidateForm.age === "number" ? candidateForm.age : null,
      description: candidateForm.description.trim() || null, image_url: candidateForm.image_url.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editingCandidate.id);
    if (error) { toast({ title: "Error", description: "No se pudo editar el candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato actualizado" });
    setIsEditCandidateOpen(false);
    setEditingCandidate(null);
    resetCandidateForm();
    await loadRound();
  };

  const unselectCandidate = async (candidateId: string) => {
    if (!roundId) return;
    const { data, error } = await supabase.rpc("reopen_round_after_unselect", { p_candidate_id: candidateId, p_round_id: roundId });
    if (error || !data?.success) {
      toast({ title: "Error", description: data?.error_code ?? "No se pudo desmarcar al candidato", variant: "destructive" });
      return;
    }
    const description = !data.quota_reached ? "La ronda se ha reabierto. Puedes continuar con otra ronda." : undefined;
    toast({ title: "Candidato desmarcado", ...(description ? { description } : {}) });
    await loadRound();
  };

  const quickSelectCandidate = async (candidateId: string) => {
    setCandidateToSelect(null);
    const { data, error } = await supabase.rpc("force_select_candidate", { p_candidate_id: candidateId });
    if (error || !data?.success) { toast({ title: "Error", description: "No se pudo seleccionar al candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato seleccionado", description: "Añadido directamente a la lista de seleccionados." });
    await loadRound();
  };

  const deleteCandidate = async (candidateId: string) => {
    setCandidateToDelete(null);
    const { error } = await supabase.from("candidates").delete().eq("id", candidateId);
    if (error) { toast({ title: "Error", description: "No se pudo eliminar el candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato eliminado" });
    await loadRound();
  };

  const parseCSV = (text: string): ImportCandidate[] => {
    const lines = text.replace(/\r\n?/g, "\n").trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const candidate: ImportCandidate = { name: "", surname: "", location: "", group_name: "", age: null, description: "", image_url: "" };
      headers.forEach((header, index) => {
        const value = values[index] || "";
        if (header === "age") { candidate.age = value ? Number(value) : null; }
        else if (header in candidate) { (candidate as Record<string, string | number | null>)[header] = value; }
      });
      return candidate;
    });
  };

  const parseXML = (text: string): ImportCandidate[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const parsedCandidates = xmlDoc.getElementsByTagName("candidate");
    return Array.from(parsedCandidates).map((candidate) => {
      const getTagValue = (tagName: string) => { const el = candidate.getElementsByTagName(tagName)[0]; return el ? el.textContent || "" : ""; };
      return { name: getTagValue("name"), surname: getTagValue("surname"), location: getTagValue("location"), group_name: getTagValue("group_name"), age: getTagValue("age") ? Number(getTagValue("age")) : null, description: getTagValue("description"), image_url: getTagValue("image_url") };
    });
  };

  const parseJSON = (text: string): ImportCandidate[] => {
    const payload = JSON.parse(text) as { candidates?: ImportCandidate[] } | ImportCandidate[];
    return (Array.isArray(payload) ? payload : payload.candidates) ?? [];
  };

  const importCandidates = async (file: File) => {
    if (!round) return;
    try {
      setImportingFile(true);
      const text = await file.text();
      let candidatesData: ImportCandidate[] = [];
      if (file.name.endsWith(".csv")) { candidatesData = parseCSV(text); }
      else if (file.name.endsWith(".xml")) { candidatesData = parseXML(text); }
      else if (file.name.endsWith(".json")) { candidatesData = parseJSON(text); }
      else { throw new Error("Formato no soportado. Usa CSV, XML o JSON."); }
      const maxOrderIndex = Math.max(0, ...candidates.map((c) => c.order_index || 0));
      let errorCount = 0;
      const rows = candidatesData.reduce<object[]>((acc, candidate, i) => {
        if (!candidate.name?.trim() || !candidate.surname?.trim()) { errorCount++; return acc; }
        acc.push({ round_id: round.id, name: candidate.name.trim(), surname: candidate.surname.trim(), location: candidate.location?.trim() || null, group_name: candidate.group_name?.trim() || null, age: typeof candidate.age === "number" ? candidate.age : null, description: candidate.description?.trim() || null, image_url: candidate.image_url?.trim() || null, order_index: maxOrderIndex + i + 1 });
        return acc;
      }, []);
      if (rows.length > 0) {
        const { error } = await supabase.from("candidates").insert(rows);
        if (error) throw error;
      }
      toast({ title: "Importación completada", description: `${rows.length} candidatos importados${errorCount > 0 ? `. ${errorCount} filas con error.` : "."}` });
      setIsImportOpen(false);
      await loadRound();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo importar el archivo", variant: "destructive" });
    } finally { setImportingFile(false); }
  };

  return {
    editingCandidate, setEditingCandidate,
    candidateForm, setCandidateForm,
    isAddCandidateOpen, setIsAddCandidateOpen,
    isEditCandidateOpen, setIsEditCandidateOpen,
    isImportOpen, setIsImportOpen,
    candidateToSelect, setCandidateToSelect,
    candidateToUnselect, setCandidateToUnselect,
    candidateToDelete, setCandidateToDelete,
    importingFile,
    forceSelectingId, setForceSelectingId,
    resetCandidateForm,
    openAddCandidateDialog,
    openEditCandidateDialog,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    unselectCandidate,
    quickSelectCandidate,
    importCandidates,
  };
}
