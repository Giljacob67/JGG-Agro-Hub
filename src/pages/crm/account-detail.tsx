import type { ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { DetailBackLink } from "@/components/crm/detail-back-link";
import { AiAssistPanel } from "@/components/crm/ai-assist-panel";
import { ContactManager } from "@/components/crm/contact-manager";
import { PropertyManager } from "@/components/crm/property-manager";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAccountTimeline } from "@/hooks/use-crm-queries";
import { ACCOUNT_TYPE, RELATIONSHIP_STATUS, formatDate } from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

export default function CrmAccountDetailPage() {
  const [, params] = useRoute("/agro/crm/accounts/:id");
  const id = params?.id ?? "";
  const { data, isLoading, error } = useAccountTimeline(id);

  usePageTitle(data?.account ? data.account.name : "Conta");

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground p-6">Carregando conta…</p>
      </AppShell>
    );
  }

  if (error || !data?.account) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground p-6">Conta não encontrada.</p>
      </AppShell>
    );
  }

  const { account, timeline } = data;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <DetailBackLink href={ROUTES.crm.accounts} label="Contas Agro" />

        <header>
          <p className="text-xs font-mono text-muted-foreground">{account.id}</p>
          <h1 className="text-2xl font-bold mt-1">{account.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {account.region} · {ACCOUNT_TYPE[account.type]}
          </p>
        </header>

        <Card className="p-5 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Responsável interno</p>
            <p className="font-medium">{account.owner}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Área</p>
            <p>{account.areaHa ? `${account.areaHa.toLocaleString("pt-BR")} ha` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cliente desde</p>
            <p>{account.since || "—"}</p>
          </div>
          {account.relationshipStatus && (
            <div>
              <p className="text-xs text-muted-foreground">Status do relacionamento</p>
              <p>{RELATIONSHIP_STATUS[account.relationshipStatus]}</p>
            </div>
          )}
        </Card>

        {(account.properties?.length ||
          account.contacts?.length ||
          account.contractedAreas?.length ||
          account.mappedRisks?.length) && (
          <Card className="p-5 grid sm:grid-cols-2 gap-6 text-sm">
            {account.properties && account.properties.length > 0 && (
              <DetailList title="Propriedades vinculadas" items={account.properties} />
            )}
            {account.contacts && account.contacts.length > 0 && (
              <DetailList title="Contatos" items={account.contacts} />
            )}
            {account.contractedAreas && account.contractedAreas.length > 0 && (
              <DetailList title="Áreas contratadas" items={account.contractedAreas} />
            )}
            {account.mappedRisks && account.mappedRisks.length > 0 && (
              <DetailList title="Riscos mapeados" items={account.mappedRisks} />
            )}
          </Card>
        )}

        <section>
          <h2 className="text-lg font-bold mb-3">Timeline da conta</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <TimelineBlock title="Leads" count={timeline.leads.length}>
              {timeline.leads.map((l) => (
                <Link
                  key={l.id}
                  href={ROUTES.crm.leadDetail(l.id)}
                  className="block text-sm text-primary hover:underline"
                >
                  {l.name}
                </Link>
              ))}
            </TimelineBlock>
            <TimelineBlock title="Oportunidades" count={timeline.opportunities.length}>
              {timeline.opportunities.map((o) => (
                <Link
                  key={o.id}
                  href={ROUTES.crm.opportunityDetail(o.id)}
                  className="block text-sm text-primary hover:underline"
                >
                  {o.title}
                </Link>
              ))}
            </TimelineBlock>
            <TimelineBlock title="Demandas jurídicas" count={timeline.matters.length}>
              {timeline.matters.map((m) => (
                <Link
                  key={m.id}
                  href={ROUTES.crm.matterDetail(m.id)}
                  className="block text-sm text-primary hover:underline"
                >
                  {m.title}
                </Link>
              ))}
            </TimelineBlock>
            <TimelineBlock title="Tarefas vinculadas" count={timeline.tasks.length}>
              {timeline.tasks.map((t) => (
                <p key={t.id} className="text-sm">
                  {t.title}{" "}
                  <span className="text-muted-foreground">· {formatDate(t.dueDate)}</span>
                </p>
              ))}
            </TimelineBlock>
          </div>
        </section>

        <AiAssistPanel
          task="draft_notes"
          entityType="account"
          entityId={account.id}
          heading="Rascunho de notas (IA)"
          autoRun={false}
        />

        <div className="space-y-6">
          <ContactManager accountId={account.id} />
          <PropertyManager accountId={account.id} />
        </div>
      </div>
    </AppShell>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelineBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="muted">{count}</Badge>
      </div>
      <div className="space-y-2">
        {count === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum registro</p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}