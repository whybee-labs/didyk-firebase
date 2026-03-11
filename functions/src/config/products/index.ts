import { ProductConfig } from "./types";
import { birthdayProduct } from "./birthday";
import { businessProduct } from "./business";
import { eventProduct } from "./event";
import { resumeProduct } from "./resume";

export type UseCase = "birthday" | "business" | "event" | "resume";

export const productMap: Record<UseCase, ProductConfig> = {
  birthday: birthdayProduct,
  business: businessProduct,
  event: eventProduct,
  resume: resumeProduct,
};

export function getProductConfig(useCase: UseCase): ProductConfig {
  return productMap[useCase];
}

export { ProductConfig, birthdayProduct, businessProduct, eventProduct, resumeProduct };
