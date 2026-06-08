import { Route, Switch, Redirect } from "wouter";
import CommandCenterPage from "./pages/command-center";
import InstitucionalPage from "./pages/institucional";
import CrmLeadsPage from "./pages/crm/leads";
import CrmAccountsPage from "./pages/crm/accounts";
import CrmOpportunitiesPage from "./pages/crm/opportunities";
import CrmMattersPage from "./pages/crm/matters";
import CrmTasksPage from "./pages/crm/tasks";
import { ROUTES } from "./lib/routes";

export default function App() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to={ROUTES.commandCenter} />
      </Route>

      <Route path="/agro">
        <Redirect to={ROUTES.commandCenter} />
      </Route>
      <Route path={ROUTES.commandCenter} component={CommandCenterPage} />

      <Route path={ROUTES.crm.root}>
        <Redirect to={ROUTES.crm.leads} />
      </Route>
      <Route path={ROUTES.crm.leads} component={CrmLeadsPage} />
      <Route path={ROUTES.crm.accounts} component={CrmAccountsPage} />
      <Route path={ROUTES.crm.opportunities} component={CrmOpportunitiesPage} />
      <Route path={ROUTES.crm.matters} component={CrmMattersPage} />
      <Route path={ROUTES.crm.tasks} component={CrmTasksPage} />

      {/* Redirects legados — compatibilidade com URLs anteriores */}
      <Route path="/command-center">
        <Redirect to={ROUTES.commandCenter} />
      </Route>
      <Route path="/crm">
        <Redirect to={ROUTES.crm.leads} />
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