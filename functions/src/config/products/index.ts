import { ProductConfig } from "./types";
import { birthdayProduct } from "./birthday";
import { businessProduct } from "./business";
import { eventProduct } from "./event";

export type UseCase = "birthday" | "business" | "event";

export const productMap: Record<UseCase, ProductConfig> = {
  birthday: birthdayProduct,
  business: businessProduct,
  event: eventProduct,
};

export function getProductConfig(useCase: UseCase): ProductConfig {
  return productMap[useCase];
}

export { ProductConfig, birthdayProduct, businessProduct, eventProduct };
