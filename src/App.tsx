import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Spinner as SpinnerIcon } from "@/components/ui-avd/Spinner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { VotingPage } from "@/pages/VotingPage";
import NotFound from "./pages/NotFound";

const AdminRouter     = lazy(() => import("@/routes/AdminRouter").then(m => ({ default: m.AdminRouter })));
const ComunicaRouter  = lazy(() => import("@/routes/ComunicaRouter").then(m => ({ default: m.ComunicaRouter })));
const ProjectionPage  = lazy(() => import("@/pages/ProjectionPage").then(m => ({ default: m.ProjectionPage })));
const PublicCandidates = lazy(() => import("@/pages/PublicCandidates").then(m => ({ default: m.PublicCandidates })));

const queryClient = new QueryClient();

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <SpinnerIcon size="md" />
  </div>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<VotingPage />} />
    <Route path="/proyeccion" element={<ErrorBoundary><Suspense fallback={<Spinner />}><ProjectionPage /></Suspense></ErrorBoundary>} />
    <Route path="/candidatos/:votingId" element={<ErrorBoundary><Suspense fallback={<Spinner />}><PublicCandidates /></Suspense></ErrorBoundary>} />
    <Route path="/admin/*" element={<ErrorBoundary><Suspense fallback={<Spinner />}><AdminRouter /></Suspense></ErrorBoundary>} />
    <Route path="/comunica/*" element={<ErrorBoundary><Suspense fallback={<Spinner />}><ComunicaRouter /></Suspense></ErrorBoundary>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="app-shell-enter relative min-h-screen overflow-x-clip bg-canvas text-foreground antialiased">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade" />
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-primary/15 via-accent/10 to-transparent" />
            <div className="pointer-events-none absolute -left-24 top-0 -z-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 top-1/4 -z-10 h-64 w-64 rounded-full bg-primary-container/14 blur-3xl" />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
