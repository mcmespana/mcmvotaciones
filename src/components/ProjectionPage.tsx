import { useProjectionData } from "@/hooks/useProjectionData";
import { ProjectionWaiting } from "@/components/projection/ProjectionWaiting";
import { ProjectionVoting } from "@/components/projection/ProjectionVoting";
import { ProjectionResults } from "@/components/projection/ProjectionResults";
import { ProjectionFinalResults } from "@/components/projection/ProjectionFinalResults";

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
        accessCode={data.showAccessCodeInWaiting ? data.round?.access_code ?? null : null}
        votingUrl={votingUrl}
      />
    );
  }

  if (data.state === "results" && data.round) {
    return (
      <ProjectionResults
        roundTitle={data.round.title}
        roundNumber={data.round.current_round_number}
        team={data.round.team}
        results={data.results}
        candidates={data.candidates}
        selectedCandidates={data.selectedCandidates}
        showBallotSummary={Boolean(data.round.show_ballot_summary_projection)}
        ballotSummaries={data.ballotSummaries}
      />
    );
  }

  if (data.state === "final-gallery" && data.round) {
    return (
      <ProjectionFinalResults
        roundTitle={data.round.title}
        roundNumber={data.round.current_round_number}
        team={data.round.team}
        selectedCandidates={data.selectedCandidates}
      />
    );
  }

  if (data.state === "voting" && data.round) {
    return (
      <ProjectionVoting
        roundTitle={data.round.title}
        roundNumber={data.round.current_round_number}
        team={data.round.team}
        voteCount={data.voteCount}
        maxVotantes={data.round.max_votantes}
        elapsedSeconds={data.elapsedSeconds}
        connectedCount={data.connectedCount}
        showBallotSummary={Boolean(data.round.show_ballot_summary_projection)}
        ballotSummaries={data.ballotSummaries}
      />
    );
  }

  // Fallback (shouldn't happen)
  return (
    <ProjectionWaiting
      connectedCount={0}
      showConnectedCount={false}
      waitingMode="idle"
      roundTitle={null}
      accessCode={null}
      votingUrl={votingUrl}
    />
  );
}
