export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
}

export interface ProjectListItem {
  id: string;
  title: string;
  description: string;
  creator: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  taskCount: number;
}

export interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  creator: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
}

export interface CreateProjectResponse {
  id: string;
  title: string;
  description: string;
  creator: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
}

export interface AddMemberRequest {
  userId: string;
}

export interface AddMemberResponse {
  id: string;
  userId: string;
  projectId: string;
  joinedAt: string;
}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  sort?: "createdAt" | "title" | "updatedAt";
  order?: "asc" | "desc";
  search?: string;
}
