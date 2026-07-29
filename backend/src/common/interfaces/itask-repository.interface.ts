export interface ITaskReader {
  findById(id: string): Promise<unknown>;
  findByProject(projectId: string): Promise<unknown[]>;
}

export interface ITaskWriter {
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export interface ITaskRepository extends ITaskReader, ITaskWriter {}
