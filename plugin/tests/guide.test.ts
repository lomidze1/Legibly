/**
 * The guide panel is the plugin's trust story, so every number in it is
 * pinned to the constant the engine actually uses — an overclaim here costs
 * more than a missing feature (src/ui/guide.ts header). The link table is
 * checked against the one guard that lets a URL out (main/index.ts open-url).
 */
import { describe, expect, it } from 'vitest';
import { GUIDE_TABS } from '../src/ui/guide';
import { LINKS } from '../src/ui/links';
import { CONTRAST_SC } from '../src/shared/classify';
import { SPACING_SC, LINE_HEIGHT_FLOOR } from '../src/shared/text-spacing';
import { USE_OF_COLOR_SC } from '../src/shared/use-of-color';
import { ALT_SC } from '../src/shared/alt-text';
import { NON_TEXT_SC, NON_TEXT_RATIO } from '../src/shared/non-text';
import { TARGET_SC, TARGET_SC_ENHANCED, MIN_TARGET_PX } from '../src/shared/target-size';
import { CLIPPED_SC } from '../src/shared/clipped-text';
import { LABEL_SC } from '../src/shared/form-label';
import { FOCUS_SC } from '../src/shared/focus-state';
import { MIN_COMFORTABLE_PX } from '../src/shared/advisory';
import { requiredRatio } from '../src/shared/contrast';

/** Every criterion the engine can put on a Finding. */
const ENGINE_SCS = [
  CONTRAST_SC,
  SPACING_SC,
  USE_OF_COLOR_SC,
  ALT_SC,
  NON_TEXT_SC,
  TARGET_SC,
  TARGET_SC_ENHANCED,
  CLIPPED_SC,
  LABEL_SC,
  FOCUS_SC,
];

const tabById = (id: string) => GUIDE_TABS.find((t) => t.id === id)!;

/** Criteria named in one tab's `sc` line. "SC 1.4.1" must not match "SC 1.4.11". */
const scsOf = (line: string): string[] => [...line.matchAll(/SC ([\d.]+)/g)].map((m) => m[1]!);

describe('GUIDE_TABS — shape', () => {
  it('every tab carries complete copy', () => {
    for (const tab of GUIDE_TABS) {
      for (const field of ['id', 'label', 'sc', 'check', 'how', 'advice', 'help'] as const) {
        expect(tab[field].trim().length, `${tab.id}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it('tab ids are unique — they key the ARIA tab/panel wiring', () => {
    const ids = GUIDE_TABS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('GUIDE_TABS — the claims match the engine', () => {
  it('lists every criterion the engine can report, each in exactly one tab', () => {
    for (const sc of ENGINE_SCS) {
      const owners = GUIDE_TABS.filter((t) => scsOf(t.sc).includes(sc));
      expect(owners.map((t) => t.id), `SC ${sc}`).toHaveLength(1);
    }
  });

  it('claims no criterion the engine does not check', () => {
    const claimed = GUIDE_TABS.flatMap((t) => scsOf(t.sc));
    expect([...new Set(claimed)].sort()).toEqual([...new Set(ENGINE_SCS)].sort());
  });

  it('quotes the same contrast gates requiredRatio computes', () => {
    const how = tabById('text').how;
    expect(how).toContain(`${requiredRatio(false, 'AA')}:1`); // 4.5 normal
    expect(how).toContain(`${requiredRatio(true, 'AA')}:1`); // 3 large
    expect(how).toContain('≥24px'); // isLargeText size floor
    expect(how).toContain('≥18.66px bold'); // isLargeText bold floor
  });

  it('quotes the same line-height and font-size floors the checks use', () => {
    expect(tabById('text').check).toContain(`${LINE_HEIGHT_FLOOR}×`);
    expect(tabById('text').check).toContain(`${MIN_COMFORTABLE_PX}px`);
  });

  it('quotes the same non-text ratio and tap-target floors', () => {
    expect(tabById('color').check).toContain(`${NON_TEXT_RATIO}:1`);
    const how = tabById('layout').how;
    expect(how).toContain(`${MIN_TARGET_PX}px (SC ${TARGET_SC}`);
    expect(how).toContain(`44px (SC ${TARGET_SC_ENHANCED}`);
  });

  it('never promises a fix for the layout issues the engine only measures', () => {
    // clipped text / labels / focus states are reported, never auto-fixed.
    expect(tabById('layout').advice).toContain('measured, not fixed');
  });
});

describe('LINKS', () => {
  const entries = Object.entries(LINKS);

  it('every link clears the https-only guard the main thread enforces', () => {
    for (const [key, url] of entries) {
      expect(/^https:\/\//.test(url), key).toBe(true);
    }
  });

  it('every link points at our own site — the plugin never sends users elsewhere', () => {
    for (const [key, url] of entries) {
      expect(url.startsWith('https://legibly.design/'), `${key} → ${url}`).toBe(true);
    }
  });

  it('covers the five destinations the footer offers', () => {
    expect(Object.keys(LINKS).sort()).toEqual(['contact', 'docs', 'feedback', 'plans', 'subscribe']);
  });
});
