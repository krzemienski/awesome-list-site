import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Archive, Tag, Download, Trash } from 'lucide-react';

export type BulkAction = 'approve' | 'reject' | 'archive' | 'delete' | 'tag' | 'export';

interface BulkActionsToolbarProps {
  selectedIds: string[];
  onAction: (action: BulkAction, ids: string[], data?: { tags?: string[] }) => Promise<void>;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedIds,
  onAction,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Hide toolbar when no selections
  if (selectedIds.length === 0) {
    return null;
  }

  const handleAction = async (action: BulkAction) => {
    setIsProcessing(true);
    try {
      await onAction(action, selectedIds);
      onClearSelection();
    } catch (error) {
      console.error(`Bulk action ${action} failed:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => handleAction('approve');

  const handleReject = () => {
    setShowRejectDialog(false);
    handleAction('reject');
  };

  const handleArchive = () => {
    setShowArchiveDialog(false);
    handleAction('archive');
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    handleAction('delete');
  };

  const handleTag = async () => {
    if (!tagInput.trim()) return;

    setShowTagDialog(false);
    setIsProcessing(true);
    try {
      // Parse comma-separated tags and pass to the action
      const tags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await onAction('tag', selectedIds, { tags });
      setTagInput('');
      onClearSelection();
    } catch (error) {
      console.error('Bulk tag action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    // Client-side CSV export
    const header = ['Resource ID', 'Title', 'URL', 'Category', 'Status'].join(',');
    const rows = selectedIds.map(id => `"${id}","Title","URL","Category","Status"`).join('\n');
    const csvContent = [header, rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `bulk-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-2 p-4 bg-muted/50 backdrop-blur-sm border-b">
        <span className="text-sm font-medium">
          {selectedIds.length} resource{selectedIds.length !== 1 ? 's' : ''} selected
        </span>

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApprove}
            disabled={isProcessing}
            className="bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/20"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRejectDialog(true)}
            disabled={isProcessing}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/20"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchiveDialog(true)}
            disabled={isProcessing}
          >
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagDialog(true)}
            disabled={isProcessing}
          >
            <Tag className="h-4 w-4 mr-1" />
            Add Tags
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isProcessing}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isProcessing}
            className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20"
          >
            <Trash className="h-4 w-4 mr-1" />
            Delete
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selectedIds.length} Resources?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject {selectedIds.length} selected resource{selectedIds.length !== 1 ? 's' : ''}.
              Rejected resources will not be visible to users and can be reviewed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedIds.length} Resources?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {selectedIds.length} selected resource{selectedIds.length !== 1 ? 's' : ''}.
              Archived resources can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isProcessing}
            >
              {isProcessing ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Resources?</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive">
              This will permanently delete {selectedIds.length} selected resource{selectedIds.length !== 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags to {selectedIds.length} Resources</DialogTitle>
            <DialogDescription>
              Enter tags separated by commas (e.g., video, encoding, tutorial)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="tag1, tag2, tag3"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTag();
                  }
                }}
                disabled={isProcessing}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTagDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTag}
              disabled={isProcessing || !tagInput.trim()}
            >
              {isProcessing ? 'Adding Tags...' : 'Add Tags'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
