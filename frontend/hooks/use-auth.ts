"use client";

import { api, setTokenGetter } from "@/lib/api";
import {
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  setUser,
  clearTokens,
  getRefreshToken,
  isAuthenticated,
} from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  User,
} from "@/types/auth";
import type { ApiSuccessResponse } from "@/types/api";


export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<ApiSuccessResponse<LoginResponse>>("/auth/login", data),
    onSuccess: (response) => {
      if (response.status === "success") {
        setAccessToken(response.data.accessToken);
        setRefreshToken(response.data.refreshToken);
        setUser(response.data.user);
        queryClient.setQueryData(["me"], { status: "success", data: response.data.user });
      }
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      api.post<ApiSuccessResponse<RegisterResponse>>("/auth/register", data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const refreshToken = getRefreshToken();
      return api.post("/auth/logout", { refreshToken });
    },
    onSuccess: () => {
      clearTokens();
      queryClient.clear();
    },
    onError: () => {
      clearTokens();
      queryClient.clear();
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<ApiSuccessResponse<User>>("/auth/me"),
    enabled: isAuthenticated,
  });
}
