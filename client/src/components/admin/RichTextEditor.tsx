import * as React from "react";
import { Bold, Italic, Underline, Strikethrough, Link, Heading, List, ListOrdered, Quote, Code } from "lucide-react";
import type { RichTextFieldConfig } from "./GenericCrudManager";

/**
 * Default toolbar configuration for rich text editor
 */
const DEFAULT_TOOLBAR: RichTextFieldConfig["toolbar"] = [
  "bold", "italic", "underline", "strikethrough", "link", "heading", "list", "orderedList", "quote", "code"
];

/**
 * Toolbar button configuration mapping
 */
const TOOLBAR_BUTTONS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; command: string; value?: string }> = {
  bold: { icon: Bold, label: "Bold", command: "bold" },
  italic: { icon: Italic, label: "Italic", command: "italic" },
  underline: { icon: Underline, label: "Underline", command: "underline" },
  strikethrough: { icon: Strikethrough, label: "Strikethrough", command: "strikeThrough" },
  link: { icon: Link, label: "Link", command: "createLink" },
  heading: { icon: Heading, label: "Heading", command: "formatBlock", value: "h3" },
  list: { icon: List, label: "Bullet List", command: "insertUnorderedList" },
  orderedList: { icon: ListOrdered, label: "Numbered List", command: "insertOrderedList" },
  quote: { icon: Quote, label: "Quote", command: "formatBlock", value: "blockquote" },
  code: { icon: Code, label: "Code", command: "formatBlock", value: "pre" },
};

/**
 * Rich Text Editor Component
 *
 * A simple contentEditable-based rich text editor with toolbar support.
 * Uses execCommand for formatting (works in all modern browsers).
 */
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  config?: RichTextFieldConfig;
  id?: string;
  "data-testid"?: string;
}

function RichTextEditor({ value, onChange, config, id, "data-testid": testId }: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const toolbar = config?.toolbar || DEFAULT_TOOLBAR;
  const minHeight = config?.minHeight || 150;
  const maxHeight = config?.maxHeight;
  const placeholder = config?.placeholder || "Enter content...";

  // Initialize editor content
  React.useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleCommand = (command: string, value?: string) => {
    if (command === "createLink") {
      const url = prompt("Enter URL:");
      if (url) {
        document.execCommand(command, false, url);
      }
    } else if (value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
    // Update the value after command execution
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-muted/50 border-b">
        {toolbar.map((tool) => {
          const buttonConfig = TOOLBAR_BUTTONS[tool];
          if (!buttonConfig) return null;
          const IconComponent = buttonConfig.icon;
          return (
            <button
              key={tool}
              type="button"
              onClick={() => handleCommand(buttonConfig.command, buttonConfig.value)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title={buttonConfig.label}
              aria-label={buttonConfig.label}
            >
              <IconComponent className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        id={id}
        data-testid={testId}
        contentEditable
        className={`px-3 py-2 outline-none prose prose-sm max-w-none ${!value && !isFocused ? "text-muted-foreground" : ""}`}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          overflowY: maxHeight ? "auto" : undefined,
        }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}


export { RichTextEditor };
