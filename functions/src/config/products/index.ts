import { ProductConfig } from "./types";
import { birthdayProduct } from "./birthday";
import { businessProduct } from "./business";
import { eventProduct } from "./event";
import { resumeProduct } from "./resume";
import { weddingProduct } from "./wedding";
import { engagementProduct } from "./engagement";
import { partyProduct } from "./party";

export type UseCase = "birthday" | "business" | "event" | "resume" | "wedding" | "engagement" | "party";

export const productMap: Record<UseCase, ProductConfig> = {
  birthday:   birthdayProduct,
  business:   businessProduct,
  event:      eventProduct,
  resume:     resumeProduct,
  wedding:    weddingProduct,
  engagement: engagementProduct,
  party:      partyProduct,
};

export function getProductConfig(useCase: UseCase): ProductConfig {
  return productMap[useCase];
}

export { ProductConfig, birthdayProduct, businessProduct, eventProduct, resumeProduct, weddingProduct, engagementProduct, partyProduct };
