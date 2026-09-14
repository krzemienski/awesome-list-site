import { z } from "zod";
import {
  RESOURCE_FORMAT_VALUES,
  RESOURCE_PROVIDER_VALUES,
  RESOURCE_SKILL_LEVEL_VALUES,
} from "./resourceFacets-core";

/**
 * Keep validation-library schemas behind this server/request-validation
 * boundary. Browser surfaces that only render facet values and labels should
 * import `resourceFacets-core` instead.
 */
export * from "./resourceFacets-core";

export const resourceFormatSchema = z.enum(RESOURCE_FORMAT_VALUES);
export const resourceProviderSchema = z.enum(RESOURCE_PROVIDER_VALUES);
export const resourceSkillLevelSchema = z.enum(RESOURCE_SKILL_LEVEL_VALUES);
