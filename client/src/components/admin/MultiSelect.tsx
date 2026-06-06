import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { X, ChevronsUpDown, Check } from "lucide-react";
import type { MultiSelectFieldConfig, MultiSelectOption } from "./GenericCrudManager";

/**
 * Multi-Select Dropdown Component
 *
 * A combobox-style multi-select component with search support and badge display.
 * Supports both static options and dynamic options from API.
 */
interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  config?: MultiSelectFieldConfig;
  id?: string;
  "data-testid"?: string;
}

function MultiSelect({ value, onChange, config, id, "data-testid": testId }: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const placeholder = config?.placeholder || "Select items...";
  const maxItems = config?.maxItems;
  const searchable = config?.searchable ?? true;
  const valueField = config?.valueField || "id";
  const labelField = config?.labelField || "name";

  // Fetch dynamic options if fetchUrl is provided
  const { data: fetchedOptions } = useQuery<any[]>({
    queryKey: [config?.queryKey || config?.fetchUrl],
    queryFn: async () => {
      if (!config?.fetchUrl) return [];
      const response = await fetch(config.fetchUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch options');
      return response.json();
    },
    enabled: !!config?.fetchUrl
  });

  // Combine static and fetched options
  const allOptions: MultiSelectOption[] = React.useMemo(() => {
    if (config?.options) return config.options;
    if (fetchedOptions) {
      return fetchedOptions.map(item => ({
        value: String(item[valueField]),
        label: String(item[labelField])
      }));
    }
    return [];
  }, [config?.options, fetchedOptions, valueField, labelField]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allOptions;
    return allOptions.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allOptions, searchQuery]);

  // Get labels for selected values
  const selectedLabels = React.useMemo(() => {
    return value.map(v => {
      const opt = allOptions.find(o => o.value === v);
      return opt?.label || v;
    });
  }, [value, allOptions]);

  // Handle clicking outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      if (maxItems && value.length >= maxItems) return;
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };

  return (
    <div ref={containerRef} className="relative" id={id} data-testid={testId}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid={testId ? `${testId}-trigger` : undefined}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((label, idx) => (
              <span
                key={value[idx]}
                className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md text-xs"
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => removeOption(value[idx], e)}
                  className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  data-testid={testId ? `${testId}-remove-${value[idx]}` : undefined}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {searchable && (
            <div className="p-2 border-b">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
                data-testid={testId ? `${testId}-search` : undefined}
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled = !isSelected && maxItems && value.length >= maxItems;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isDisabled && toggleOption(option.value)}
                    disabled={isDisabled}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
                      isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
          {maxItems && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
              {value.length} / {maxItems} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export { MultiSelect };
