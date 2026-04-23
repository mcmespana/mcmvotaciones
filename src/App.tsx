import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { VotingPage } from "@/components/VotingPage";
import { AdminRouter } from "@/components/AdminRouter";
import { ComunicaRouter } from "@/components/ComunicaRouter";
import { ProjectionPage } from "@/components/ProjectionPage";
import { PublicCandidates } from "@/components/PublicCandidates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<VotingPage />} />
        <Route path="/proyeccion" element={<ProjectionPage />} />
        <Route path="/candidatos/:votingId" element={<PublicCandidates />} />
        <Route path="/admin/*" element={<AdminRouter />} />
        <Route path="/comunica/*" element={<ComunicaRouter />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
