"use client";

import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/auth";
import type {
  UsersListParams,
  UpdateUserRequest,
  ChangeRoleRequest,
  ChangePasswordRequest,
} from "@/types/user";
import type { ApiSuccessResponse, PaginatedResponse } from "@/types/api";

export function useUsers(params?: UsersListParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () =>
      api.get<
        ApiSuccessResponse<User[]> & { meta: PaginatedResponse<User>["meta"] }
      >("/users", params as Record<string, string | number | undefined>),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => api.get<ApiSuccessResponse<User>>(`/users/${id}`),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      api.patch<ApiSuccessResponse<User>>(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangeRoleRequest }) =>
      api.patch<ApiSuccessResponse<User>>(`/users/${id}/role`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangePasswordRequest }) =>
      api.patch<ApiSuccessResponse<{ message: string }>>(
        `/users/${id}/password`,
        data
      ),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.delete<ApiSuccessResponse<null>>(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
