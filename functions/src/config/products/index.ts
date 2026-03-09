import { ProductConfig } from "./types";
import { birthdayProduct } from "./birthday";
import { shopProduct } from "./shop";
import { eventProduct } from "./event";

export type UseCase = "birthday" | "shop" | "event";

export const productMap: Record<UseCase, ProductConfig> = {
  birthday: birthdayProduct,
  shop: shopProduct,
  event: eventProduct,
};

export function getProductConfig(useCase: UseCase): ProductConfig {
  return productMap[useCase];
}

export { ProductConfig, birthdayProduct, shopProduct, eventProduct };
