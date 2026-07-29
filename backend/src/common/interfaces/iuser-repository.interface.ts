export interface IUserRepository {
  findById(id: string): Promise<unknown>;
  findByEmail(email: string): Promise<unknown>;
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
}
