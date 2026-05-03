import { useState, useEffect } from "react";
import { CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import "./vote-ticket.css";

export interface VoteReceipt {
  roundId: string;
  roundNumber: number;
  voteCode: string;
  votes: string[];
  createdAt: string;
}

interface VoteReceiptRevealProps {
  voteHashCode: string;
  voteReceipt: VoteReceipt | null;
  onCopy: () => void;
}

function VoteReceiptReveal({ voteHashCode, voteReceipt, onCopy }: VoteReceiptRevealProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), 3000);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <div>
      <button
        onClick={() => setRevealed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-t-2xl"
      >
        <span className="flex items-center gap-2 font-semibold">
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {revealed ? "Ocultar mi papeleta" : "Ver código y papeleta"}
        </span>
        <span className="text-muted-foreground/50 text-xs">{revealed ? "▲" : "▼"}</span>
      </button>

      {revealed && (
        <div className="px-4 pb-5 space-y-3">
          {voteHashCode && (
            <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:border-outline-variant/70 dark:bg-surface-container-low">
              <div className="px-5 pt-4 pb-2 text-center">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Código de verificación
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black tracking-[0.12em] text-foreground">
                    {voteHashCode}
                  </span>
                  <button
                    onClick={onCopy}
                    aria-label="Copiar código"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/65 bg-surface-container-low text-foreground transition-colors hover:bg-surface-container"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="px-5 pb-4 text-center">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Conserva este código para auditar tu voto
                </p>
              </div>
            </div>
          )}

          {voteReceipt && (
            <div className="overflow-hidden rounded-2xl border-2 border-outline-variant bg-surface-container-lowest dark:border-outline-variant dark:bg-surface-container-low">
              <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Tu papeleta emitida
                </p>
              </div>
              <div className="px-4 py-3 space-y-2">
                {voteReceipt.votes.map((vote, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[10px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{vote || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface VoteTicketProps {
  roundTitle: string;
  roundNumber: number;
  voteHashCode: string;
  voteReceipt: VoteReceipt | null;
  onCopy: () => void;
}

export function VoteTicket({ roundTitle, roundNumber, voteHashCode, voteReceipt, onCopy }: VoteTicketProps) {
  return (
    <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ═══ Main ticket card ═══ */}
      <div className="tkt-card-wrapper">
        {/* Spinning conic-gradient border */}
        <div className="tkt-spin-border" />

        <div className="tkt-card-inner">
          <div className="tkt-shimmer-bar" />

          <div style={{ padding: "36px 32px 28px", textAlign: "center" }}>
            {/* Icon with pulsing rings */}
            <div className="tkt-icon-wrap">
              <span className="tkt-ring" />
              <span className="tkt-ring tkt-ring--delay" />
              <div className="tkt-icon-bubble">
                <CheckCircle2 className="tkt-check-icon" strokeWidth={1.5} />
              </div>
            </div>

            <div className="tkt-fade-up" style={{ animationDelay: "0.2s" }}>
              <h1 className="tkt-title">Voto registrado</h1>
            </div>

            <div className="tkt-fade-up" style={{ animationDelay: "0.35s" }}>
              <p className="tkt-round-title">{roundTitle}</p>
              <div className="tkt-round-badge">
                <span className="tkt-round-dot" />
                <span className="tkt-round-label">Ronda {roundNumber}</span>
              </div>
            </div>
          </div>

          {/* Bottom verification footer */}
          <div className="tkt-footer tkt-fade-up" style={{ animationDelay: "0.5s" }}>
            <p className="tkt-footer-text">
              Muestra esta pantalla para verificar que has votado correctamente.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Receipt card ═══ */}
      {(voteHashCode || voteReceipt) && (
        <div className="tkt-receipt-card">
          <VoteReceiptReveal voteHashCode={voteHashCode} voteReceipt={voteReceipt} onCopy={onCopy} />
        </div>
      )}
    </div>
  );
}
