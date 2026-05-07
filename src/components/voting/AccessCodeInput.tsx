/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useEffect } from "react";
import { KeyRound, ArrowRight } from "lucide-react";
import { HeaderControls } from "@/components/shared/HeaderControls";

interface AccessCodeInputProps {
  onSubmit: (code: string) => void;
  loading?: boolean;
  error?: string;
  roundTitle?: string;
}

const ACCESS_CODE_SESSION_KEY = "mcm_access_code_verified";

export function isAccessCodeVerified(roundId: string): boolean {
  try {
    const data = sessionStorage.getItem(ACCESS_CODE_SESSION_KEY);
    if (!data) return false;
    const parsed = JSON.parse(data);
    return parsed.roundId === roundId && parsed.verified === true;
  } catch {
    return false;
  }
}

export function markAccessCodeVerified(roundId: string): void {
  sessionStorage.setItem(
    ACCESS_CODE_SESSION_KEY,
    JSON.stringify({ roundId, verified: true, at: new Date().toISOString() })
  );
}

export function AccessCodeInput({
  onSubmit,
  loading = false,
  error,
  roundTitle,
}: AccessCodeInputProps) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 4) {
      onSubmit(trimmed);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);
    setCode(value);
  };

  return (
    <div className="pub-page flex items-center justify-center p-5">
      <HeaderControls mode="floating" />
      <div className="bg-[var(--avd-surface)] border border-[var(--avd-border)] rounded-[var(--avd-radius-lg)] shadow-[var(--avd-shadow-lg)] w-full max-w-[420px] overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-[var(--avd-brand-600)] to-[var(--avd-brand-400)]" />

        <div className="px-10 pt-10 pb-8">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[var(--avd-brand-50,hsl(var(--primary)/0.1))] flex items-center justify-center mx-auto mb-5">
              <KeyRound className="w-7 h-7 text-[var(--avd-brand-600)]" />
            </div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[var(--avd-fg)] mb-2 font-[var(--avd-font-sans)]">
              Código de Acceso
            </h1>
            <p className="text-[13px] text-[var(--avd-fg-muted)] leading-[1.5]">
              {roundTitle
                ? `Introduce el código para acceder a "${roundTitle}"`
                : "Introduce el código proporcionado para acceder a la votación"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-[6px]">
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={handleChange}
                placeholder="ABCD"
                className="avd-input text-center text-[30px] font-mono tracking-[0.5em] uppercase h-16 pl-[0.5em]"
                disabled={loading}
                maxLength={4}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-[var(--avd-fg-faint)] text-center">
                Código alfanumérico de 4 caracteres
              </p>
            </div>

            {error && (
              <div className="bg-[var(--avd-bad-bg,hsl(0_84%_50%/0.08))] border border-[var(--avd-bad,hsl(0_84%_50%/0.3))] rounded-[var(--avd-radius-sm)] px-[14px] py-[10px] text-center text-[13px] text-[var(--avd-bad,hsl(0_72%_50%))] font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="avd-btn avd-btn-primary avd-btn-primary-lg w-full justify-center mt-1"
              disabled={loading || code.length < 4}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full [animation:spin_0.7s_linear_infinite]" />
                  Verificando...
                </>
              ) : (
                <>
                  Acceder
                  <ArrowRight className="w-[15px] h-[15px]" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-[var(--avd-fg-faint)] text-center mt-5">
            El código se muestra en la pantalla de proyección
          </p>
        </div>
      </div>
    </div>
  );
}
