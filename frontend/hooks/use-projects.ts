"use client";

import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectListItem,
  ProjectDetail,
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectListParams,
  UpdateProjectRequest,
  AddMemberRequest,
  AddMemberResponse,
} from "@/types/project";
import type { ApiSuccessResponse, PaginatedResponse } from "@/types/api";

export function useProjects(params?: ProjectListParams) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () =>
      api.get<ApiSuccessResponse<ProjectListItem[]> & { meta: PaginatedResponse<ProjectListItem>["meta"] }>(
        "/projects",
        params as Record<string, string | number | undefined>
      ),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () =>
      api.get<ApiSuccessResponse<ProjectDetail>>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      api.post<ApiSuccessResponse<CreateProjectResponse>>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      api.patch<ApiSuccessResponse<ProjectDetail>>(`/projects/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: AddMemberRequest }) =>
      api.post<ApiSuccessResponse<AddMemberResponse>>(`/projects/${projectId}/members`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ApiSuccessResponse<null>>(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      api.delete<ApiSuccessResponse<null>>(`/projects/${projectId}/members/${userId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}
