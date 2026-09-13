# Queue review testid inventory — before

## client/src/components/admin/PendingResources.tsx
data-testid="button-cancel-approve"
data-testid="button-cancel-reject"
data-testid="button-close-details"
data-testid="button-confirm-approve"
data-testid="button-confirm-reject"
data-testid="button-refresh-pending-resources"
data-testid="gradient-scroll-cue"
data-testid="hint-swipe-pending-table"
data-testid="link-detail-url"
data-testid="tags-detail-modal"
data-testid="textarea-rejection-reason"
data-testid="text-detail-url-invalid"
data-testid={`button-approve-${resource.id}`}
data-testid={`button-reject-${resource.id}`}
data-testid={`button-view-details-${resource.id}`}
data-testid={`link-resource-url-${resource.id}`}
data-testid={`row-pending-resource-${resource.id}`}
data-testid={`tags-pending-${resource.id}`}
## client/src/components/admin/PendingEdits.tsx
data-testid="button-confirm-approve-edit"
data-testid="button-confirm-reject-edit"
data-testid="button-refresh-pending-edits"
data-testid="gradient-scroll-cue-edits"
data-testid="input-rejection-reason"
data-testid="text-swipe-hint-edits"
data-testid={`button-approve-edit-${edit.id}`}
data-testid={`button-reject-edit-${edit.id}`}
data-testid={`button-view-edit-${edit.id}`}
data-testid={`link-edit-resource-${edit.id}`}
data-testid={`row-pending-edit-${edit.id}`}

# Existing handler/API selector references
client/src/components/admin/PendingResources.tsx:3:import { apiRequest } from "@/lib/queryClient";
client/src/components/admin/PendingResources.tsx:60:    queryKey: ['/api/admin/pending-resources'],
client/src/components/admin/PendingResources.tsx:94:      return await apiRequest(`/api/admin/resources/${resourceId}/approve`, {
client/src/components/admin/PendingResources.tsx:99:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:100:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingResources.tsx:119:      return await apiRequest(`/api/admin/resources/${resourceId}/reject`, {
client/src/components/admin/PendingResources.tsx:125:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:126:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingResources.tsx:249:                await queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:252:              data-testid="button-refresh-pending-resources"
client/src/components/admin/PendingResources.tsx:298:                data-testid="gradient-scroll-cue"
client/src/components/admin/PendingResources.tsx:337:                  <TableRow key={resource.id} data-testid={`row-pending-resource-${resource.id}`}>
client/src/components/admin/PendingResources.tsx:347:                          data-testid={`link-resource-url-${resource.id}`}
client/src/components/admin/PendingResources.tsx:377:                        <div className="flex flex-wrap gap-1 mt-1" data-testid={`tags-pending-${resource.id}`}>
client/src/components/admin/PendingResources.tsx:409:                          data-testid={`button-view-details-${resource.id}`}
client/src/components/admin/PendingResources.tsx:421:                          data-testid={`button-approve-${resource.id}`}
client/src/components/admin/PendingResources.tsx:432:                          data-testid={`button-reject-${resource.id}`}
client/src/components/admin/PendingResources.tsx:449:            <p className="text-xs text-muted-foreground mt-2" data-testid="hint-swipe-pending-table">
client/src/components/admin/PendingResources.tsx:487:                    data-testid="link-detail-url"
client/src/components/admin/PendingResources.tsx:495:                    data-testid="text-detail-url-invalid"
client/src/components/admin/PendingResources.tsx:510:                  <div className="flex flex-wrap gap-1 mt-1" data-testid="tags-detail-modal">
client/src/components/admin/PendingResources.tsx:564:              data-testid="button-close-details"
client/src/components/admin/PendingResources.tsx:589:            <AlertDialogCancel data-testid="button-cancel-approve">
client/src/components/admin/PendingResources.tsx:596:              data-testid="button-confirm-approve"
client/src/components/admin/PendingResources.tsx:628:                  data-testid="textarea-rejection-reason"
client/src/components/admin/PendingResources.tsx:639:              data-testid="button-cancel-reject"
client/src/components/admin/PendingResources.tsx:647:              data-testid="button-confirm-reject"
client/src/components/admin/PendingEdits.tsx:3:import { apiRequest } from "@/lib/queryClient";
client/src/components/admin/PendingEdits.tsx:70:    queryKey: ['/api/admin/resource-edits'],
client/src/components/admin/PendingEdits.tsx:105:      return await apiRequest(`/api/admin/resource-edits/${editId}/approve`, {
client/src/components/admin/PendingEdits.tsx:110:      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
client/src/components/admin/PendingEdits.tsx:111:      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingEdits.tsx:112:      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
client/src/components/admin/PendingEdits.tsx:132:      return await apiRequest(`/api/admin/resource-edits/${editId}/reject`, {
client/src/components/admin/PendingEdits.tsx:138:      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
client/src/components/admin/PendingEdits.tsx:139:      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingEdits.tsx:265:              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] })}
client/src/components/admin/PendingEdits.tsx:266:              data-testid="button-refresh-pending-edits"
client/src/components/admin/PendingEdits.tsx:305:                data-testid="gradient-scroll-cue-edits"
client/src/components/admin/PendingEdits.tsx:336:                  <TableRow key={edit.id} data-testid={`row-pending-edit-${edit.id}`}>
client/src/components/admin/PendingEdits.tsx:350:                              data-testid={`link-edit-resource-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:386:                          data-testid={`button-view-edit-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:400:                          data-testid={`button-approve-edit-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:411:                          data-testid={`button-reject-edit-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:424:              <p className="mt-2 text-xs text-muted-foreground" data-testid="text-swipe-hint-edits">
client/src/components/admin/PendingEdits.tsx:551:              data-testid="button-confirm-approve-edit"
client/src/components/admin/PendingEdits.tsx:578:                data-testid="input-rejection-reason"
client/src/components/admin/PendingEdits.tsx:599:              data-testid="button-confirm-reject-edit"
