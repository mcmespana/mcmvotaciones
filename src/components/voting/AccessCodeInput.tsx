/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useEffect } from "react";
import { KeyRound, ArrowRight } from "lucide-react";

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
    if (trimmed.length >= 3 && trimmed.length <= 5) {
      onSubmit(trimmed);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5);
    setCode(value);
  };

  return (
    <div
      className="pub-page"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        style={{
          background: "var(--avd-surface)",
          border: "1px solid var(--avd-border)",
          borderRadius: "var(--avd-radius-lg)",
          boxShadow: "var(--avd-shadow-lg)",
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg, var(--avd-brand-600), var(--avd-brand-400))",
          }}
        />

        <div style={{ padding: "40px 40px 32px" }}>
          {/* Icon */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--avd-brand-50, hsl(var(--primary) / 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <KeyRound style={{ width: 28, height: 28, color: "var(--avd-brand-600)" }} />
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--avd-fg)",
                marginBottom: 8,
                fontFamily: "var(--avd-font-sans)",
              }}
            >
              Código de Acceso
            </h1>
            <p style={{ fontSize: 13, color: "var(--avd-fg-muted)", lineHeight: 1.5 }}>
              {roundTitle
                ? `Introduce el código para acceder a "${roundTitle}"`
                : "Introduce el código proporcionado para acceder a la votación"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={handleChange}
                placeholder="ABC"
                className="avd-input"
                disabled={loading}
                maxLength={5}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  textAlign: "center",
                  fontSize: 30,
                  fontFamily: "monospace",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  height: 64,
                  paddingLeft: "0.5em",
                }}
              />
              <p style={{ fontSize: 11, color: "var(--avd-fg-faint)", textAlign: "center" }}>
                Código alfanumérico de 3 a 5 caracteres
              </p>
            </div>

            {error && (
              <div
                style={{
                  background: "var(--avd-bad-bg, hsl(0 84% 50% / 0.08))",
                  border: "1px solid var(--avd-bad, hsl(0 84% 50% / 0.3))",
                  borderRadius: "var(--avd-radius-sm)",
                  padding: "10px 14px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--avd-bad, hsl(0 72% 50%))",
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="avd-btn avd-btn-primary avd-btn-primary-lg"
              disabled={loading || code.length < 3}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid white",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Verificando...
                </>
              ) : (
                <>
                  Acceder
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </>
              )}
            </button>
          </form>

          <p style={{ fontSize: 11, color: "var(--avd-fg-faint)", textAlign: "center", marginTop: 20 }}>
            El código se muestra en la pantalla de proyección
          </p>
        </div>
      </div>
    </div>
  );
}
