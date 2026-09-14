import { z } from "zod";
import { RESOURCE_KIND_VALUES } from "./resourceKinds-core";

/**
 * The browser-safe values, types, mappings, and resolver live in
 * `resourceKinds-core`. Keep this compatibility module as the server-facing
 * boundary that adds the Zod schema used by request validation.
 */
export * from "./resourceKinds-core";

export const resourceKindSchema = z.enum(RESOURCE_KIND_VALUES);
