import { useEffect } from "react";
import { JGG_AGRO_HUB_NAME, JGG_GROUP_NAME } from "@/lib/brand";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${JGG_AGRO_HUB_NAME} — ${JGG_GROUP_NAME}`;
  }, [title]);
}