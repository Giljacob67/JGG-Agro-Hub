import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { DIFFERENTIALS } from "@/lib/agro-content";
import {
  JGG_GROUP_NAME,
  JGG_TRIBUTARIO_LABEL,
  JGG_TRIBUTARIO_URL,
} from "@/lib/brand";

export function AgroDifferentials() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      <div className="space-y-4">
        {DIFFERENTIALS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="flex gap-4 p-4 rounded-xl border border-border/60 bg-card"
            >
              <div
                className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/15"
                aria-hidden="true"
              >
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {item.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.aside
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-border bg-muted/30 p-6 md:p-8 flex flex-col justify-center"
        aria-label="Ecossistema JGG Group"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-3">
          Ecossistema {JGG_GROUP_NAME}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Quando a operação exige análise fiscal especializada, articulamos com
          a frente tributária do {JGG_GROUP_NAME} — cada área com identidade,
          escopo e ferramentas próprias.
        </p>
        <a
          href={JGG_TRIBUTARIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md w-fit"
        >
          {JGG_TRIBUTARIO_LABEL}
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </motion.aside>
    </div>
  );
}