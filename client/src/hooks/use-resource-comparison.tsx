import { useState, useCallback } from "react";
import { Resource } from "@/types/awesome-list";

export function useResourceComparison() {
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);

  const addResource = useCallback((resource: Resource) => {
    setSelectedResources(prev => {
      // Prevent duplicates based on URL
      if (prev.some(r => r.url === resource.url)) {
        return prev;
      }
      // Limit to 8 resources for better UX
      if (prev.length >= 8) {
        return [...prev.slice(1), resource];
      }
      return [...prev, resource];
    });
  }, []);

  const removeResource = useCallback((resource: Resource) => {
    setSelectedResources(prev => prev.filter(r => r.url !== resource.url));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedResources([]);
  }, []);

  const isSelected = useCallback((resource: Resource) => {
    return selectedResources.some(r => r.url === resource.url);
  }, [selectedResources]);

  const toggleResource = useCallback((resource: Resource) => {
    if (isSelected(resource)) {
      removeResource(resource);
    } else {
      addResource(resource);
    }
  }, [isSelected, addResource, removeResource]);

  return {
    selectedResources,
    addResource,
    removeResource,
    clearAll,
    isSelected,
    toggleResource,
    count: selectedResources.length
  };
}