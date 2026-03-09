import { UseCase } from "config/products";
import { CatalogUseCase } from "config/products/types";

export interface CatalogProduct {
  id: string;
  label: string;
  description: string;
  popular?: boolean;            // top 3 → shown as welcome buttons (skip category)
  productConfigId?: UseCase;    // points to ProductConfig for form fields + pricing; absent = coming soon
  useCases: CatalogUseCase[];
}

export interface CatalogCategory {
  id: string;
  label: string;
  description: string;
  products: CatalogProduct[];
}

export { CatalogUseCase };
