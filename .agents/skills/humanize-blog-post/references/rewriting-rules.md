# Rewriting Rules: AI to Human Voice

## Word-Level Kill List

### NEVER USE (Instant AI detection)

**Formal Transitions:**
Moreover, Furthermore, Additionally, In addition, Subsequently, Consequently, Thus, Therefore, Notably, Significantly, In terms of, It is worth noting that, In the world of, When all is said and done, In conclusion, To summarize, As we've discussed

**Corporate Buzzwords:**
Seamlessly, Cutting-edge, Next-generation, Revolutionary, Comprehensive, Holistic, Robust (without numbers), Crucial, Compelling, Transformative

**AI Marker Verbs:**
Delve, Leverage (use "use"), Navigate (metaphorical), Foster, Catalyze, Amplify, Unlock, Democratize, Streamline, Synergize, Showcase, Underscore, Emphasize (when used as filler)

**AI Marker Nouns:**
Tapestry, Landscape (when describing an industry), Paradigm, Ecosystem (non-technical), Synergy

**Performative Phrases:**
"Aims to provide", "Strives to achieve", "Designed to enhance", "Plays a crucial role", "Serves as a cornerstone", "It has been observed that", "It can be argued that"

**Hedging Clusters:**
"May potentially offer", "Could be considered", "Might prove beneficial", "It seems that perhaps", "Under certain conditions", "In some cases"

### REPLACE WITH

| Kill | Use Instead |
|------|-------------|
| Moreover / Furthermore | [just start the sentence] |
| Additionally | [just start the sentence] or "Also," |
| However | "But" or [just start the sentence] |
| It is worth noting that | [delete — say the thing directly] |
| plays a crucial role | "handles" / "manages" / "does" |
| seamlessly integrates | "works with" / "plugs into" |
| comprehensive solution | [describe what it actually does] |
| dramatically improves | [specific metric: "cuts latency by 40%"] |
| robust | [specific: "handles 2k req/s" or "99.9% uptime"] |
| leverage | "use" |
| utilize | "use" |
| implement | "build" / "add" / "write" |
| facilitate | "let" / "help" / "allow" |
| in order to | "to" |
| a large number of | "many" or specific number |
| at this point in time | "now" |
| due to the fact that | "because" |
| in the event that | "if" |
| prior to | "before" |
| subsequent to | "after" |

## Sentence-Level Rules

### 1. Vary Length Aggressively

**BAD (AI uniform):**
> The system processes incoming requests through the middleware layer. Each request is validated against the authentication schema. The validated requests are then routed to appropriate handlers. Error responses are generated for invalid authentication tokens.

**GOOD (human varied):**
> Requests hit the middleware first. Each one gets checked against the auth schema — if the token's bad, you get a 401 back immediately. Valid requests route to their handlers. Simple as that.

**Target:** Sentence word counts should range from 3-35 words. Standard deviation > 8 words.

### 2. Break Parallelism

**BAD:**
> The framework provides flexibility, maintains scalability, and ensures reliability. It promotes consistency, encourages modularity, and enables extensibility.

**GOOD:**
> It's flexible and scales well. Also doesn't fall over — we've had 99.9% uptime over six months.

### 3. Use Contractions

Replace all formal forms with contractions unless the formal form adds emphasis:
- "I am" → "I'm"
- "it is" → "it's"
- "do not" → "don't"
- "cannot" → "can't"
- "will not" → "won't"
- "would not" → "wouldn't"
- "they are" → "they're"
- "we have" → "we've"
- "I have" → "I've"
- "that is" → "that's"

**Exception:** "do NOT" for emphasis is fine.

### 4. First Person, Active Voice

**BAD:** "The implementation was completed and the system was deployed."
**GOOD:** "I built it and shipped it."

**BAD:** "It has been observed that agents frequently spawn sub-agents."
**GOOD:** "I watched agents spawn sub-agents constantly — 18,945 times across 42 days."

### 5. Kill Hedging

**BAD:** "This approach may potentially offer significant benefits in certain scenarios."
**GOOD:** "This approach works. Here's when."

**The only acceptable hedge:** Genuine uncertainty stated directly.
- YES: "I'm not sure why this happens. My hypothesis is..."
- NO: "It could potentially be argued that under certain conditions..."

### 6. Questions to Reader

Minimum 3-5 per 2000-word post. Types:

- **Rhetorical:** "Ever watched an agent spin for 20 minutes on the wrong file?"
- **Setup:** "So what happens when two agents edit the same file? Exactly what you'd expect."
- **Direct:** "Have you tried this? If not, here's the setup."
- **Challenge:** "Think your test suite catches this? Run it against production data."

### 7. Show Before Tell

**BAD (tell then show):**
> The gate check function validates all three agents reached consensus before proceeding. Here's the implementation:
> ```python
> def run_gate_check():
> ```

**GOOD (show then tell):**
> ```python
> def run_gate_check():
> ```
> Three agents vote. All three must agree. If even one dissents, the gate fails and the cycle restarts.

## Structural Rules

### Openings

**BANNED:** "In this article, we will explore...", "Let's delve into...", "The purpose of this post is to...", "In today's world...", "As technology continues to evolve...", "The landscape of X is rapidly changing..."

**USE INSTEAD:**
- Start with a specific moment: "I was debugging a merge conflict at 2am when I realized..."
- Start with a result: "194 agents. Zero merge conflicts. Here's how."
- Start with a question: "What happens when you let 35 agents edit the same codebase?"
- Start with a contradiction: "Everyone says you need unit tests. I disagree."
- Start with data: "23,479 sessions. 256,000 tool calls. 42 days."

### Closings

**BANNED:** "In conclusion...", "To summarize...", "As we've discussed...", "The takeaway is...", "It's clear that..."

**USE INSTEAD:**
- Circle back to opening image/problem
- End with what you'd do differently
- End with what you're building next
- End with a direct recommendation
- End with an honest admission

### Section Transitions

**BANNED:** "Now let's turn our attention to...", "Having examined X, we can now consider...", "With this foundation in place..."

**USE INSTEAD:**
- Just start the next section. Headers do the transitioning.
- If you must connect: "That's the theory. Here's what actually happened."
- Or a question: "So does this scale?"

## Paragraph Structure

**AI pattern (detectable):**
1. Topic sentence (claim)
2. 2-3 explanatory sentences
3. Example or proof
4. Transition to next idea

**Human pattern (authentic):**
- Lead with example or anecdote sometimes
- Put the explanation AFTER the code
- Ask a question mid-paragraph
- Single-sentence paragraph for emphasis
- Digress briefly, then come back
- Vary: some paragraphs are 1 sentence, some are 5

## Authenticity Techniques

### Self-Correction (Metanoia)
> "I assumed it was a memory leak — turns out the connection pool was just undersized."

### Admitted Failures
> "My first approach was terrible. I tried to parse the JSONL files line-by-line. It took 47 minutes. The fix was embarrassingly simple."

### Specific Details
> "Session `a36a134` at 11:52 PM" not "a particular session late at night"
> "4,241 files across 982 sessions" not "thousands of files across hundreds of sessions"

### Opinions With Spine
> "Mocking is a waste of time for this kind of validation." not "Some developers may find that mocking is less effective in certain scenarios."

### Conversational Asides
> "The WAL pragma — which, by the way, should be your default for any SQLite database — prevents write contention."
