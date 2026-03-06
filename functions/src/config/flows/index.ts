import { FlowConfig } from "./types";
import { birthdayFlow } from "./birthday";
import { shopFlow } from "./shop";
import { eventFlow } from "./event";

export type UseCase = "birthday" | "shop" | "event";

const flowMap: Record<UseCase, FlowConfig> = {
  birthday: birthdayFlow,
  shop: shopFlow,
  event: eventFlow,
};

export function getFlowConfig(useCase: UseCase): FlowConfig {
  return flowMap[useCase];
}

export { FlowConfig, birthdayFlow, shopFlow, eventFlow };
