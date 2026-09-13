import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const SOURCE_ROOT = "awesome-list-site-ds/docs";
const OUTPUT_ROOT = "artifacts/awesome-video-design-system/docs";
const SOURCE_README = "README.md";
const CHAPTER_FILENAMES = [
  "01-overview.md",
  "02-principles.md",
  "03-getting-started.md",
  "04-tokens.md",
  "05-theming.md",
  "06-typography.md",
  "07-color.md",
  "08-spacing-layout.md",
  "09-motion.md",
  "10-components.md",
  "11-patterns.md",
  "12-integration-html.md",
  "13-integration-react.md",
  "14-integration-nextjs.md",
  "15-integration-vue.md",
  "16-migration.md",
  "17-accessibility.md",
  "18-launch-checklist.md",
];
const LIVE_DOC_GROUPS = [
  {
    label: "Start",
    chapters: [
      ["overview", "Overview"],
      ["principles", "Principles"],
      ["getting-started", "Getting started"],
    ],
  },
  {
    label: "Foundations",
    chapters: [
      ["tokens", "Token contract"],
      ["theming", "Theming & switching"],
      ["typography", "Typography"],
      ["color", "Color & accent"],
      ["spacing", "Spacing & layout"],
      ["motion", "Motion"],
    ],
  },
  {
    label: "Components",
    chapters: [
      ["buttons", "Buttons"],
      ["cards", "Cards"],
      ["forms", "Forms"],
      ["navigation", "Navigation"],
      ["lists", "List patterns"],
    ],
  },
  {
    label: "Patterns",
    chapters: [
      ["flows", "Flow diagrams"],
      ["pages", "Page templates"],
      ["data-density", "Data density"],
    ],
  },
  {
    label: "Apply",
    chapters: [
      ["integration", "Integrate the system"],
      ["theming-app", "Theming an app"],
      ["a11y", "Accessibility"],
      ["checklist", "Launch checklist"],
    ],
  },
];

const sha256 = (contents) =>
  crypto.createHash("sha256").update(contents).digest("hex");

const slashPath = (filePath) => filePath.split(path.sep).join("/");

function readSource(rootDir, filename) {
  const relativePath = path.join(SOURCE_ROOT, filename);
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing frozen source: ${slashPath(relativePath)}`);
  }
  return {
    absolutePath,
    relativePath: slashPath(relativePath),
    contents: fs.readFileSync(absolutePath, "utf8"),
  };
}

function frontmatter(sourcePath, contents) {
  return [
    "---",
    `source: ${sourcePath}`,
    `sha256: ${sha256(contents)}`,
    "---",
    "",
  ].join("\n");
}

function renderChapter(rootDir, filename) {
  const source = readSource(rootDir, filename);
  return {
    filename,
    sourcePath: source.relativePath,
    outputPath: path.join(OUTPUT_ROOT, filename),
    contents: `${frontmatter(source.relativePath, source.contents)}${source.contents}`,
  };
}

function renderLiveDocsIndex() {
  return [
    "",
    "### Live docs chapters",
    "",
    ...LIVE_DOC_GROUPS.flatMap((group) => [
      `#### ${group.label}`,
      "",
      ...group.chapters.map(
        ([id, title]) => `- [${title}](/#docs-${id})`,
      ),
      "",
    ]),
  ].join("\n");
}

function renderReadme(rootDir) {
  const source = readSource(rootDir, SOURCE_README);
  const liveLink = [
    "",
    "---",
    "",
    "## Live artifact docs",
    "",
    "Open the live chapter navigator: [/#docs-overview](/#docs-overview).",
    renderLiveDocsIndex(),
    "",
  ].join("\n");
  return {
    filename: SOURCE_README,
    sourcePath: source.relativePath,
    outputPath: path.join(OUTPUT_ROOT, SOURCE_README),
    contents: `${frontmatter(source.relativePath, source.contents)}${source.contents.trimEnd()}${liveLink}`,
  };
}

function expectedDocuments(rootDir) {
  return [
    renderReadme(rootDir),
    ...CHAPTER_FILENAMES.map((filename) => renderChapter(rootDir, filename)),
  ];
}

function outputFiles(rootDir) {
  const absoluteRoot = path.join(rootDir, OUTPUT_ROOT);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs
    .readdirSync(absoluteRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

function checkDocuments(rootDir) {
  const expected = expectedDocuments(rootDir);
  const expectedByPath = new Map(
    expected.map((document) => [document.filename, document]),
  );
  const actualFilenames = outputFiles(rootDir);
  const expectedFilenames = [...expectedByPath.keys()].sort();
  const problems = [];

  for (const filename of expectedFilenames) {
    const document = expectedByPath.get(filename);
    const absolutePath = path.join(rootDir, OUTPUT_ROOT, filename);
    if (!fs.existsSync(absolutePath)) {
      problems.push(`missing generated document: ${document.outputPath}`);
      continue;
    }

    const actual = fs.readFileSync(absolutePath, "utf8");
    if (actual !== document.contents) {
      const header = actual.match(
        /^---\nsource: ([^\n]+)\nsha256: ([0-9a-f]{64})\n---\n/,
      );
      if (!header) {
        problems.push(
          `${document.outputPath}: missing or malformed source/sha256 frontmatter`,
        );
      } else if (header[1] !== document.sourcePath) {
        problems.push(
          `${document.outputPath}: source is ${header[1]}, expected ${document.sourcePath}`,
        );
      } else {
        const source = readSource(rootDir, filename);
        if (header[2] !== sha256(source.contents)) {
          problems.push(
            `${document.outputPath}: sha256 does not match ${document.sourcePath}`,
          );
        } else {
          problems.push(
            `${document.outputPath}: generated content is stale or was edited`,
          );
        }
      }
    }
  }

  for (const filename of actualFilenames) {
    if (!expectedByPath.has(filename)) {
      problems.push(
        `${slashPath(path.join(OUTPUT_ROOT, filename))}: unexpected markdown file`,
      );
    }
  }

  if (problems.length) {
    throw new Error(
      `Design-system artifact docs are out of date:\n${problems
        .map((problem) => `  - ${problem}`)
        .join("\n")}`,
    );
  }

  return {
    checked: expected.length,
    chapters: CHAPTER_FILENAMES.length,
    outputRoot: OUTPUT_ROOT,
  };
}

export function generateArtifactDocs({ rootDir = PROJECT_ROOT } = {}) {
  const documents = expectedDocuments(path.resolve(rootDir));
  const outputDir = path.join(rootDir, OUTPUT_ROOT);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const document of documents) {
    fs.writeFileSync(
      path.join(outputDir, document.filename),
      document.contents,
      "utf8",
    );
  }
  return {
    generated: documents.length,
    chapters: CHAPTER_FILENAMES.length,
    outputRoot: OUTPUT_ROOT,
  };
}

export function checkArtifactDocs({ rootDir = PROJECT_ROOT } = {}) {
  return checkDocuments(path.resolve(rootDir));
}

function parseCli(args) {
  let checkOnly = false;
  let docsOnly = false;
  let rootDir = PROJECT_ROOT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--check") {
      checkOnly = true;
      continue;
    }
    if (arg === "--docs") {
      docsOnly = true;
      continue;
    }
    if (arg === "--root") {
      const root = args[index + 1];
      if (!root || root.startsWith("--")) {
        throw new Error("--root requires a directory");
      }
      rootDir = path.resolve(root);
      index += 1;
      continue;
    }
    throw new Error(`Unknown CLI flag: ${arg}`);
  }

  return { checkOnly, docsOnly, rootDir };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  try {
    const { checkOnly, docsOnly, rootDir } = parseCli(process.argv.slice(2));
    if (docsOnly || checkOnly) {
      if (checkOnly) {
        const result = checkArtifactDocs({ rootDir });
        console.log(
          `Design-system artifact docs: up to date (${result.chapters} chapters, ${result.checked} files)`,
        );
      } else {
        const result = generateArtifactDocs({ rootDir });
        console.log(
          `Generated ${result.outputRoot} (${result.chapters} chapters, ${result.generated} files)`,
        );
      }
    } else {
      const result = generateArtifactDocs({ rootDir });
      console.log(
        `Generated ${result.outputRoot} (${result.chapters} chapters, ${result.generated} files)`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}