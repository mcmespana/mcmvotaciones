export interface RoundRow {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  year: number;
  team: 'ECE' | 'ECL';
  max_votantes: number;
  max_selected_candidates: number;
  max_votes_per_round: number;
  access_code: string | null;
  census_mode: 'maximum' | 'exact';
  is_active: boolean;
  is_closed: boolean;
  is_voting_open: boolean;
  join_locked: boolean;
  round_finalized: boolean;
  show_results_to_voters: boolean;
  show_ballot_summary_projection: boolean;
  show_final_gallery_projection: boolean;
  public_candidates_enabled: boolean;
  current_round_number: number;
  votes_current_round: number;
  selected_candidates_count: number;
  voting_type_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateRow {
  id: string;
  round_id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  description: string | null;
  image_url: string | null;
  order_index: number;
  is_eliminated: boolean;
  is_selected: boolean;
  selected_in_round: number | null;
  selected_vote_count: number | null;
  asamblea_movimiento_es: string | null;
  asamblea_responsabilidad: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoteRow {
  id: string;
  round_id: string;
  candidate_id: string;
  seat_id: string | null;
  device_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  round_number: number;
  vote_hash: string | null;
  is_invalidated: boolean;
  invalidation_reason: string | null;
  invalidated_at: string | null;
  created_at: string;
}

export interface RoundResultRow {
  candidate_id: string;
  round_number: number;
  vote_count: number;
  percentage: number;
}
