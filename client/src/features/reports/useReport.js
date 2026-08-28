import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function useReport(endpoint, params) {
  return useQuery({
    queryKey: ["reports", endpoint, params],
    queryFn: async () =>
      (
        await api.get(`/reports/${endpoint}`, {
          params: { startDate: params.startDate || undefined, endDate: params.endDate || undefined, ...params },
        })
      ).data,
  });
}
