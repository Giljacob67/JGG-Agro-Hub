import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** id do elemento (ex.: heading) que rotula o dialog para leitores de tela. */
  labelledBy?: string;
  /** Fallback quando não há heading visível dentro do dialog. */
  ariaLabel?: string;
  /** Classes do container flex externo (alinhamento vertical, padding, scroll). */
  containerClassName?: string;
  /** Classes do painel focável (largura, margem, altura máxima). */
  panelClassName?: string;
}

/**
 * Dialog acessível compartilhado: backdrop + painel com role="dialog",
 * aria-modal, fechamento via Escape/clique no backdrop, focus trap (Tab
 * não escapa do painel) e retorno de foco ao elemento que abriu o dialog.
 */
export function Dialog({
  open,
  onClose,
  children,
  labelledBy,
  ariaLabel,
  containerClassName,
  panelClassName,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        containerClassName,
      )}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn("relative z-10 outline-none", panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}
