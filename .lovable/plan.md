## Improve Edit Opinion Dialog UX

Make the dialog wider and more spacious so auditors can read and write substantial opinion text without feeling cramped or scrolling excessively.

### Changes to `src/pages/AuditDetail.tsx` (Edit Opinion Dialog only)

**1. Wider, taller dialog**
- Change `max-w-lg` → `max-w-3xl` (much wider for long-form text).
- Keep `max-h-[90vh] overflow-y-auto` so it stays usable on shorter screens.

**2. Two-column layout for Part A / Part B**
- Place Part A and Part B side-by-side in a `grid grid-cols-1 md:grid-cols-2 gap-6` so the auditor sees both at once instead of scrolling between them.
- Drop the horizontal divider; use the column gap + subtle card framing instead (each part wrapped in a `rounded-md border border-border p-4` block for clear separation).

**3. Bigger, more comfortable textareas**
- Part A basis: `min-h-[80px]` → `min-h-[180px]`
- Part B basis: `min-h-[80px]` → `min-h-[180px]`
- Emphasis of Matter: `min-h-[60px]` → `min-h-[120px]`
- Add `leading-relaxed` and `text-sm` for readability of long text.

**4. Cleaner form structure inside each part**
- Stack: section heading ("Part A — Financial Statements" / "Part B — Compliance") in normal weight + small muted helper, then Select, then basis textarea with its own clear label.
- Add proper spacing (`space-y-3` inside each card) so labels don't sit right on top of inputs.

**5. Polished derived overall banner**
- Move the derived overall to a full-width row beneath the two columns.
- Use a slightly larger, badge-style display: uppercase label "Derived Overall Opinion" on the left, the colored result on the right, inside a `rounded-md border bg-hover px-4 py-3 flex items-center justify-between`.

**6. Footer**
- Keep Cancel + Save, no logic changes. Save button keeps loading spinner.

### Out of scope
- No changes to save logic, state variables, Supabase update payload, or the opinion banner / pencil button on the page.
- No changes to fonts, colors, or design tokens beyond using existing ones (`bg-hover`, `border-border`, `text-status-pass/flag/fail`, `text-muted-foreground`).

### Result
The dialog becomes a wide, two-column form with generous textareas, clear card separation between Part A and Part B, and a prominent derived overall banner — making it comfortable to read and write multi-paragraph audit opinions without scrolling.