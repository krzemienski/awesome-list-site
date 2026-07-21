<required_reading>
- references/mermaid-patterns.md
- references/html-visual-templates.md
</required_reading>

<process>

**Phase 1: Tutorial Structure**

1. Define what the reader will build (concrete, demonstrable outcome)
2. List exact prerequisites with versions
3. Break implementation into 5-10 discrete steps
4. For each step: identify the code, expected output, and potential errors
5. Identify visual opportunities: workflow diagram, architecture overview

**Phase 2: Visual Assets**

1. **Hero image**: Generate from html-visual-templates.md — title should describe what they'll build
2. **Workflow diagram**: Mermaid flowchart showing all tutorial steps as a pipeline
3. **Architecture diagram** (if applicable): Mermaid showing what they're building

**Phase 3: Writing**

Follow the Tutorial template from SKILL.md post_type_patterns:

1. **What you'll build**: Show the finished result. Screenshot description, final output, working demo.
2. **Prerequisites**: Exact versions, install commands, verification commands.
   ```bash
   python --version  # 3.11+
   docker --version  # 24.0+
   ```
3. **Step-by-step**: For each step:
   - What this step does (one sentence)
   - The code (complete, runnable, with language tag)
   - Expected output
   - Common error + fix (if applicable)
4. **Complete code**: Full implementation in one block or link to repo
5. **What to try next**: 2-3 extensions or variations

Rules:
- Every code block must be copy-paste runnable at that point in the tutorial
- Show intermediate output after EVERY step (not just the final result)
- Include the "I got an error" paths — this IS the content developers value most
- Use Mermaid workflow diagram at the top showing all steps

Save as `tutorial.md` with visuals in `visuals/` subdirectory.
</process>

<success_criteria>
- Reader can follow from step 1 to completion without leaving the tutorial
- Every code block runs successfully in order
- Prerequisites are exact (versions, install commands)
- Workflow diagram shows all steps
- Hero image generated
- Common errors documented with fixes
- Complete code available at end
</success_criteria>
