import { Construction } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface JubileoSectionProps {
  data: any;
  onUpdate: (data: any) => void;
}

export function JubileoSection({ data, onUpdate }: JubileoSectionProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Sección Jubileo
        </h2>
        <p className="text-muted-foreground mt-1">
          Esta sección está en desarrollo y se implementará próximamente
        </p>
      </div>

      <Card className="p-12 text-center bg-card/50 border-border/50">
        <div className="space-y-4">
          <Construction className="w-16 h-16 mx-auto text-muted-foreground animate-pulse" />
          <h3 className="text-xl font-semibold">En construcción</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            La sección Jubileo se desarrollará en futuros prompts según las especificaciones del usuario.
          </p>
        </div>
      </Card>
    </div>
  );
}