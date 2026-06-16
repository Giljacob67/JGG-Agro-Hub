/**
 * CNPJ/CPF lookup service.
 * Uses ReceitaWS (free) and BrasilAPI (free) for company/person data.
 *
 * Rate limits:
 * - ReceitaWS: 3 req/min (free tier)
 * - BrasilAPI: unlimited (community API)
 */

// ── Types ──────────────────────────────────────────────────────────

export interface CnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  dataSituacaoCadastral: string;
  motivoSituacaoCadastral: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  contato?: {
    telefone: string;
    email: string;
  };
  atividadePrincipal: string;
  atividadesSecundarias: string[];
  porte: string;
  naturezaJuridica: string;
  dataAbertura: string;
  capitalSocial: number;
  simplesNacional?: {
    optante: boolean;
    dataOpcao: string;
  };
  mei?: {
    optante: boolean;
  };
}

export interface CpfData {
  cpf: string;
  nome: string;
  Situacao: string;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Look up a CNPJ using ReceitaWS (free, 3 req/min).
 */
export async function lookupCnpj(cnpj: string): Promise<CnpjData | null> {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return null;

  try {
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${clean}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown>;

    if (data.status === "ERROR") return null;

    const d = data as Record<string, string>;
    const activities = data.atividade_principal as Array<{ text: string }> | undefined;
    const secActivities = data.atividades_secundarias as Array<{ text: string }> | undefined;
    const simples = data.simples_nacional as Record<string, string> | undefined;
    const mei = data.mei as Record<string, string> | undefined;

    return {
      cnpj: d.cnpj,
      razaoSocial: d.nome,
      nomeFantasia: d.fantasia || d.nome,
      situacaoCadastral: d.situacao_cadastral,
      dataSituacaoCadastral: d.data_situacao_cadastral,
      motivoSituacaoCadastral: d.motivo_situacao_cadastral,
      endereco: {
        logradouro: d.logradouro,
        numero: d.numero,
        complemento: d.complemento,
        bairro: d.bairro,
        municipio: d.municipio,
        uf: d.uf,
        cep: d.cep,
      },
      contato: {
        telefone: d.telefone,
        email: d.email,
      },
      atividadePrincipal: activities?.[0]?.text ?? "",
      atividadesSecundarias: secActivities?.map((a) => a.text) ?? [],
      porte: d.porte,
      naturezaJuridica: d.natureza_juridica,
      dataAbertura: d.abertura,
      capitalSocial: Number(d.capital_social) || 0,
      simplesNacional: simples
        ? {
            optante: simples.optante === "S",
            dataOpcao: simples.data_opcao || "",
          }
        : undefined,
      mei: mei ? { optante: mei.optante === "S" } : undefined,
    };
  } catch (err) {
    console.error("[CNPJ] Lookup failed:", err);
    return null;
  }
}

/**
 * Look up a CNPJ using BrasilAPI (free, unlimited).
 */
export async function lookupCnpjBrasilApi(cnpj: string): Promise<CnpjData | null> {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown>;
    const d = data as Record<string, string>;
    const secActivities = data.cnaes_secundarios as Array<{ codigo: number; descricao: string }> | undefined;

    return {
      cnpj: d.cnpj,
      razaoSocial: d.razao_social,
      nomeFantasia: d.nome_fantasia || d.razao_social,
      situacaoCadastral: d.situacao_cadastral,
      dataSituacaoCadastral: d.data_situacao_cadastral,
      motivoSituacaoCadastral: d.motivo_situacao_cadastral,
      endereco: {
        logradouro: d.logradouro,
        numero: d.numero,
        complemento: d.complemento,
        bairro: d.bairro,
        municipio: d.municipio,
        uf: d.uf,
        cep: d.cep,
      },
      contato: {
        telefone: d.telefone || d.ddd_telefone_1,
        email: d.email,
      },
      atividadePrincipal: d.cnae_fiscal?.toString() ?? "",
      atividadesSecundarias: secActivities?.map((c) => c.descricao) ?? [],
      porte: d.porte || "",
      naturezaJuridica: d.natureza_juridica || "",
      dataAbertura: d.data_abertura,
      capitalSocial: Number(d.capital_social) || 0,
    };
  } catch (err) {
    console.error("[CNPJ] BrasilAPI lookup failed:", err);
    return null;
  }
}

/**
 * Look up a CPF using BrasilAPI.
 * Note: CPF lookup is limited for privacy reasons.
 */
export async function lookupCpf(cpf: string): Promise<CpfData | null> {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cpf/v1/${clean}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown>;
    const d = data as Record<string, string>;

    return {
      cpf: d.cpf || clean,
      nome: d.nome,
      Situacao: d.situacao,
    };
  } catch (err) {
    console.error("[CPF] Lookup failed:", err);
    return null;
  }
}

/**
 * Validate CNPJ format.
 */
export function isValidCnpj(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;

  // Validate check digits
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(clean[12]) === digit1 && parseInt(clean[13]) === digit2;
}

/**
 * Validate CPF format.
 */
export function isValidCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;

  // Reject known invalid patterns
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i]) * (10 - i);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i]) * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(clean[9]) === digit1 && parseInt(clean[10]) === digit2;
}

/**
 * Format CNPJ for display.
 */
export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/**
 * Format CPF for display.
 */
export function formatCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, "");
  return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}
