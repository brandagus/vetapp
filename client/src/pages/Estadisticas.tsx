import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Estadisticas() {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <BarChart3 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-display mb-2">Estadísticas</h1>
          <p className="text-muted-foreground max-w-sm">
            Próximamente vas a poder ver reportes de consultas, ingresos mensuales, 
            pacientes más frecuentes y más.
          </p>
          <div className="mt-8 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
            Coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
