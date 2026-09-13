# Queue review testid inventory — after

## client/src/components/admin/PendingResources.tsx
data-testid="bulk-result-resources"
data-testid={`button-approve-${resource.id}`}
data-testid="button-bulk-approve"
data-testid="button-bulk-reject"
data-testid="button-cancel-approve"
data-testid="button-cancel-bulk-approve"
data-testid="button-cancel-bulk-reject"
data-testid="button-cancel-reject"
data-testid="button-close-details"
data-testid="button-confirm-approve"
data-testid="button-confirm-bulk-approve"
data-testid="button-confirm-bulk-reject"
data-testid="button-confirm-reject"
data-testid="button-refresh-pending-resources"
data-testid={`button-reject-${resource.id}`}
data-testid={`button-view-details-${resource.id}`}
data-testid={`checkbox-pending-resource-${resource.id}`}
data-testid="checkbox-select-all-pending-resources"
data-testid="error-approve-dialog"
data-testid="error-bulk-approve-dialog"
data-testid="error-bulk-reject-dialog"
data-testid="error-reject-dialog"
data-testid="gradient-scroll-cue"
data-testid="hint-swipe-pending-table"
data-testid="link-detail-url"
data-testid={`link-resource-url-${resource.id}`}
data-testid={`row-pending-resource-${resource.id}`}
data-testid="tags-detail-modal"
data-testid={`tags-pending-${resource.id}`}
data-testid="textarea-bulk-rejection-reason"
data-testid="textarea-rejection-reason"
data-testid="text-detail-url-invalid"
## client/src/components/admin/PendingEdits.tsx
data-testid={`button-approve-edit-${edit.id}`}
data-testid="button-cancel-approve-edit"
data-testid="button-cancel-reject-edit"
data-testid="button-confirm-approve-edit"
data-testid="button-confirm-reject-edit"
data-testid="button-refresh-pending-edits"
data-testid={`button-reject-edit-${edit.id}`}
data-testid={`button-view-edit-${edit.id}`}
data-testid="error-approve-edit-dialog"
data-testid="error-reject-edit-dialog"
data-testid="gradient-scroll-cue-edits"
data-testid="input-rejection-reason"
data-testid={`link-edit-resource-${edit.id}`}
data-testid={`row-pending-edit-${edit.id}`}
data-testid="text-swipe-hint-edits"

# Existing handler/API selector references
client/src/components/admin/PendingResources.tsx:3:import { apiRequest } from "@/lib/queryClient";
client/src/components/admin/PendingResources.tsx:94:    queryKey: ['/api/admin/pending-resources'],
client/src/components/admin/PendingResources.tsx:147:      return await apiRequest(`/api/admin/resources/${resourceId}/approve`, {
client/src/components/admin/PendingResources.tsx:152:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:153:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingResources.tsx:174:      return await apiRequest(`/api/admin/resources/${resourceId}/reject`, {
client/src/components/admin/PendingResources.tsx:180:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:181:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingResources.tsx:203:      return await apiRequest('/api/admin/resources/bulk/approve', {
client/src/components/admin/PendingResources.tsx:220:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:221:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingResources.tsx:240:      return await apiRequest('/api/admin/resources/bulk/reject', {
client/src/components/admin/PendingResources.tsx:258:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:259:      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingResources.tsx:405:          <div className={`queue-review-result ${bulkOutcome.failed > 0 ? "queue-review-result--error" : ""}`} role={bulkOutcome.failed > 0 ? "alert" : "status"} data-testid="bulk-result-resources">
client/src/components/admin/PendingResources.tsx:422:              await queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
client/src/components/admin/PendingResources.tsx:425:            data-testid="button-refresh-pending-resources"
client/src/components/admin/PendingResources.tsx:455:              data-testid="button-bulk-reject"
client/src/components/admin/PendingResources.tsx:463:              data-testid="button-bulk-approve"
client/src/components/admin/PendingResources.tsx:470:          <div className={`queue-review-result ${bulkOutcome.failed > 0 ? "queue-review-result--error" : ""}`} role={bulkOutcome.failed > 0 ? "alert" : "status"} data-testid="bulk-result-resources">
client/src/components/admin/PendingResources.tsx:490:                data-testid="gradient-scroll-cue"
client/src/components/admin/PendingResources.tsx:525:                      data-testid="checkbox-select-all-pending-resources"
client/src/components/admin/PendingResources.tsx:538:                  <TableRow key={resource.id} data-testid={`row-pending-resource-${resource.id}`}>
client/src/components/admin/PendingResources.tsx:544:                        data-testid={`checkbox-pending-resource-${resource.id}`}
client/src/components/admin/PendingResources.tsx:556:                          data-testid={`link-resource-url-${resource.id}`}
client/src/components/admin/PendingResources.tsx:586:                        <div className="flex flex-wrap gap-1 mt-1" data-testid={`tags-pending-${resource.id}`}>
client/src/components/admin/PendingResources.tsx:621:                          data-testid={`button-view-details-${resource.id}`}
client/src/components/admin/PendingResources.tsx:633:                          data-testid={`button-approve-${resource.id}`}
client/src/components/admin/PendingResources.tsx:644:                          data-testid={`button-reject-${resource.id}`}
client/src/components/admin/PendingResources.tsx:661:            <p className="text-xs text-muted-foreground mt-2" data-testid="hint-swipe-pending-table">
client/src/components/admin/PendingResources.tsx:698:                    data-testid="link-detail-url"
client/src/components/admin/PendingResources.tsx:706:                    data-testid="text-detail-url-invalid"
client/src/components/admin/PendingResources.tsx:721:                  <div className="flex flex-wrap gap-1 mt-1" data-testid="tags-detail-modal">
client/src/components/admin/PendingResources.tsx:775:              data-testid="button-close-details"
client/src/components/admin/PendingResources.tsx:797:             <Alert variant="destructive" data-testid="error-approve-dialog">
client/src/components/admin/PendingResources.tsx:809:            <AlertDialogCancel data-testid="button-cancel-approve">
client/src/components/admin/PendingResources.tsx:816:              data-testid="button-confirm-approve"
client/src/components/admin/PendingResources.tsx:838:             <Alert variant="destructive" data-testid="error-reject-dialog">
client/src/components/admin/PendingResources.tsx:857:                  data-testid="textarea-rejection-reason"
client/src/components/admin/PendingResources.tsx:871:              data-testid="button-cancel-reject"
client/src/components/admin/PendingResources.tsx:879:              data-testid="button-confirm-reject"
client/src/components/admin/PendingResources.tsx:900:             <Alert variant="destructive" data-testid="error-bulk-approve-dialog">
client/src/components/admin/PendingResources.tsx:906:             <AlertDialogCancel data-testid="button-cancel-bulk-approve">Cancel</AlertDialogCancel>
client/src/components/admin/PendingResources.tsx:911:               data-testid="button-confirm-bulk-approve"
client/src/components/admin/PendingResources.tsx:935:             <Alert variant="destructive" data-testid="error-bulk-reject-dialog">
client/src/components/admin/PendingResources.tsx:948:               data-testid="textarea-bulk-rejection-reason"
client/src/components/admin/PendingResources.tsx:958:               data-testid="button-cancel-bulk-reject"
client/src/components/admin/PendingResources.tsx:966:               data-testid="button-confirm-bulk-reject"
client/src/components/admin/PendingEdits.tsx:3:import { apiRequest } from "@/lib/queryClient";
client/src/components/admin/PendingEdits.tsx:81:    queryKey: ['/api/admin/resource-edits'],
client/src/components/admin/PendingEdits.tsx:116:      return await apiRequest(`/api/admin/resource-edits/${editId}/approve`, {
client/src/components/admin/PendingEdits.tsx:121:      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
client/src/components/admin/PendingEdits.tsx:122:      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingEdits.tsx:123:      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
client/src/components/admin/PendingEdits.tsx:145:      return await apiRequest(`/api/admin/resource-edits/${editId}/reject`, {
client/src/components/admin/PendingEdits.tsx:151:      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
client/src/components/admin/PendingEdits.tsx:152:      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
client/src/components/admin/PendingEdits.tsx:279:            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] })}
client/src/components/admin/PendingEdits.tsx:280:            data-testid="button-refresh-pending-edits"
client/src/components/admin/PendingEdits.tsx:313:                data-testid="gradient-scroll-cue-edits"
client/src/components/admin/PendingEdits.tsx:345:                  <TableRow key={edit.id} data-testid={`row-pending-edit-${edit.id}`}>
client/src/components/admin/PendingEdits.tsx:359:                              data-testid={`link-edit-resource-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:398:                          data-testid={`button-view-edit-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:412:                          data-testid={`button-approve-edit-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:423:                          data-testid={`button-reject-edit-${edit.id}`}
client/src/components/admin/PendingEdits.tsx:436:              <p className="mt-2 text-xs text-muted-foreground" data-testid="text-swipe-hint-edits">
client/src/components/admin/PendingEdits.tsx:561:             <Alert variant="destructive" data-testid="error-approve-edit-dialog">
client/src/components/admin/PendingEdits.tsx:569:               data-testid="button-cancel-approve-edit"
client/src/components/admin/PendingEdits.tsx:577:              data-testid="button-confirm-approve-edit"
client/src/components/admin/PendingEdits.tsx:599:             <Alert variant="destructive" data-testid="error-reject-edit-dialog">
client/src/components/admin/PendingEdits.tsx:613:                data-testid="input-rejection-reason"
client/src/components/admin/PendingEdits.tsx:628:               data-testid="button-cancel-reject-edit"
client/src/components/admin/PendingEdits.tsx:636:              data-testid="button-confirm-reject-edit"
