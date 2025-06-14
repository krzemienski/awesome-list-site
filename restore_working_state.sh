#!/bin/bash

# Restore all working files from the last known good commit
COMMIT="89d17d8934a8cbc024e9f7bb0ce2ca95672c4137"

# Get the complete file list from that commit
git show $COMMIT --name-only | grep "client/" > working_files.txt

# Restore each file
while IFS= read -r file; do
    if [ -f "$file" ]; then
        echo "Restoring $file"
        git show "$COMMIT:$file" > "$file" 2>/dev/null || echo "Failed to restore $file"
    fi
done < working_files.txt

# Clean up
rm working_files.txt

echo "Restoration complete"