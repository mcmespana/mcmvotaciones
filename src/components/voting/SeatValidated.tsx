import { ShieldCheck } from 'lucide-react';
import './seat-validated.css';
import { HeaderControls } from '@/components/shared/HeaderControls';

interface Props {
  roundTitle: string;
  isPaused: boolean;
}

export function SeatValidated({ roundTitle, isPaused }: Props) {
  return (
    <div className={`sv-page${isPaused ? ' sv-page--paused' : ''}`}>
      <HeaderControls mode="floating" />

      {/* Ambient orbs */}
      <div className="sv-orb sv-orb-a" />
      <div className="sv-orb sv-orb-b" />
      <div className="sv-orb sv-orb-c" />

      <div className="sv-card">
        {/* Animated icon */}
        <div className="sv-icon-wrap">
          <div className="sv-ring" />
          <div className="sv-ring sv-ring-2" />
          <div className="sv-ring sv-ring-3" />
          <div className="sv-icon-bubble">
            <ShieldCheck className="sv-check" />
          </div>
        </div>

        {/* Main heading */}
        <div className="sv-label">VALIDADO</div>
        <div className="sv-sublabel">{isPaused ? 'Ronda en Pausa' : 'Sala Abierta'}</div>

        {/* Badge */}
        <div className="sv-badge">
          <ShieldCheck size={14} />
          Asiento validado y seguro
        </div>

        {/* Round title */}
        <div className="sv-round">{roundTitle}</div>

        {/* Waiting dots */}
        <div className="sv-waiting">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="sv-dot"
              style={{ animation: `dot-bounce 1.4s ease-in-out ${i * 0.22}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
