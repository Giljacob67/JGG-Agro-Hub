import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Library,
  Sparkles,
  Users,
  UserPlus,
  Building2,
  Target,
  Scale,
  CheckSquare,
  Shield,
  CalendarDays,
  BarChart3,
  Activity,
  Sprout,
  Receipt,
  Leaf,
  Landmark,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  resource?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const INTELLIGENCE_NAV: NavItem[] = [
  {
    path: ROUTES.commandCenter,
    label: "Command Center",
    icon: LayoutDashboard,
    resource: "stats",
  },
  {
    path: ROUTES.copilot,
    label: "Agro Copilot",
    icon: Sparkles,
    resource: "copilot",
  },
  {
    path: ROUTES.knowledge,
    label: "Base de Conhecimento",
    icon: Library,
    resource: "knowledge",
  },
  {
    path: ROUTES.audit,
    label: "Auditoria",
    icon: Shield,
    resource: "stats",
  },
];

export const CRM_NAV: NavItem[] = [
  { path: ROUTES.crm.root, label: "Visão CRM", icon: Users, resource: "crm" },
  { path: ROUTES.crm.leads, label: "Leads", icon: UserPlus, resource: "leads" },
  { path: ROUTES.crm.accounts, label: "Contas", icon: Building2, resource: "accounts" },
  {
    path: ROUTES.crm.opportunities,
    label: "Oportunidades",
    icon: Target,
    resource: "opportunities",
  },
];

export const OPERATION_NAV: NavItem[] = [
  { path: ROUTES.crm.matters, label: "Demandas jurídicas", icon: Scale, resource: "matters" },
  { path: ROUTES.calendar, label: "Calendário", icon: CalendarDays, resource: "matters" },
  { path: ROUTES.crm.tasks, label: "Tarefas", icon: CheckSquare, resource: "tasks" },
  { path: ROUTES.reports, label: "Relatórios", icon: BarChart3, resource: "stats" },
  { path: ROUTES.productivity, label: "Produtividade", icon: Activity, resource: "stats" },
];

export const AGRI_NAV: NavItem[] = [
  { path: ROUTES.cropSeasons, label: "Safra Agrícola", icon: Sprout, resource: "matters" },
  { path: ROUTES.taxObligations, label: "ITR / ITBI / IPVA", icon: Receipt, resource: "matters" },
  { path: ROUTES.environmentalLicenses, label: "Licenças Ambientais", icon: Leaf, resource: "matters" },
  { path: ROUTES.creditInstruments, label: "Crédito Rural", icon: Landmark, resource: "matters" },
];

export const NAV_GROUPS: NavGroup[] = [
  { id: "intelligence", label: "IA Agro", items: INTELLIGENCE_NAV },
  { id: "crm", label: "CRM Agro", items: CRM_NAV },
  { id: "operation", label: "Operação", items: OPERATION_NAV },
  { id: "agri", label: "Gestão Agrícola", items: AGRI_NAV },
];

/** @deprecated Use NAV_GROUPS */
export const MAIN_NAV: NavItem[] = [
  ...INTELLIGENCE_NAV,
  { path: ROUTES.crm.root, label: "CRM Agro", icon: Users },
];