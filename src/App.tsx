import { Route, Switch, Redirect } from "wouter";
import CommandCenterPage from "./pages/command-center";
import InstitucionalPage from "./pages/institucional";
import CrmLeadsPage from "./pages/crm/leads";
import CrmAccountsPage from "./pages/crm/accounts";
import CrmOpportunitiesPage from "./pages/crm/opportunities";
import CrmMattersPage from "./pages/crm/matters";
import CrmTasksPage from "./pages/crm/tasks";

export default function App() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/command-center" />
      </Route>
      <Route path="/command-center" component={CommandCenterPage} />
      <Route path="/crm">
        <Redirect to="/crm/leads" />
      </Route>
      <Route path="/crm/leads" component={CrmLeadsPage} />
      <Route path="/crm/accounts" component={CrmAccountsPage} />
      <Route path="/crm/opportunities" component={CrmOpportunitiesPage} />
      <Route path="/crm/matters" component={CrmMattersPage} />
      <Route path="/crm/tasks" component={CrmTasksPage} />
      <Route path="/institucional" component={InstitucionalPage} />
      <Route>
        <Redirect to="/command-center" />
      </Route>
    </Switch>
  );
}