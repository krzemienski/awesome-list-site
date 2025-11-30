#!/bin/bash

# Script to fix all ID types from number to string in server/storage.ts

FILE="server/storage.ts"

# Interface method signatures
perl -i -pe 's/getResource\(id: number\)/getResource(id: string)/g' "$FILE"
perl -i -pe 's/updateResource\(id: number,/updateResource(id: string,/g' "$FILE"
perl -i -pe 's/updateResourceStatus\(id: number,/updateResourceStatus(id: string,/g' "$FILE"
perl -i -pe 's/deleteResource\(id: number\)/deleteResource(id: string)/g' "$FILE"

perl -i -pe 's/getCategory\(id: number\)/getCategory(id: string)/g' "$FILE"
perl -i -pe 's/updateCategory\(id: number,/updateCategory(id: string,/g' "$FILE"
perl -i -pe 's/deleteCategory\(id: number\)/deleteCategory(id: string)/g' "$FILE"

perl -i -pe 's/listSubcategories\(categoryId\?: number\)/listSubcategories(categoryId?: string)/g' "$FILE"
perl -i -pe 's/getSubcategory\(id: number\)/getSubcategory(id: string)/g' "$FILE"
perl -i -pe 's/updateSubcategory\(id: number,/updateSubcategory(id: string,/g' "$FILE"
perl -i -pe 's/deleteSubcategory\(id: number\)/deleteSubcategory(id: string)/g' "$FILE"

perl -i -pe 's/listSubSubcategories\(subcategoryId\?: number\)/listSubSubcategories(subcategoryId?: string)/g' "$FILE"
perl -i -pe 's/getSubSubcategory\(id: number\)/getSubSubcategory(id: string)/g' "$FILE"
perl -i -pe 's/updateSubSubcategory\(id: number,/updateSubSubcategory(id: string,/g' "$FILE"
perl -i -pe 's/deleteSubSubcategory\(id: number\)/deleteSubSubcategory(id: string)/g' "$FILE"

perl -i -pe 's/getTag\(id: number\)/getTag(id: string)/g' "$FILE"
perl -i -pe 's/deleteTag\(id: number\)/deleteTag(id: string)/g' "$FILE"

perl -i -pe 's/addTagToResource\(resourceId: number, tagId: number\)/addTagToResource(resourceId: string, tagId: string)/g' "$FILE"
perl -i -pe 's/removeTagFromResource\(resourceId: number, tagId: number\)/removeTagFromResource(resourceId: string, tagId: string)/g' "$FILE"
perl -i -pe 's/getResourceTags\(resourceId: number\)/getResourceTags(resourceId: string)/g' "$FILE"

perl -i -pe 's/getLearningJourney\(id: number\)/getLearningJourney(id: string)/g' "$FILE"
perl -i -pe 's/updateLearningJourney\(id: number,/updateLearningJourney(id: string,/g' "$FILE"
perl -i -pe 's/deleteLearningJourney\(id: number\)/deleteLearningJourney(id: string)/g' "$FILE"

perl -i -pe 's/listJourneySteps\(journeyId: number\)/listJourneySteps(journeyId: string)/g' "$FILE"
perl -i -pe 's/listJourneyStepsBatch\(journeyIds: number\[\]\): Promise<Map<number, JourneyStep\[\]\>>/listJourneyStepsBatch(journeyIds: string[]): Promise<Map<string, JourneyStep[]>>/g' "$FILE"
perl -i -pe 's/updateJourneyStep\(id: number,/updateJourneyStep(id: string,/g' "$FILE"
perl -i -pe 's/deleteJourneyStep\(id: number\)/deleteJourneyStep(id: string)/g' "$FILE"

perl -i -pe 's/addFavorite\(userId: string, resourceId: number\)/addFavorite(userId: string, resourceId: string)/g' "$FILE"
perl -i -pe 's/removeFavorite\(userId: string, resourceId: number\)/removeFavorite(userId: string, resourceId: string)/g' "$FILE"

perl -i -pe 's/addBookmark\(userId: string, resourceId: number,/addBookmark(userId: string, resourceId: string,/g' "$FILE"
perl -i -pe 's/removeBookmark\(userId: string, resourceId: number\)/removeBookmark(userId: string, resourceId: string)/g' "$FILE"

perl -i -pe 's/startUserJourney\(userId: string, journeyId: number\)/startUserJourney(userId: string, journeyId: string)/g' "$FILE"
perl -i -pe 's/updateUserJourneyProgress\(userId: string, journeyId: number, stepId: number\)/updateUserJourneyProgress(userId: string, journeyId: string, stepId: string)/g' "$FILE"
perl -i -pe 's/getUserJourneyProgress\(userId: string, journeyId: number\)/getUserJourneyProgress(userId: string, journeyId: string)/g' "$FILE"

perl -i -pe 's/logResourceAudit\(resourceId: number \| null,/logResourceAudit(resourceId: string | null,/g' "$FILE"
perl -i -pe 's/getResourceAuditLog\(resourceId: number,/getResourceAuditLog(resourceId: string,/g' "$FILE"

perl -i -pe 's/getResourceEdit\(id: number\)/getResourceEdit(id: string)/g' "$FILE"
perl -i -pe 's/getResourceEditsByResource\(resourceId: number\)/getResourceEditsByResource(resourceId: string)/g' "$FILE"
perl -i -pe 's/approveResourceEdit\(editId: number,/approveResourceEdit(editId: string,/g' "$FILE"
perl -i -pe 's/rejectResourceEdit\(editId: number,/rejectResourceEdit(editId: string,/g' "$FILE"

perl -i -pe 's/updateGithubSyncStatus\(id: number,/updateGithubSyncStatus(id: string,/g' "$FILE"

perl -i -pe 's/getEnrichmentJob\(id: number\)/getEnrichmentJob(id: string)/g' "$FILE"
perl -i -pe 's/updateEnrichmentJob\(id: number,/updateEnrichmentJob(id: string,/g' "$FILE"
perl -i -pe 's/cancelEnrichmentJob\(id: number\)/cancelEnrichmentJob(id: string)/g' "$FILE"

perl -i -pe 's/getEnrichmentQueueItemsByJob\(jobId: number\)/getEnrichmentQueueItemsByJob(jobId: string)/g' "$FILE"
perl -i -pe 's/getPendingEnrichmentQueueItems\(jobId: number,/getPendingEnrichmentQueueItems(jobId: string,/g' "$FILE"
perl -i -pe 's/updateEnrichmentQueueItem\(id: number,/updateEnrichmentQueueItem(id: string,/g' "$FILE"

# Fix Map type for journey steps
perl -i -pe 's/const grouped = new Map<number, JourneyStep\[\]\>\(\)/const grouped = new Map<string, JourneyStep[]>()/g' "$FILE"

# Remove completedSteps normalization code (lines that convert to numbers)
perl -i -0pe 's/\s*\/\/ Normalize completedSteps to numbers\s+if \(progress && progress\.completedSteps\) \{\s+progress\.completedSteps = progress\.completedSteps\.map\(id => Number\(id\)\);\s+\}\s+//g' "$FILE"
perl -i -0pe 's/\s*\/\/ Normalize completedSteps to numbers for each progress entry\s+return progressList\.map\(progress => \(\{\s+\.\.\.progress,\s+completedSteps: progress\.completedSteps \? progress\.completedSteps\.map\(id => Number\(id\)\) : \[\]\s+\}\)\);/    return progressList;/g' "$FILE"

echo "Done! Fixed all ID types from number to string in $FILE"
