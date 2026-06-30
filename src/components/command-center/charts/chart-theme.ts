/**
 * Paleta e helpers compartilhados dos gráficos do Command Center.
 *
 * Cores em `hsl(var(--token))` seguem o tema (claro/escuro) automaticamente.
 * A paleta categórica é multi-hue estável — mesma ordem ⇒ mesma cor entre
 * renders, evitando que uma fatia "troque de cor" a cada atualização.
 */

/** Cor primária do tema (verde agro), reativa a dark mode. */
export const PRIMARY = "hsl(var(--primary))";
export const MUTED = "hsl(var(--muted-foreground))";
export const BORDER = "hsl(var(--border))";

/**
 * Paleta categórica para dimensões (área de atuação, região). Tons que
 * funcionam em fundo claro e escuro, harmônicos com o verde agro.
 */
export const CATEGORICAL = [
  "hsl(155 42% 38%)", // verde agro
  "hsl(199 60% 45%)", // azul
  "hsl(38 78% 52%)", // âmbar
  "hsl(280 40% 55%)", // roxo
  "hsl(12 65% 55%)", // terracota
  "hsl(172 45% 42%)", // teal
  "hsl(95 38% 45%)", // oliva
  "hsl(330 45% 55%)", // magenta suave
];

export function categoricalColor(index: number): string {
  return CATEGORICAL[index % CATEGORICAL.length];
}
