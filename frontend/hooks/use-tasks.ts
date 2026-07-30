"use client";

import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Task,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
} from "@/types/task";
import type { ApiSuccessResponse, PaginatedResponse } from "@/types/api";

export function useProjectTasks(projectId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ["project-tasks", projectId, filters],
    queryFn: () =>
      api.get<
        ApiSuccessResponse<Task[]> & { meta: PaginatedResponse<Task>["meta"] }
      >(
        `/projects/${projectId}/tasks`,
        filters as Record<string, string | number | undefined>
      ),
    enabled: !!projectId,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api.get<ApiSuccessResponse<Task>>(`/tasks/${taskId}`),
    enabled: !!taskId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: CreateTaskRequest;
    }) =>
      api.post<ApiSuccessResponse<Task>>(
        `/projects/${projectId}/tasks`,
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project-tasks", variables.projectId],
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskRequest;
    }) => api.patch<ApiSuccessResponse<Task>>(`/tasks/${taskId}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data.data.id] });
      queryClient.invalidateQueries({
        queryKey: ["project-tasks", data.data.projectId],
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      api.delete<ApiSuccessResponse<null>>(`/tasks/${taskId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
  });
}
