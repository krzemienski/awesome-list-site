---
name: Undo after the control unmounts
description: Toast Undo actions whose originating card/control was removed must be restored by the list owner, not the unmounted component.
---
A toast "Undo" closure runs after its originating component may have unmounted (e.g. a hidden recommendation card is filtered out of the list). Calling the component's own save() clears server state but nothing re-renders the item.

**Why:** the clean confirmation pass found Hide → Undo removed the feedback row while the card stayed gone; the API looked correct, only the rendered list was wrong.

**How to apply:** whenever an action removes an item and offers Undo, keep the removed item (and its index) in the list owner and re-insert it when the reversing event arrives. Verify by counting cards after Undo, not just the API.
