<mermaid_reference>

<syntax_rules>
**Critical Rules — Violating any causes render failures:**

1. **Node IDs**: Alphanumeric and underscores only. No spaces, hyphens, or dots.
   - GOOD: `nodeA`, `step_1`, `apiGateway`
   - BAD: `node-a`, `step 1`, `api.gateway`

2. **Text labels**: Always use square brackets `[Text]` or quotes inside shapes.
   - GOOD: `A[API Gateway]`, `B["Rate Limiter (500 req/s)"]`
   - BAD: `A(API Gateway)` in flowchart (use brackets)

3. **No nested quotes**: Use HTML entity `&quot;` or switch bracket styles.
   - GOOD: `A["Config says &quot;enabled&quot;"]`
   - BAD: `A["Config says "enabled""]`

4. **Arrow syntax**: `-->` solid, `-.->` dashed, `==>` thick. Space before labels.
   - GOOD: `A -->|label| B`
   - BAD: `A-->|label|B`

5. **Subgraph IDs**: Same rules as node IDs — no spaces, no special chars.
   - GOOD: `subgraph apiLayer[API Layer]`
   - BAD: `subgraph API Layer`

6. **Direction**: Declare after graph type: `flowchart TD`, `graph LR`.

7. **Escaping**: Parentheses in labels need quotes: `A["Process (main)"]`
</syntax_rules>

<flowchart_patterns>
**Basic decision flow:**
```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action A]
    B -->|No| D[Action B]
    C --> E[End]
    D --> E
```

**Multi-layer architecture:**
```mermaid
flowchart TD
    subgraph clientLayer[Client Layer]
        web[Web App]
        mobile[Mobile App]
    end
    subgraph apiLayer[API Layer]
        gw[API Gateway]
        auth[Auth Service]
    end
    subgraph dataLayer[Data Layer]
        db[(PostgreSQL)]
        cache[(Redis)]
    end
    web --> gw
    mobile --> gw
    gw --> auth
    gw --> db
    gw --> cache
```

**Pipeline / workflow:**
```mermaid
flowchart LR
    A[Input] --> B[Parse]
    B --> C[Validate]
    C --> D[Transform]
    D --> E[Output]
    C -.->|invalid| F[Error Handler]
    F -.-> A
```

**Before/After**: Generate TWO separate mermaid blocks labeled "Before" and "After." Don't combine in one graph.
</flowchart_patterns>

<sequence_patterns>
**API request flow:**
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant S as Service
    participant D as Database
    C->>G: POST /api/resource
    G->>G: Validate token
    G->>S: Forward request
    S->>D: INSERT query
    D-->>S: Row created
    S-->>G: 201 Created
    G-->>C: 201 + resource
```

**Debugging investigation:**
```mermaid
sequenceDiagram
    participant Dev as Developer
    participant App as Application
    participant Log as Logs
    participant DB as Database
    Dev->>App: Report 500 errors spike
    Dev->>Log: Check error logs
    Log-->>Dev: ConnectionPool exhausted
    Dev->>DB: Check active connections
    DB-->>Dev: 100/100 used
    Dev->>App: Increase pool + timeout
    App-->>Dev: Errors resolved
```
</sequence_patterns>

<state_diagram_patterns>
```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Building: trigger
    Building --> Testing: build_pass
    Building --> Failed: build_fail
    Testing --> Deploying: tests_pass
    Testing --> Failed: tests_fail
    Deploying --> Live: deploy_success
    Deploying --> Rollback: deploy_fail
    Rollback --> Live: rollback_complete
    Failed --> Pending: retry
    Live --> [*]
```
</state_diagram_patterns>

<er_diagram_patterns>
```mermaid
erDiagram
    USER ||--o{ POST : writes
    USER {
        int id PK
        string email
        string name
        timestamp created_at
    }
    POST ||--o{ COMMENT : has
    POST {
        int id PK
        int user_id FK
        string title
        text body
    }
    COMMENT {
        int id PK
        int post_id FK
        int user_id FK
        text body
    }
```
</er_diagram_patterns>

<gantt_patterns>
```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
        Research        :a1, 2025-01-01, 14d
        Design          :a2, after a1, 7d
    section Phase 2
        Implementation  :b1, after a2, 21d
        Testing         :b2, after b1, 10d
    section Phase 3
        Deployment      :c1, after b2, 3d
```
</gantt_patterns>

<class_diagram_patterns>
```mermaid
classDiagram
    class Service {
        +String name
        +start()
        +stop()
        +healthCheck() bool
    }
    class APIService {
        +int port
        +handleRequest(req)
    }
    class Worker {
        +String queue
        +process(job)
    }
    Service <|-- APIService
    Service <|-- Worker
```
</class_diagram_patterns>

<common_pitfalls>
| Problem | Cause | Fix |
|---------|-------|-----|
| Won't render | Special chars in node ID | Alphanumeric + underscore only |
| Labels cut off | Text too long | Shorten or use line breaks with `<br/>` |
| Arrows crossing | Poor node ordering | Reorder nodes, switch LR vs TD |
| Subgraph overlap | Node in multiple subgraphs | Each node in exactly one subgraph |
| Quotes break | Nested quotes | Use `&quot;` entity |
| C4 fails | Old Mermaid version | Fall back to styled flowchart |
| Sequence participant collides | Duplicate alias | Unique aliases for all participants |
</common_pitfalls>

</mermaid_reference>
