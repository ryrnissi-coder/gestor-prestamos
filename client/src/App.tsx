import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Borrowers from "./pages/Borrowers";
import BorrowerDetail from "./pages/BorrowerDetail";
import Loans from "./pages/Loans";
import LoanDetail from "./pages/LoanDetail";
import NewLoan from "./pages/NewLoan";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import ClientDashboard from "./pages/ClientDashboard";
import { RegisterByInvitation } from "./pages/RegisterByInvitation";
import { useAuth } from "./_core/hooks/useAuth";

function ClientDashboardWrapper() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Move navigation to useEffect to avoid rendering during render phase
  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== "client") {
    return null;
  }

  return <ClientDashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path="/register" component={RegisterByInvitation} />
      <Route path="/client" component={ClientDashboardWrapper} />
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/borrowers" component={Borrowers} />
          <Route path="/borrowers/:id" component={BorrowerDetail} />
          <Route path="/loans" component={Loans} />
          <Route path="/loans/new" component={NewLoan} />
          <Route path="/loans/:id" component={LoanDetail} />
          <Route path="/payments" component={Payments} />
          <Route path="/reports" component={Reports} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
