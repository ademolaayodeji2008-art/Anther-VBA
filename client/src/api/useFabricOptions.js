import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

/** Colour/Pattern/Nature/SaleType reference lists, shared by Sales, Invoice, and Return forms. */
export function useFabricOptions() {
  return useQuery({
    queryKey: ["fabric-options"],
    queryFn: async () => (await api.get("/fabric-options")).data,
    staleTime: Infinity,
  });
}
