import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agroApi } from "@/lib/api/client";
import type { ComponentProps } from "react";

type Resource = "leads" | "accounts" | "opportunities" | "matters" | "tasks";

interface ExportCsvButtonProps extends ComponentProps<typeof Button> {
  resource: Resource;
}

export function ExportCsvButton({ resource, ...props }: ExportCsvButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => agroApi.exportCsv(resource)}
      {...props}
    >
      <Download className="w-3.5 h-3.5 mr-1" />
      Exportar CSV
    </Button>
  );
}
