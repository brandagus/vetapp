import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Propietarios from "./pages/Propietarios";
import PropietarioDetalle from "./pages/PropietarioDetalle";
import Mascotas from "./pages/Mascotas";
import MascotaDetalle from "./pages/MascotaDetalle";
import Historial from "./pages/Historial";
import VisitaDetalle from "./pages/VisitaDetalle";
import Turnos from "./pages/Turnos";
import Finanzas from "./pages/Finanzas";

function AppRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/propietarios" component={Propietarios} />
        <Route path="/propietarios/:id" component={PropietarioDetalle} />
        <Route path="/mascotas" component={Mascotas} />
        <Route path="/mascotas/:id" component={MascotaDetalle} />
        <Route path="/historial" component={Historial} />
        <Route path="/historial/visita/:id" component={VisitaDetalle} />
        <Route path="/turnos" component={Turnos} />
        <Route path="/finanzas" component={Finanzas} />
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
