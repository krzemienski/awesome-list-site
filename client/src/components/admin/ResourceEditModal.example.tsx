/**
 * Example usage of ResourceEditModal component
 *
 * This file demonstrates how to integrate the ResourceEditModal
 * into an admin interface for editing resources.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import ResourceEditModal from "./ResourceEditModal";
import type { Resource } from "@shared/schema";

export default function ResourceEditExample() {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to update resource
  const updateResourceMutation = useMutation({
    mutationFn: async ({
      resourceId,
      updates,
    }: {
      resourceId: string;
      updates: Partial<Resource>;
    }) => {
      return await apiRequest(`/api/admin/resources/${resourceId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Resource Updated",
        description: "The resource has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (resource: Resource) => {
    setSelectedResource(resource);
    setIsEditModalOpen(true);
  };

  const handleSaveResource = async (
    resourceId: string,
    updates: Partial<Resource>
  ) => {
    await updateResourceMutation.mutateAsync({ resourceId, updates });
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedResource(null);
  };

  // Example resource for demonstration
  const exampleResource: Resource = {
    id: "example-uuid",
    title: "FFmpeg Documentation",
    url: "https://ffmpeg.org/documentation.html",
    description: "Complete FFmpeg documentation and guides",
    category: "Encoding & Codecs",
    subcategory: "Encoding Tools",
    subSubcategory: "FFmpeg",
    status: "approved",
    submittedBy: null,
    approvedBy: null,
    approvedAt: null,
    githubSynced: false,
    lastSyncedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Resource Edit Modal Example</h1>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">{exampleResource.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {exampleResource.description}
          </p>
          <Button onClick={() => handleEditClick(exampleResource)}>
            Edit Resource
          </Button>
        </div>
      </div>

      <ResourceEditModal
        resource={selectedResource}
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveResource}
      />
    </div>
  );
}
