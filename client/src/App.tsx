import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Mascotas";
import PacienteDetalle from "./pages/MascotaDetalle";
import NuevaVisita from "./pages/NuevaVisita";
import VisitaDetalle from "./pages/VisitaDetalle";
import Turnos from "./pages/Turnos";
import Finanzas from "./pages/Finanzas";
import Estadisticas from "./pages/Estadisticas";
import NuevoPaciente from "./pages/NuevoPaciente";

function AppRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/pacientes" component={Pacientes} />
        <Route path="/pacientes/nuevo" component={NuevoPaciente} />
        <Route path="/pacientes/:id" component={PacienteDetalle} />
        <Route path="/pacientes/:id/nueva-visita" component={NuevaVisita} />
        <Route path="/visita/:id" component={VisitaDetalle} />
        <Route path="/turnos" component={Turnos} />
        <Route path="/finanzas" component={Finanzas} />
        <Route path="/estadisticas" component={Estadisticas} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
