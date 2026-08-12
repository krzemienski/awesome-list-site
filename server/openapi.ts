/**
 * OpenAPI document for the registered Express API.
 *
 * Paths, methods, request parameters/bodies, auth metadata, and response/error
 * contracts are generated from the same named registry that guards requests at
 * runtime. Call this only after registerRoutes() has mounted the domain routers.
 */
import { generateOpenApiDocument } from "./contracts";
import { SITE_URL } from "./og-middleware";

export function getSwaggerSpec(): Record<string, any> {
  return generateOpenApiDocument({
    title: "Awesome Video API",
    version: "1.0.0",
    description:
      "Runtime-generated OpenAPI 3 contract for the Awesome Video catalog, user, contribution, journey, administration, export, link-health, and AI APIs.",
    servers: [
      {
        url: SITE_URL,
        description: "Awesome Video",
      },
    ],
  });
}