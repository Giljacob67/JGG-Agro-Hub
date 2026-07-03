import { useQuery } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

export function useTimeEntries() {
  return useQuery({
    queryKey: ["crm", "timeEntries"],
    queryFn: () => agroApi.listTimeEntries({}),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["crm", "invoices"],
    queryFn: () => agroApi.listInvoices({}),
  });
}

export function useContacts() {
  return useQuery({
    queryKey: ["crm", "contacts"],
    queryFn: () => agroApi.listContacts({}),
  });
}

export function useProperties() {
  return useQuery({
    queryKey: ["crm", "properties"],
    queryFn: () => agroApi.listProperties({}),
  });
}
