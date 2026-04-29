## Goal

Fix the "Edit Audit Opinion" dialog in `src/pages/AuditDetail.tsx` so the Part A / Part B basis textareas are no longer pre-filled with the long combined `opinion_reasoning` blob. Make the pre-population intuitive and ensure existing reasoning is preserved when the auditor doesn't type anything new.

## Why your proposed solution is good

- `opinion_reasoning` is a single combined string (often containing report-style text with a "Part B:" suffix). Dumping it into the Part A textarea is misleading and makes Part B look empty even though it's effectively included in the Part A blob.
- Leaving both basis fields blank + showing helper text ("Previous reasoning is retained if left blank") makes the intent explicit and avoids destructive edits.
- Guarding the save so `opinion_reasoning` is only overwritten when the user typed something prevents accidentally wiping existing reasoning by just changing the dropdown.

This matches how professional audit tools handle override flows — change the verdict without being forced to retype the rationale.

## Changes (all in `src/pages/AuditDetail.tsx`)

### 1. Edit-button click handler (around line 931–934)

Replace the current pre-population block with:

```ts
setOpinionPartA((envelope as any).opinion_part_a || audit.opinion || "unqualified");
setOpinionPartB((envelope as any).opinion_part_b || (envelope as any).opinion_part_a || audit.opinion || "unqualified");
setOpinionPartABasis("");
setOpinionPartBBasis("");
setOpinionEmphasis(((envelope as any).emphasis_of_matter || [])[0] || "");
```

### 2. Helper text under each basis textarea (around lines 1159 and 1188)

Add directly below each basis `<Textarea>`:

```tsx
<p className="text-xs text-muted-foreground mt-1">
  Previous reasoning is retained if left blank. Enter new text to override.
</p>
```

Applied to both Part A and Part B basis fields.

### 3. Save handler (around line 1236)

Replace the current `opinion_reasoning` assignment with the conditional preserve-or-overwrite logic:

```ts
opinion_reasoning: (opinionPartABasis || opinionPartBBasis)
  ? (opinionPartABasis + (opinionPartBBasis ? "\n\nPart B: " + opinionPartBBasis : ""))
  : ((envelope as any).opinion_reasoning || ""),
```

### 4. Untouched

- Dialog layout, two-column grid, derived overall banner, Part A/B dropdowns, emphasis textarea behaviour, Supabase update target (`audits.opinion` + `audits.ai_findings`), and the realtime refresh logic all stay exactly as they are.

## Result

- Opening Edit shows clean empty basis boxes with a clear hint.
- Changing only the dropdown and saving preserves the existing reasoning.
- Typing into either basis box overrides it, with Part B prefixed correctly in the combined string.