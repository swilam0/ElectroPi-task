export interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
}

export interface ApiFailResponse {
  status: "fail";
  data: Record<string, string>;
}

export interface ApiErrorResponse {
  status: "error";
  message: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailResponse | ApiErrorResponse;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
