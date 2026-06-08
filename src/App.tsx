import type { ComponentType } from "react";
import { Route, Switch, Redirect } from "wouter";
import CommandCenterPage from "./pages/command-center";
import AgroCopilotPage from "./pages/agro/copilot";
import KnowledgePage from "./pages/agro/knowledge";
import InstitucionalPage from "./pages/institucional";
import AgroLoginPage from "./pages/agro/login";
import CrmOverviewPage from "./pages/crm/overview";
import CrmLeadsPage from "./pages/crm/leads";
import CrmLeadDetailPage from "./pages/crm/lead-detail";
import CrmAccountsPage from "./pages/crm/accounts";
import CrmAccountDetailPage from "./pages/crm/account-detail";
import CrmOpportunitiesPage from "./pages/crm/opportunities";
import CrmOpportunityDetailPage from "./pages/crm/opportunity-detail";
import CrmMattersPage from "./pages/crm/matters";
import CrmMatterDetailPage from "./pages/crm/matter-detail";
import CrmTasksPage from "./pages/crm/tasks";
import { ProtectedRoute } from "./components/auth/protected-route";
import { ROUTES } from "./lib/routes";

function AgroRoute({
  component: Component,
  resource,
}: {
  component: ComponentType;
  resource?: string;
}) {
  return (
    <ProtectedRoute resource={resource}>
      <Component />
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

      <Route path={ROUTES.login} component={AgroLoginPage} />

      <Route path={ROUTES.commandCenter}>
        <AgroRoute component={CommandCenterPage} resource="stats" />
      </Route>

      <Route path={ROUTES.copilot}>
        <AgroRoute component={AgroCopilotPage} resource="copilot" />
      </Route>

      <Route path={ROUTES.knowledge}>
        <AgroRoute component={KnowledgePage} resource="knowledge" />
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

      <Route path={ROUTES.institucional} component={InstitucionalPage} />

      <Route>
        <Redirect to={ROUTES.commandCenter} />
      </Route>
    </Switch>
  );
}