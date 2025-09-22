import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { VotingPage } from "@/components/VotingPage";
import { AdminRouter } from "@/components/AdminRouter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
<<<<<<< HEAD
            <Route path="/" element={<VotingPage />} />
            <Route path="/admin/*" element={<AdminRouter />} />
=======
            <Route path="/" element={<AppRouter />} />
            <Route path="/admin" element={<AppRouter isAdminRoute={true} />} />
>>>>>>> origin/copilot/fix-dc6ffd41-08d8-4564-8ff2-db716d33ca03
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
