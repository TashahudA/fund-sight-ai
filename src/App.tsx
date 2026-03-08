import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TopNav } from "@/components/TopNav";
import Dashboard from "@/pages/Dashboard";
import MyAudits from "@/pages/MyAudits";
import AuditDetail from "@/pages/AuditDetail";
import MyRFIs from "@/pages/MyRFIs";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <TopNav />
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audits"
        element={
          <ProtectedRoute>
            <TopNav />
            <MyAudits />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audits/:id"
        element={
          <ProtectedRoute>
            <TopNav />
            <AuditDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rfis"
        element={
          <ProtectedRoute>
            <TopNav />
            <MyRFIs />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
