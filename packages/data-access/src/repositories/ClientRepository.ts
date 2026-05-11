import type { ClientRecord } from "@noogym/types";

export interface ClientRepository {
  list(): Promise<ClientRecord[]>;
  findById(id: string): Promise<ClientRecord | null>;
  save(client: ClientRecord): Promise<ClientRecord>;
}
