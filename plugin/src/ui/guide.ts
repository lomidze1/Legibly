/**
 * "How Legibly checks" copy, one entry per tab. Every claim here must match
 * what the engine actually does (src/shared) — this panel is the plugin's
 * trust story, so an overclaim costs more than a missing feature.
 */
export interface GuideTab {
  id: string;
  label: string;
  /** Success criteria covered by this tab, as shown to the user. */
  sc: string;
  /** What we check. */
  check: string;
  /** How we check it. */
  how: string;
  /** What we suggest when it fails. */
  advice: string;
  /** What that actually saves the user. */
  help: string;
}

export const GUIDE_TABS: readonly [GuideTab, ...GuideTab[]] = [
  {
    id: 'text',
    label: 'Text',
    sc: 'SC 1.4.3 · SC 1.4.12 · SC 1.4.1 · advisory',
    check:
      'Contrast between text and whatever is really behind it, line height below the 1.5× floor readers rely on, and runs set apart from the body by colour alone. Text under 12px is raised separately as advice — WCAG sets no minimum size, so it is never counted as a failure.',
    how:
      'We resolve the effective background through fill stacks, layer opacity and nesting, then measure the WCAG 2 ratio: 4.5:1 for normal text, 3:1 for large (≥24px, or ≥18.66px bold). APCA Lc is shown as advisory only, never as the gate. If your colours use variable modes, we also re-measure in the modes the canvas is not showing — so a dark theme cannot pass unseen.',
    advice:
      'The nearest passing colour from your own library — same ramp step first, then the nearest passing token, then a background swap. A brand-new colour is only ever proposed when nothing in your file can pass, and only if you accept it. For a colour-only run, one click adds an underline; we only raise it when the run has no underline, weight, size or style difference and sits in a different colour family from the body, so emphasis and muted captions stay quiet.',
    help:
      'Applying a fix re-runs the same check and commits only if it passes, so a fix that would not work never reaches your canvas. On a file with variable modes the candidate is measured in every mode before it is offered, and re-measured in every mode before it commits — a fix cannot repair one theme at another’s expense.',
  },
  {
    id: 'image',
    label: 'Image',
    sc: 'SC 1.1.1',
    check: 'Images and image fills that carry meaning but have no text alternative recorded.',
    how:
      'A presence check, not a quality judgement: Figma has no native alt field, so Legibly reads the alt text it stores on the layer. We never guess whether existing wording is good enough.',
    advice:
      'Write a short description of what the image conveys, or mark it decorative if it carries none. The description is yours to write — Legibly checks that one exists, never what it should say.',
    help:
      'The alt text lives on the layer, so it survives into Dev Mode handoff and the exported report instead of being re-litigated in code review.',
  },
  {
    id: 'color',
    label: 'Color',
    sc: 'SC 1.4.11',
    check: 'Icons, borders and control edges that users must see to operate the UI — the 3:1 non-text rule.',
    how:
      'The same effective-background resolution as text: the element is compared against what is actually behind it, not against an assumed white page. We measure the parts of anything that reads as a control — a prototype link, a control-like layer name, a form field, or a component with a State variant.',
    advice:
      'The nearest passing token from your library, hue-filtered so the colour stays recognisably yours.',
    help:
      'Fixes bind to your variable or style rather than pasting a detached hex, so the design system stays the source of truth — and a fix is rejected if it would break the same layer in another variable mode.',
  },
  {
    id: 'layout',
    label: 'Layout',
    sc: 'SC 2.5.8 · SC 2.5.5 · SC 1.4.10 · SC 2.4.6 · SC 2.4.7',
    check:
      'Interactive targets smaller than the minimum, text cut off by a container that clips it, fields with no visible label, and component sets that define hover but no focus state.',
    how:
      'We measure the layer’s own bounds against the floor you pick in settings: 24px (SC 2.5.8, AA) applies the spacing exception, so a small control still passes when nothing crowds it; 44px (SC 2.5.5, AAA — also the iOS minimum) is size-only. Only a prototype interaction proves a layer is a control; a control-like name, a form-field name or a State variant makes it a suspect. Figma has no form or focus semantics either, so a field is recognised by its layer name and a label by the text sitting directly above or beside it. Everything short of a prototype link goes to “Check by eye”, never to a hard fail.',
    advice:
      'Grow the target to the required minimum — one click, or adjust the spacing around it yourself. Clipped text, missing labels and missing focus states are measured, not fixed: rewrapping copy, naming a field and drawing a focus ring are design decisions, so we show what is missing and leave the call to you.',
    help:
      'Thumb-size failures, text that disappears behind a frame edge, and focus states nobody specified all get caught in the file, where they cost minutes, instead of in QA or a keyboard audit.',
  },
];
