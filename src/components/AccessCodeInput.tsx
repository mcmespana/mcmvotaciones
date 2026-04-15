import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ArrowRight } from "lucide-react";

interface AccessCodeInputProps {
  /** Called with the entered code when submitted */
  onSubmit: (code: string) => void;
  /** Whether the code is being verified */
  loading?: boolean;
  /** Error message to display */
  error?: string;
  /** Round title for display context */
  roundTitle?: string;
}

const ACCESS_CODE_SESSION_KEY = "mcm_access_code_verified";

/** Check if the user has already verified the code for this round */
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

/** Mark the access code as verified for this round */
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
    // Auto-focus the input on mount
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
    // Only allow alphanumeric, max 5 chars
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5);
    setCode(value);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Código de Acceso</CardTitle>
          <CardDescription>
            {roundTitle
              ? `Introduce el código para acceder a "${roundTitle}"`
              : "Introduce el código proporcionado para acceder a la votación"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                ref={inputRef}
                type="text"
                value={code}
                onChange={handleChange}
                placeholder="ABC"
                className="text-center text-3xl font-mono tracking-[0.5em] h-16 uppercase"
                disabled={loading}
                maxLength={5}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-xs text-center text-muted-foreground">
                Código alfanumérico de 3 a 5 letras
              </p>
            </div>

            {error && (
              <div className="text-center text-sm text-destructive bg-destructive/10 rounded-lg p-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length < 3}
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  Acceder
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            El código se muestra en la pantalla de proyección
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
