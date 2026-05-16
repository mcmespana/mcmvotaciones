import { useProjectionData } from "@/hooks/useProjectionData";
import { ProjectionWaiting } from "@/components/projection/ProjectionWaiting";
import { ProjectionVoting } from "@/components/projection/ProjectionVoting";
import { ProjectionResults } from "@/components/projection/ProjectionResults";
import { ProjectionFinalResults } from "@/components/projection/ProjectionFinalResults";
import { ProjectionBallotAnimation } from "@/components/projection/ProjectionBallotAnimation";

export function ProjectionPage() {
  const data = useProjectionData();
  const votingUrl = window.location.origin;

  if (data.state === "waiting") {
    return (
      <ProjectionWaiting
        connectedCount={data.connectedCount}
        showConnectedCount={data.showConnectedInWaiting}
        waitingMode={data.waitingMode}
        roundTitle={data.round?.title ?? null}
        accessCode={data.round?.access_code ?? null}
        votingUrl={votingUrl}
        maxVotantes={data.round?.max_votantes}
        previouslySelected={data.previouslySelected}
      />
    );
  }

  const activeCode = data.round && !data.round.is_closed ? (data.round.access_code ?? null) : null;

  if (data.state === "ballot-animation" && data.round) {
    return (
      <ProjectionBallotAnimation
        ballotSummaries={data.ballotSummaries}
        roundTitle={data.round.title}
        roundNumber={data.round.current_round_number}
        team={data.round.voting_type_name || data.round.team}
        startedAt={data.round.ballot_animation_started_at}
      />
    );
  }

  if (data.state === "results" && data.round) {
    return (
      <ProjectionResults
        roundTitle={data.round.title}
        roundNumber={data.round.current_round_number}
        team={data.round.voting_type_name || data.round.team}
        results={data.results}
        candidates={data.candidates}
        selectedCandidates={data.selectedCandidates}
        showBallotSummary={Boolean(data.round.show_ballot_summary_projection)}
        ballotSummaries={data.ballotSummaries}
        accessCode={activeCode}
      />
    );
  }

  if (data.state === "final-gallery" && data.round) {
    return (
      <ProjectionFinalResults
        roundTitle={data.round.title}
        roundNumber={data.round.current_round_number}
        team={data.round.voting_type_name || data.round.team}
        selectedCandidates={data.selectedCandidates}
        accessCode={activeCode}
      />
    );
  }

  if (data.state === "voting" && data.round) {
    return (
      <ProjectionVoting
        roundTitle={data.round.title}
        roundNumber={data.round.current_round_number}
        team={data.round.voting_type_name || data.round.team}
        voteCount={data.voteCount}
        maxVotantes={data.round.max_votantes}
        elapsedSeconds={data.elapsedSeconds}
        connectedCount={data.connectedCount}
        showBallotSummary={Boolean(data.round.show_ballot_summary_projection)}
        ballotSummaries={data.ballotSummaries}
        previouslySelected={data.previouslySelected}
        accessCode={activeCode}
      />
    );
  }

  return (
    <ProjectionWaiting
      connectedCount={data.connectedCount ?? 0}
      showConnectedCount={false}
      waitingMode={data.waitingMode ?? "idle"}
      roundTitle={data.round?.title ?? null}
      accessCode={data.round?.access_code ?? null}
      votingUrl={votingUrl}
      previouslySelected={data.previouslySelected}
    />
  );
}
