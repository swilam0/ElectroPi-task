import type { User } from "./auth";

export type { User };

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: "ADMIN" | "MEMBER";
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface ChangeRoleRequest {
  role: "ADMIN" | "MEMBER";
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}
