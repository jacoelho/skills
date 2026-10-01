# Reference-line overlays

Use within the **Alignment and spacing** facet when annotated evidence is requested or guides would resolve a material uncertainty. `ui-review` owns scope, evidence grading, severity and the report. Planning establishes intended relationships; building may reuse this technique for verification.

## Purpose and terminology
Draw a few meaningful reference lines ON a copy of an existing screenshot or design image to examine relationships. This is an alignment-guide/keyline overlay, not a regular grid laid across the canvas. Add dimension arrows or spacing brackets when useful; those measurement annotations are commonly called redlines. Optical alignment is a separate judgement about visible shapes, not another name for drawing the guides.

The technique is framework-agnostic. It applies to a logo beside a wordmark, an icon with text, a form, a modal, a page and corresponding patterns across an application. A grid, particular spacing unit, geometric ratio or symmetric composition is not required.

## Establish the relationship before drawing the line
Read the approved contract or infer a candidate from the surrounding working pattern, labelling it as inferred. State what ought to align, why, and to which boundary. A line through every item's current position merely describes the image and cannot expose inconsistency. Distinguish observed boundaries from expected reference lines.

Use a small number of relationship IDs, such as content-start, dialog-content-start, field-gap or brand-lockup-centre. These are role names, not mandates for identical screen coordinates. A modal has its own local origin; a page family can have a different reading width. Compare in the appropriate coordinate frame.

## Relevant marks
| Mark | Relationship to examine | Avoid |
| --- | --- | --- |
| Vertical edge guide | Shared leading/trailing edges of headings, content, fields, navigation or action groups | Forcing unrelated sections onto one line |
| Horizontal edge or baseline guide | Common row alignment; text baselines; intended cap-height or x-height relationship | Calling the bottom of a text box its baseline |
| Centreline or symmetry axis | Intended balance of a lockup, icon-label pair, title or control | Assuming every composition must be symmetric |
| Gap bracket or dimension arrow | Comparable margins, padding, repeated gaps or exclusion space | Requiring every gap in the interface to be equal |
| Bounds outline | Compare layout bounds, visible artwork bounds and interactive bounds | Treating transparent image padding as visible ink |

Use logical leading/trailing relationships when reading direction changes. Different spacing within a group and between groups can communicate hierarchy; compare equivalent relationships, not every empty region.

## Procedure
1. **Preserve the input.** Keep the original image unchanged. Record its source, revision/hash, surface, state, caller, viewport, scale, crop origin and capture conditions. Confirm the screenshot is usable. Do not recreate it with image generation, alter the underlying UI, or stretch it to make elements align.
2. **Name the intended references.** Select only the important relationships under review. Mark each as approved, inferred or a proposed correction. Include local and cross-surface owners. Do not derive an expected line solely from the suspected outlier.
3. **Establish the evidence basis.** Prefer available design-layer or runtime geometry for box coordinates. Use font metrics for a claimed typographic baseline where available. Screenshot observations are useful, but pixel-selected edges, cap heights and visual centres may be estimates. Record measured, estimated or perceptual explicitly. A bounding rectangle is not an optical-bounds measurement.
4. **Draw a sparse overlay.** Extend relevant edges or baselines, mark intended centres, and bracket comparable distances. Label each mark with its relationship ID, reference and evidence basis. Keep expected and observed marks distinguishable with dash patterns or labels, not colour alone. Place notes outside the content or use numbered callouts. Produce separate passes or crops if annotation density hides the interface.
5. **Inspect geometry.** Look for unexplained edge drift, baseline mismatch, inconsistent insets, unequal supposedly equal gaps, and changes to the same pattern across callers. Check spacing on both sides of the selected reference where the contract requires balance. Distinguish local coordinates from screen coordinates.
6. **Hide the guides and inspect optical balance.** At actual intended display scale, examine the logo/wordmark, icons with labels, punctuation, curved or diagonal glyphs and asymmetric artwork. Equal boxes or numeric centres need not look balanced. Conversely, a visible overshoot need not be an error. Do not optimise only for the annotated image.
7. **Compare the affected sample.** Within the declared scope, review related page families and relevant parent contexts of a shared overlay. Use consistent-scale crops for comparable roles; label any scaling. Compare role-relative offsets and relationships rather than forcing the same global x/y everywhere. Include relevant content growth, narrow/short space and enlarged text without trying to preserve obsolete geometry after reflow.
8. **Report and retest.** Record observation, expected relationship, measurement method, confidence, applicable tolerance, rationale, owner and affected consumers. Keep geometric evidence separate from the perceptual conclusion. After a repair, capture the current revision and compare originals and overlays, including sibling consumers. Keep review-only requests read-only; apply explicitly requested repairs through ui-build before retesting.

## Logo, icon and typography example
For a logo beside a wordmark, consider the artwork's visible bounds, the wordmark's baseline and cap-height region, the intended optical centre, the inter-element gap and the brand's specified clear space. Draw only the guides that describe the actual relationship. Respect an existing approved lockup instead of independently re-kerning or reshaping it.

Do not automatically centre a mark against the full line-height box or force its bottom to a text baseline. The appropriate relationship depends on its shape and approved composition. Font sidebearings, curved-letter overshoot and transparent artwork padding can make identical boxes look different. A deliberate optical correction belongs to the canonical asset or shared pattern and must be inspected at relevant sizes. It is not a licence for scattered one-off nudges.

This example specifies what to examine, not a universal formula for logo sizing, clear space, kerning or positioning.

## Modal and multi-screen example
Within a form dialog, inspect the intended relationship between its title, message, labels, fields and footer. The footer's action group may align to the trailing edge while the form aligns to the leading edge; that is not inherently inconsistent. Compare insets relative to the dialog boundary, then compare the same operation opened from list and detail screens. Review parent -> open -> validation -> return as well: an overlay cannot establish focus, modality, retained context or action reachability on its own.

Across pages, a shared header can preserve the brand lockup and control alignment while a reading page has a different content width from a data table. Check the shared relationships, not universal symmetry.

## Precision and interpretation
- Label units. Image pixels are not automatically CSS pixels, device-independent units or points. Convert only when capture scale and the relevant mapping are known; otherwise report image-pixel estimates or qualitative observations.
- Define any tolerance against the project relationship and measurement uncertainty. No universal one-pixel, four-pixel or eight-pixel pass rule is supplied. Fractional geometry and rasterisation may require investigation rather than immediate repair.
- Do not infer equal gaps from a resized thumbnail. Do not label a screenshot-derived baseline exact without supporting metrics. Do not use an automatic bounding-box test as proof of optical balance.
- Lines support diagnosis; they are not a beauty score, accessibility assessment, proof of intended symmetry or justification for changing valid asymmetry.
- Preserve supported reflow, text enlargement, clear space, meaning and interactive target size. An optically adjusted glyph must not silently shrink its hit area or obstruct content.

## Evidence for the Alignment and spacing facet
Provide an unchanged original and an annotated counterpart for each selected representative surface or shared pattern. Include same-scale detail crops only where needed. Record evidence in the Alignment and spacing section of [the main report template](../assets/report.template.md); include the expected relationship's authority and any applicable tolerance.

When available evidence cannot establish a required check, including missing images or required annotations, mark that check not_exercised and report the supported observations separately. Optional annotations do not gate the verdict. Source inspection cannot establish rendered or optical correctness; keyboard, screen-reader and lifecycle checks need their own evidence.

## Sources and scope
Consulted 1 October 2026. These references support terminology and reasoning, not universal numeric rules. The procedure above is an original synthesis.

- Adobe, guides versus grids and Smart Guides: https://helpx.adobe.com/uk/photoshop/desktop/use-grids-measurement-guides/alignment-grids-guides/overview-of-guides-grids-and-smart-guides.html
- Figma, canvas/frame guides and redline distances: https://help.figma.com/hc/en-us/articles/360040449713-Add-guides-to-the-canvas-or-frames
- Google Design, historical keyline overlays in the 2014 Google I/O app: https://medium.com/google-design/material-design-in-the-2014-google-i-o-app-e3b22caffae6
- Apple, optical bounds, sidebearings and curved-letter overshoot: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6AATIntro.html
- Apple, custom symbol guides, typographic alignment and optical centring: https://developer.apple.com/videos/play/wwdc2021/10250/
- Adobe, optical margin alignment: https://helpx.adobe.com/indesign/desktop/format-and-style-text/composition-and-text-wrapping/apply-and-manage-text-formatting.html
