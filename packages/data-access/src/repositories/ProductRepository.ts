import type { ProductRecord } from "@noogym/types";

export interface ProductRepository {
  list(): Promise<ProductRecord[]>;
  findById(id: string): Promise<ProductRecord | null>;
  save(product: ProductRecord): Promise<ProductRecord>;
}
