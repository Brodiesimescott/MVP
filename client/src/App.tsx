import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { AuthProvider } from "@/components/auth/authProvider";
import { AuthGuard } from "@/components/auth/authGuard";
import { useAuth } from "@/components/auth/authProvider";
import ChironHR from "@/pages/modules/hr";
import ChironCQC from "@/pages/modules/cqc";
import ChironMessaging from "@/pages/modules/messaging";
import ChironMoney from "@/pages/modules/money";
import ChironStock from "@/pages/modules/stock";
import ChironFacilities from "@/pages/modules/facilities";
import { FileUploadDemo } from "@/pages/FileUploadDemo";
import { Button } from "./components/ui/button";
import { LogOut, User } from "lucide-react";
import LoginForm from "./components/auth/login";

function Router() {
  const { user, logout } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/modules/hr" component={ChironHR} />
      <Route path="/modules/cqc" component={ChironCQC} />
      <Route path="/modules/messaging" component={ChironMessaging} />
      <Route path="/modules/money" component={ChironMoney} />
      <Route path="/modules/stock" component={ChironStock} />
      <Route path="/modules/facilities" component={ChironFacilities} />
      <Route path="/file-upload" component={FileUploadDemo} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthGuard>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
