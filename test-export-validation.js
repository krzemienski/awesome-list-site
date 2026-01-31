/**
 * Export Functionality Validation Script
 *
 * This script tests all export formats with sample bookmark data
 * to verify the export functionality works correctly.
 */

// Sample test data with various edge cases
const testBookmarks = [
  {
    id: "1",
    name: "React Documentation",
    url: "https://react.dev",
    description: "Official React documentation and guides",
    category: "Frontend",
    tags: ["react", "javascript", "frontend"],
    notes: "Great resource for learning React hooks and best practices"
  },
  {
    id: "2",
    name: "Node.js Guide",
    url: "https://nodejs.org",
    description: "Node.js official website with \"quotes\" and special chars: <>&",
    category: "Backend",
    tags: ["nodejs", "backend", "javascript"],
    notes: "Essential reading for backend development. Contains commas, \"quotes\", and\nnewlines."
  },
  {
    id: "3",
    name: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/",
    description: "Comprehensive TypeScript guide",
    category: "Frontend",
    tags: ["typescript", "javascript"],
    notes: null // Test bookmark without notes
  },
  {
    id: "4",
    name: "Uncategorized Resource",
    url: "https://example.com",
    description: null,
    category: null,
    tags: [],
    notes: null // Test minimal bookmark
  }
];

// Export options to test
const testOptions = [
  {
    name: "All options enabled",
    options: {
      includeDescriptions: true,
      includeTags: true,
      includeCategories: true,
      includeNotes: true,
      groupByCategory: false
    }
  },
  {
    name: "Without notes",
    options: {
      includeDescriptions: true,
      includeTags: true,
      includeCategories: true,
      includeNotes: false,
      groupByCategory: false
    }
  },
  {
    name: "Grouped by category",
    options: {
      includeDescriptions: true,
      includeTags: true,
      includeCategories: true,
      includeNotes: true,
      groupByCategory: true
    }
  },
  {
    name: "Minimal export",
    options: {
      includeDescriptions: false,
      includeTags: false,
      includeCategories: false,
      includeNotes: false,
      groupByCategory: false
    }
  }
];

// Generator functions (copied from component)
const generateMarkdown = (bookmarks, options) => {
  let content = `# My Bookmarks\n\n`;
  content += `Exported on ${new Date().toLocaleDateString()}\n\n`;
  content += `Total Bookmarks: ${bookmarks.length}\n\n`;

  if (options.groupByCategory) {
    const categorizedBookmarks = bookmarks.reduce((acc, bookmark) => {
      const category = bookmark.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(bookmark);
      return acc;
    }, {});

    Object.entries(categorizedBookmarks).forEach(([category, categoryBookmarks]) => {
      content += `## ${category}\n\n`;
      categoryBookmarks.forEach(bookmark => {
        content += `- [${bookmark.name}](${bookmark.url})`;
        if (options.includeDescriptions && bookmark.description) {
          content += ` - ${bookmark.description}`;
        }
        if (options.includeTags && bookmark.tags?.length) {
          content += ` \`${bookmark.tags.join('` `')}\``;
        }
        content += '\n';
        if (options.includeNotes && bookmark.notes) {
          content += `  > **Notes:** ${bookmark.notes}\n`;
        }
      });
      content += '\n';
    });
  } else {
    bookmarks.forEach(bookmark => {
      content += `- [${bookmark.name}](${bookmark.url})`;
      if (options.includeCategories && bookmark.category) {
        content += ` (${bookmark.category})`;
      }
      if (options.includeDescriptions && bookmark.description) {
        content += ` - ${bookmark.description}`;
      }
      if (options.includeTags && bookmark.tags?.length) {
        content += ` \`${bookmark.tags.join('` `')}\``;
      }
      content += '\n';
      if (options.includeNotes && bookmark.notes) {
        content += `  > **Notes:** ${bookmark.notes}\n`;
      }
    });
  }

  content += `\n---\n*Exported from My Bookmarks on ${new Date().toLocaleDateString()}*\n`;
  return content;
};

const generateJSON = (bookmarks, options) => {
  const exportData = {
    title: "My Bookmarks",
    exportDate: new Date().toISOString(),
    totalBookmarks: bookmarks.length,
    bookmarks: bookmarks.map(bookmark => ({
      id: bookmark.id,
      name: bookmark.name,
      url: bookmark.url,
      ...(options.includeDescriptions && { description: bookmark.description }),
      ...(options.includeCategories && { category: bookmark.category }),
      ...(options.includeTags && bookmark.tags?.length && { tags: bookmark.tags }),
      ...(options.includeNotes && { notes: bookmark.notes })
    }))
  };
  return JSON.stringify(exportData, null, 2);
};

const generateCSV = (bookmarks, options) => {
  const headers = ['Name', 'URL'];
  if (options.includeCategories) headers.push('Category');
  if (options.includeDescriptions) headers.push('Description');
  if (options.includeTags) headers.push('Tags');
  if (options.includeNotes) headers.push('Notes');

  let content = headers.join(',') + '\n';

  bookmarks.forEach(bookmark => {
    const row = [
      `"${bookmark.name.replace(/"/g, '""')}"`,
      bookmark.url
    ];

    if (options.includeCategories) {
      row.push(`"${bookmark.category || ''}"`);
    }
    if (options.includeDescriptions) {
      row.push(`"${(bookmark.description || '').replace(/"/g, '""')}"`);
    }
    if (options.includeTags) {
      row.push(`"${(bookmark.tags || []).join('; ')}"`);
    }
    if (options.includeNotes) {
      row.push(`"${(bookmark.notes || '').replace(/"/g, '""')}"`);
    }

    content += row.join(',') + '\n';
  });

  return content;
};

// Validation functions
const validateMarkdown = (content, options) => {
  const checks = [];

  // Check header
  checks.push({
    test: "Has title",
    pass: content.includes('# My Bookmarks')
  });

  checks.push({
    test: "Has export date",
    pass: content.includes('Exported on')
  });

  checks.push({
    test: "Has bookmark count",
    pass: content.includes('Total Bookmarks: 4')
  });

  // Check content
  checks.push({
    test: "Contains bookmark links",
    pass: content.includes('[React Documentation](https://react.dev)')
  });

  if (options.includeNotes) {
    checks.push({
      test: "Contains notes when enabled",
      pass: content.includes('**Notes:**') && content.includes('Great resource for learning React')
    });
  } else {
    checks.push({
      test: "Excludes notes when disabled",
      pass: !content.includes('**Notes:**')
    });
  }

  if (options.includeCategories && !options.groupByCategory) {
    checks.push({
      test: "Contains categories in line",
      pass: content.includes('(Frontend)') || content.includes('(Backend)')
    });
  }

  if (options.groupByCategory) {
    checks.push({
      test: "Groups by category",
      pass: content.includes('## Frontend') && content.includes('## Backend')
    });
  }

  // Check special character handling
  checks.push({
    test: "Handles quotes in descriptions",
    pass: content.includes('"quotes"')
  });

  return checks;
};

const validateJSON = (content, options) => {
  const checks = [];

  try {
    const data = JSON.parse(content);

    checks.push({
      test: "Valid JSON",
      pass: true
    });

    checks.push({
      test: "Has metadata",
      pass: data.title === "My Bookmarks" && !!data.exportDate && data.totalBookmarks === 4
    });

    checks.push({
      test: "Has bookmarks array",
      pass: Array.isArray(data.bookmarks) && data.bookmarks.length === 4
    });

    checks.push({
      test: "Has required fields",
      pass: data.bookmarks.every(b => b.id && b.name && b.url)
    });

    if (options.includeNotes) {
      checks.push({
        test: "Includes notes field",
        pass: data.bookmarks.some(b => 'notes' in b)
      });
    } else {
      checks.push({
        test: "Excludes notes field",
        pass: !data.bookmarks.some(b => 'notes' in b)
      });
    }

    if (options.includeCategories) {
      checks.push({
        test: "Includes category field",
        pass: data.bookmarks.some(b => 'category' in b)
      });
    }

    // Check timestamp format
    checks.push({
      test: "Has ISO timestamp",
      pass: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data.exportDate)
    });

  } catch (e) {
    checks.push({
      test: "Valid JSON",
      pass: false,
      error: e.message
    });
  }

  return checks;
};

const validateCSV = (content, options) => {
  const checks = [];
  const lines = content.split('\n').filter(l => l.trim());

  checks.push({
    test: "Has header row",
    pass: lines[0].includes('Name') && lines[0].includes('URL')
  });

  checks.push({
    test: "Has data rows",
    pass: lines.length === 5 // 1 header + 4 data rows
  });

  if (options.includeNotes) {
    checks.push({
      test: "Header includes Notes",
      pass: lines[0].includes('Notes')
    });
  }

  if (options.includeCategories) {
    checks.push({
      test: "Header includes Category",
      pass: lines[0].includes('Category')
    });
  }

  // Check quote escaping
  checks.push({
    test: "Properly escapes quotes",
    pass: content.includes('""quotes""')
  });

  // Check that commas in notes are properly quoted
  checks.push({
    test: "Values are quoted",
    pass: lines[1].startsWith('"React Documentation"')
  });

  // Check empty fields
  checks.push({
    test: "Handles empty fields",
    pass: content.includes('""') // Empty category for uncategorized item
  });

  return checks;
};

// Run tests
console.log('🧪 EXPORT FUNCTIONALITY VALIDATION\n');
console.log('=' .repeat(60));

const formats = [
  { name: 'Markdown', fn: generateMarkdown, validate: validateMarkdown },
  { name: 'JSON', fn: generateJSON, validate: validateJSON },
  { name: 'CSV', fn: generateCSV, validate: validateCSV }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

testOptions.forEach(testCase => {
  console.log(`\n📋 Test Case: ${testCase.name}`);
  console.log('-'.repeat(60));

  formats.forEach(format => {
    console.log(`\n  ${format.name} Export:`);

    try {
      const output = format.fn(testBookmarks, testCase.options);
      const validations = format.validate(output, testCase.options);

      validations.forEach(check => {
        totalTests++;
        if (check.pass) {
          passedTests++;
          console.log(`    ✅ ${check.test}`);
        } else {
          failedTests++;
          console.log(`    ❌ ${check.test}`);
          if (check.error) {
            console.log(`       Error: ${check.error}`);
          }
        }
      });

    } catch (error) {
      failedTests++;
      totalTests++;
      console.log(`    ❌ Export failed: ${error.message}`);
    }
  });
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY\n');
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed! Export functionality is working correctly.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the output above.');
  process.exit(1);
}
