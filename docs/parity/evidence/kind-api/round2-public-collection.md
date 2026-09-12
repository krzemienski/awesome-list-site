# Round-2 evidence: published collection carries kind + resolvedKind (live dev app)

Seeded a throwaway published collection (user __qa_test_kind_gate_collection@example.com, torn down afterwards) holding three approved resources: one tagged SDK, one tagged conference, one with no tags.

## curl -s http://127.0.0.1:5000/api/public/collections/6FVrYKI4nB0nLcLi0cDTdFFJ
```json
{
    "shareId": "6FVrYKI4nB0nLcLi0cDTdFFJ",
    "name": "QA kinds gate shelf",
    "publishedAt": "2026-09-12T20:08:47.347Z",
    "resources": [
        {
            "id": 184747,
            "title": "Future of Video: Business of Streaming",
            "url": "https://www.parksassociates.com/event/future-of-video",
            "description": "Scheduled for November 18-20, 2025, in Marina del Rey, California, this conference covers key topics in connected entertainment and video services. It includes an interactive research workshop on consumer viewing habits and offers multiple sponsorship opportunities for brand promotion within the streaming video industry.",
            "category": "Community & Events",
            "subcategory": "Events & Conferences",
            "subSubcategory": null,
            "resourceFormat": "unknown",
            "provider": "unknown",
            "skillLevel": "unknown",
            "kind": null,
            "resolvedKind": "events"
        },
        {
            "id": 184761,
            "title": "api.video Player SDKs",
            "url": "https://api.video/catalog/player-sdk/",
            "description": "api.video offers a suite of player SDKs designed for seamless integration of video playback into mobile applications. These SDKs support both VOD and live streaming, provide customizable UI elements, and handle adaptive bitrate streaming to ensure optimal playback quality across various network conditions. They are available for platforms including Flutter, React Native, Android, and iOS.",
            "category": "Players & Clients",
            "subcategory": null,
            "subSubcategory": null,
            "resourceFormat": "unknown",
            "provider": "unknown",
            "skillLevel": "unknown",
            "kind": null,
            "resolvedKind": "libraries"
        },
        {
            "id": 185689,
            "title": "Rokumote",
            "url": "https://github.com/nod/rokumote",
            "description": "osx app for controlling your roku because sometimes your kids lose the remote",
            "category": "General Tools",
            "subcategory": "Independent & Hobbyist Projects",
            "subSubcategory": null,
            "resourceFormat": "unknown",
            "provider": "unknown",
            "skillLevel": "unknown",
            "kind": null,
            "resolvedKind": "other"
        }
    ]
}
```

## Parity with /api/resources/:id (same rows, same resolver)
```
184747  detail resolvedKind=events  collection resolvedKind=events
184761  detail resolvedKind=libraries  collection resolvedKind=libraries
185689  detail resolvedKind=other  collection resolvedKind=other
```

## Unknown shareId → canonical 404 envelope
```
{"message":"Collection not found"}
HTTP 404
```

## response-contract-drift gate, 200 branch (published collection present in the dev DB)
```
[contract] response mismatch for "get:/api/__contract-drift-probe" (GET /api/__contract-drift-probe) status 401: message: Invalid input: expected string, received undefined
  ok  GET /api/public/collections/:shareId (published) -> 200
Response-contract drift PASS: 19 endpoint checks, 0 real mismatches, observer liveness verified
```

## response-contract-drift gate, 404 branch (no published collection): label 'GET /api/public/collections/:shareId (no published collection in this database; 404 envelope) -> 404', 19 checks PASS

## Mutation probe (integration test, file restored afterwards)

Mutated CollectionRepository.getPublicCollection to drop `kind` and keep `metadata` in the projection. The published-collection integration case fails on the observer line captured through console.warn:
```
AssertionError: PublicCollectionResponse contract must match the real payload: expected [ Array(1) ] to deeply equal []
+ "[contract] response mismatch for \"get:/api/public/collections/{shareId}\" (GET /api/public/collections/y3vAcfN_8g2hemDXGuAiw3Xw) status 200: resources.0.kind: Invalid option: expected one of \"tools\"|\"libraries\"|\"standards\"|\"events\"|\"protocols\"|\"other\"; resources.0: Unrecognized key: \"metadata\"; …"
```

## Re-run after restore: tests/integration/api/resource-kinds.test.ts 21/21; tests/unit 299/299; validate:openapi PASS 177/177/149; validate:response-contracts PASS 19 checks; dead-components PASS; dead-exports PASS; tsc clean.
