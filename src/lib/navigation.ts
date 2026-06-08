import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Target,
  Scale,
  CheckSquare,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  {
    path: ROUTES.commandCenter,
    label: "Mesa de Operações",
    icon: LayoutDashboard,
  },
  { path: ROUTES.crm.root, label: "CRM Agro", icon: Users },
];

export const CRM_NAV: NavItem[] = [
  { path: ROUTES.crm.leads, label: "Leads", icon: UserPlus },
  { path: ROUTES.crm.accounts, label: "Contas", icon: Building2 },
  { path: ROUTES.crm.opportunities, label: "Oportunidades", icon: Target },
  { path: ROUTES.crm.matters, label: "Demandas jurídicas", icon: Scale },
  { path: ROUTES.crm.tasks, label: "Tarefas", icon: CheckSquare },
];