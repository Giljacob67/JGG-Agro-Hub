import { lazy, Suspense, type ComponentType } from "react";
import { Route, Switch, Redirect } from "wouter";
import { ProtectedRoute } from "./components/auth/protected-route";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ROUTES } from "./lib/routes";

// Lazy-loaded pages for code splitting
const CommandCenterPage = lazy(() => import("./pages/command-center"));
const AgroCopilotPage = lazy(() => import("./pages/agro/copilot"));
const KnowledgePage = lazy(() => import("./pages/agro/knowledge"));
const AuditLogsPage = lazy(() => import("./pages/agro/audit"));
const InstitucionalPage = lazy(() => import("./pages/institucional"));
const AgroLoginPage = lazy(() => import("./pages/agro/login"));
const CrmOverviewPage = lazy(() => import("./pages/crm/overview"));
const CrmLeadsPage = lazy(() => import("./pages/crm/leads"));
const CrmLeadDetailPage = lazy(() => import("./pages/crm/lead-detail"));
const CrmAccountsPage = lazy(() => import("./pages/crm/accounts"));
const CrmAccountDetailPage = lazy(() => import("./pages/crm/account-detail"));
const CrmOpportunitiesPage = lazy(() => import("./pages/crm/opportunities"));
const CrmOpportunityDetailPage = lazy(() => import("./pages/crm/opportunity-detail"));
const CrmMattersPage = lazy(() => import("./pages/crm/matters"));
const CrmMatterDetailPage = lazy(() => import("./pages/crm/matter-detail"));
const CrmTasksPage = lazy(() => import("./pages/crm/tasks"));
const CalendarPage = lazy(() => import("./pages/agro/calendar"));
const ReportsPage = lazy(() => import("./pages/agro/reports"));
const ProductivityPage = lazy(() => import("./pages/agro/productivity"));
const CropSeasonsPage = lazy(() => import("./pages/agro/crop-seasons"));
const TaxObligationsPage = lazy(() => import("./pages/agro/tax-obligations"));
const EnvironmentalLicensesPage = lazy(() => import("./pages/agro/environmental-licenses"));
const CreditInstrumentsPage = lazy(() => import("./pages/agro/credit-instruments"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse text-muted-foreground">Carregando...</div>
    </div>
  );
}

function AgroRoute({
  component: Component,
  resource,
}: {
  component: ComponentType;
  resource?: string;
}) {
  return (
    <ProtectedRoute resource={resource}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to={ROUTES.commandCenter} />
      </Route>

      <Route path="/agro">
        <Redirect to={ROUTES.commandCenter} />
      </Route>

      <Route path={ROUTES.login}>
        <Suspense fallback={<PageLoader />}>
          <AgroLoginPage />
        </Suspense>
      </Route>

      <Route path={ROUTES.commandCenter}>
        <AgroRoute component={CommandCenterPage} resource="stats" />
      </Route>

      <Route path={ROUTES.copilot}>
        <AgroRoute component={AgroCopilotPage} resource="copilot" />
      </Route>

      <Route path={ROUTES.knowledge}>
        <AgroRoute component={KnowledgePage} resource="knowledge" />
      </Route>

      <Route path={ROUTES.audit}>
        <AgroRoute component={AuditLogsPage} resource="stats" />
      </Route>

      <Route path={ROUTES.calendar}>
        <AgroRoute component={CalendarPage} resource="matters" />
      </Route>

      <Route path={ROUTES.reports}>
        <AgroRoute component={ReportsPage} resource="stats" />
      </Route>

      <Route path={ROUTES.productivity}>
        <AgroRoute component={ProductivityPage} resource="stats" />
      </Route>

      <Route path={ROUTES.cropSeasons}>
        <AgroRoute component={CropSeasonsPage} resource="matters" />
      </Route>

      <Route path={ROUTES.taxObligations}>
        <AgroRoute component={TaxObligationsPage} resource="matters" />
      </Route>

      <Route path={ROUTES.environmentalLicenses}>
        <AgroRoute component={EnvironmentalLicensesPage} resource="matters" />
      </Route>

      <Route path={ROUTES.creditInstruments}>
        <AgroRoute component={CreditInstrumentsPage} resource="matters" />
      </Route>

      <Route path={ROUTES.crm.root}>
        <AgroRoute component={CrmOverviewPage} resource="crm" />
      </Route>

      <Route path="/agro/crm/leads/:id">
        <AgroRoute component={CrmLeadDetailPage} resource="leads" />
      </Route>
      <Route path={ROUTES.crm.leads}>
        <AgroRoute component={CrmLeadsPage} resource="leads" />
      </Route>

      <Route path="/agro/crm/accounts/:id">
        <AgroRoute component={CrmAccountDetailPage} resource="accounts" />
      </Route>
      <Route path={ROUTES.crm.accounts}>
        <AgroRoute component={CrmAccountsPage} resource="accounts" />
      </Route>

      <Route path="/agro/crm/opportunities/:id">
        <AgroRoute component={CrmOpportunityDetailPage} resource="opportunities" />
      </Route>
      <Route path={ROUTES.crm.opportunities}>
        <AgroRoute component={CrmOpportunitiesPage} resource="opportunities" />
      </Route>

      <Route path="/agro/crm/matters/:id">
        <AgroRoute component={CrmMatterDetailPage} resource="matters" />
      </Route>
      <Route path={ROUTES.crm.matters}>
        <AgroRoute component={CrmMattersPage} resource="matters" />
      </Route>

      <Route path={ROUTES.crm.tasks}>
        <AgroRoute component={CrmTasksPage} resource="tasks" />
      </Route>

      {/* Redirects legados */}
      <Route path="/command-center">
        <Redirect to={ROUTES.commandCenter} />
      </Route>
      <Route path="/crm">
        <Redirect to={ROUTES.crm.root} />
      </Route>
      <Route path="/crm/leads">
        <Redirect to={ROUTES.crm.leads} />
      </Route>
      <Route path="/crm/accounts">
        <Redirect to={ROUTES.crm.accounts} />
      </Route>
      <Route path="/crm/opportunities">
        <Redirect to={ROUTES.crm.opportunities} />
      </Route>
      <Route path="/crm/matters">
        <Redirect to={ROUTES.crm.matters} />
      </Route>
      <Route path="/crm/tasks">
        <Redirect to={ROUTES.crm.tasks} />
      </Route>

      <Route path={ROUTES.institucional}>
        <Suspense fallback={<PageLoader />}>
          <InstitucionalPage />
        </Suspense>
      </Route>

      <Route>
        <Redirect to={ROUTES.commandCenter} />
      </Route>
    </Switch>
  );
}
