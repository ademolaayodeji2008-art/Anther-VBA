import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

/** Generic list hook for the standard {items,total,page,limit} shape every list endpoint returns. */
export function useList(resource, params = {}) {
  return useQuery({
    queryKey: [resource, "list", params],
    queryFn: async () => {
      const { data } = await api.get(`/${resource}`, { params });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useGet(resource, id) {
  return useQuery({
    queryKey: [resource, "detail", id],
    queryFn: async () => {
      const { data } = await api.get(`/${resource}/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// `relatedResources` covers mutations that change data owned by another resource's list
// (e.g. posting an invoice payment changes the invoice's outstanding/paymentStatus, posting a
// sale/purchase/adjustment/return changes item stock levels) — without it, that other page's
// cached list silently shows stale data until something else happens to refetch it.
export function useCreate(resource, { relatedResources = [] } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post(`/${resource}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      relatedResources.forEach((r) => queryClient.invalidateQueries({ queryKey: [r] }));
    },
  });
}

export function useUpdate(resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.patch(`/${resource}/${id}`, body);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useRemove(resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/${resource}/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}

/** For action-style endpoints, e.g. POST /payment-vouchers/:id/approve. */
export function useAction(resource, action, { relatedResources = [] } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body } = {}) => {
      const path = id ? `/${resource}/${id}/${action}` : `/${resource}`;
      const { data } = await api.post(path, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      relatedResources.forEach((r) => queryClient.invalidateQueries({ queryKey: [r] }));
    },
  });
}
