import { useClientsContext, Client } from "@/components/clients-context";

export type { Client };

export function useClients() {
    return useClientsContext();
}
