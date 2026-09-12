# Mutation probe: response-contract-drift must FAIL when resolvedKind is dropped

Mutation (temporary, reverted byte-identical afterwards): server/lib/resourceKinds.ts withResourceKindFields()
    resolvedKind: undefined as unknown as ResourceKind, // MUTATION PROBE

Command: npm run validate:response-contracts

```
Response-contract drift detected:
  - 6 "[contract] response mismatch" line(s) on real endpoints — a named response schema no longer matches the real payload:
  -     [contract] response mismatch for "get:/api/resources" (GET /api/resources) status 200: resources.0.resolvedKind: Invalid option: expected one of "tools"|"libraries"|"standards"|"events"|"proto
  -     [contract] response mismatch for "get:/api/recommendations" (GET /api/recommendations) status 200: 0.resource.resolvedKind: Invalid option: expected one of "tools"|"libraries"|"standards"|"eve
  -     [contract] response mismatch for "post:/api/recommendations" (POST /api/recommendations) status 200: 0.resource.resolvedKind: Invalid option: expected one of "tools"|"libraries"|"standards"|"e
  -     [contract] response mismatch for "get:/api/resources" (GET /api/resources) status 200: resources.0.resolvedKind: Invalid option: expected one of "tools"|"libraries"|"standards"|"events"|"proto
  -     [contract] response mismatch for "get:/api/resources/{id}" (GET /api/resources/188015) status 200: resolvedKind: Invalid option: expected one of "tools"|"libraries"|"standards"|"events"|"proto
  -     [contract] response mismatch for "get:/api/resources" (GET /api/resources?kind=tools&limit=5) status 200: resources.0.resolvedKind: Invalid option: expected one of "tools"|"libraries"|"standar
exit=1
```

Restored file verified with diff against the pre-mutation copy (identical). Green run recorded in response-contract-drift.txt.
