import { supabase } from "@/lib/supabase";

export function computeDuplicateName(baseName: string, existingTitles: string[]): string {
  const base = `${baseName} (copia)`;
  if (!existingTitles.includes(base)) return base;
  let n = 2;
  while (existingTitles.includes(`${baseName} (copia ${n})`)) n++;
  return `${baseName} (copia ${n})`;
}

export async function fetchRoundTitles(): Promise<string[]> {
  const { data } = await supabase.from("rounds").select("title");
  return (data ?? []).map((r) => r.title as string);
}

export async function duplicateRound(
  sourceId: string,
  newTitle: string,
  preserveCandidateState = false,
): Promise<string> {
  const { data, error } = await supabase.rpc("duplicate_round", {
    p_source_id: sourceId,
    p_new_title: newTitle,
    p_preserve_candidate_state: preserveCandidateState,
  });
  if (error) throw error;
  return data as string;
}
