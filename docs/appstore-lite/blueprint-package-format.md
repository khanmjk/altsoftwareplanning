# Blueprint Package Format

Last updated: 2026-02-07

## Package Envelope

```json
{
  "format": "smt-blueprint-package",
  "packageSchemaVersion": 1,
  "exportedAt": "2026-02-07T00:00:00Z",
  "manifest": {},
  "system": {}
}
```

## Required Manifest Fields

1. `blueprintId`
2. `title`
3. `summary`
4. `category`
5. `trustLabel`
6. `schemaVersion`
7. `appCompatibility`
8. `promptPack.seedPrompt`

Formal schema reference:

- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/appstore-lite/blueprint-manifest-schema.json`

## Required System Fields

1. `systemName`
2. `goals` (non-empty)
3. `yearlyInitiatives` (non-empty)
4. `capacityConfiguration`

Recommended:

1. `workPackages` (non-empty for curated quality)
2. `attributes.blueprint` provenance metadata

## Install Path

Blueprint package install is converted to SMT export payload shape and imported via:

- `SystemService.importFromJson(...)`

This keeps compatibility with existing import/export behavior.
