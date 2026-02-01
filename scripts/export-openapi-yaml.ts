#!/usr/bin/env tsx
/**
 * OpenAPI YAML Export Script
 *
 * This script exports the OpenAPI specification from server/openapi.ts
 * to a static YAML file for documentation purposes.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { dump } from 'js-yaml';
import { swaggerSpec } from '../server/openapi';

async function exportOpenApiYaml() {
  console.log('🚀 Starting OpenAPI YAML export...');

  try {
    // Create docs/api directory if it doesn't exist
    const apiDocsDir = join(process.cwd(), 'docs', 'api');
    if (!existsSync(apiDocsDir)) {
      mkdirSync(apiDocsDir, { recursive: true });
      console.log(`📁 Created directory: ${apiDocsDir}`);
    }

    // Convert OpenAPI spec to YAML
    console.log('🔄 Converting OpenAPI spec to YAML...');
    const yamlContent = dump(swaggerSpec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    // Write YAML file
    const yamlPath = join(apiDocsDir, 'openapi.yaml');
    writeFileSync(yamlPath, yamlContent, 'utf-8');
    console.log(`📄 OpenAPI spec written to: ${yamlPath}`);

    console.log('✨ OpenAPI YAML export completed successfully!');

  } catch (error) {
    console.error('❌ Error during OpenAPI YAML export:', error);
    process.exit(1);
  }
}

exportOpenApiYaml();
