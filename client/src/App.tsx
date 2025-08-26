import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ChironHR from "@/pages/modules/hr";
import ChironCQC from "@/pages/modules/cqc";
import ChironMessaging from "@/pages/modules/messaging";
import ChironMoney from "@/pages/modules/money";
import ChironStock from "@/pages/modules/stock";
import ChironFacilities from "@/pages/modules/facilities";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/modules/hr" component={ChironHR} />
      <Route path="/modules/cqc" component={ChironCQC} />
      <Route path="/modules/messaging" component={ChironMessaging} />
      <Route path="/modules/money" component={ChironMoney} />
      <Route path="/modules/stock" component={ChironStock} />
      <Route path="/modules/facilities" component={ChironFacilities} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
