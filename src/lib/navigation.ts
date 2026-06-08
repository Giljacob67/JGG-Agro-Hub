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

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  { path: "/command-center", label: "Mesa de Operações", icon: LayoutDashboard },
  { path: "/crm", label: "CRM Agro", icon: Users },
];

export const CRM_NAV: NavItem[] = [
  { path: "/crm/leads", label: "Leads", icon: UserPlus },
  { path: "/crm/accounts", label: "Contas", icon: Building2 },
  { path: "/crm/opportunities", label: "Oportunidades", icon: Target },
  { path: "/crm/matters", label: "Demandas jurídicas", icon: Scale },
  { path: "/crm/tasks", label: "Tarefas", icon: CheckSquare },
];