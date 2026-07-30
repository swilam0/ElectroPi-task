export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
