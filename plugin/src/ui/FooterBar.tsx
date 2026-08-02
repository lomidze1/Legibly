import React, { useState } from 'react';
import { Modal } from './Modal';
import { GUIDE_TABS } from './guide';
import { LINKS } from './links';
import { IconExternal, IconGear, IconHelp } from './icons';

type Panel = 'guide' | 'plans' | 'help' | null;

interface Props {
  /** Opens a URL in the browser — the UI iframe cannot navigate on its own. */
  onOpenUrl: (url: string) => void;
}

/** A row in the help sheet that leaves Figma. */
function LinkRow({ label, url, onOpenUrl }: { label: string; url: string; onOpenUrl: (u: string) => void }) {
  return (
    <button className="link-row" onClick={() => onOpenUrl(url)}>
      <span>{label}</span>
      <IconExternal />
    </button>
  );
}

/** Guide sheet — one tab per family of checks, following the ARIA tabs pattern. */
function GuidePanel(): React.ReactElement {
  const [index, setIndex] = useState(0);
  const active = GUIDE_TABS[index] ?? GUIDE_TABS[0];

  function onTabKey(e: React.KeyboardEvent): void {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const nextIndex = (index + step + GUIDE_TABS.length) % GUIDE_TABS.length;
    setIndex(nextIndex);
    document.getElementById(`guide-tab-${GUIDE_TABS[nextIndex]?.id}`)?.focus();
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label="What Legibly checks">
        {GUIDE_TABS.map((t, i) => (
          <button
            key={t.id}
            id={`guide-tab-${t.id}`}
            className="tab"
            role="tab"
            aria-selected={i === index}
            aria-controls={`guide-panel-${t.id}`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => setIndex(i)}
            onKeyDown={onTabKey}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className="modal-body"
        role="tabpanel"
        id={`guide-panel-${active.id}`}
        aria-labelledby={`guide-tab-${active.id}`}
        tabIndex={0}
      >
        <div className="sc-line">{active.sc}</div>
        <div className="guide-block">
          <h3>What we check</h3>
          <p>{active.check}</p>
        </div>
        <div className="guide-block">
          <h3>How we check it</h3>
          <p>{active.how}</p>
        </div>
        <div className="guide-block">
          <h3>What we suggest</h3>
          <p>{active.advice}</p>
        </div>
        <div className="guide-block">
          <h3>What it saves you</h3>
          <p>{active.help}</p>
        </div>
        <p className="microtext">
          Anything we cannot measure with certainty is listed under “Check by eye” — never silently
          passed.
        </p>
      </div>
    </>
  );
}

/** Plans sheet. Presentational only — nothing is gated yet (F20: fix is free during beta). */
function PlansPanel({ onOpenUrl }: Props): React.ReactElement {
  return (
    <div className="modal-body">
      <p>
        Finding the problem is free, forever. Pro is for the part that costs you the afternoon —
        clearing every issue in the file with one button instead of one layer at a time, and walking
        out with a report an auditor accepts.
      </p>

      <div className="plan-card">
        <div className="plan-head">
          <span className="plan-name">Free</span>
          <span className="plan-price">$0</span>
        </div>
        <ul className="plan-list">
          <li>Unlimited scanning — selection or full canvas</li>
          <li>All checks: contrast, non-text contrast, tap targets, line height, alt text</li>
          <li>Certain issues separated from “Check by eye”, with the reason for each</li>
        </ul>
      </div>

      <div className="plan-card is-pro">
        <div className="plan-head">
          <span className="plan-name">Pro</span>
          <span className="plan-price">$12/mo</span>
        </div>
        <ul className="plan-list">
          <li>One-click fix, snapped to a passing colour from your own library</li>
          <li>Fix everything at once — the whole file, one button, each fix re-verified</li>
          <li>Compliance report export (CSV) with before/after and the criterion for each finding</li>
        </ul>
        <p className="microtext">
          Free while Legibly is in public beta — fixing is unlocked for everyone today.
        </p>
      </div>

      <div className="modal-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onOpenUrl(LINKS.subscribe)}>
          Subscribe
        </button>
        <button className="btn btn-sm" onClick={() => onOpenUrl(LINKS.feedback)}>
          Send feedback →
        </button>
      </div>
    </div>
  );
}

/** Footer strip: guide on the left, plans in the middle, help on the right. */
export function FooterBar({ onOpenUrl }: Props): React.ReactElement {
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);

  return (
    <>
      <div className="appbar">
        <button
          className="btn btn-icon btn-quiet"
          title="How Legibly checks"
          aria-label="How Legibly checks"
          aria-haspopup="dialog"
          onClick={() => setPanel('guide')}
        >
          <IconGear />
        </button>

        <button className="plan-pill" aria-haspopup="dialog" onClick={() => setPanel('plans')}>
          <span className="plan-dot" aria-hidden="true" />
          Free &amp; Pro
        </button>

        <button
          className="btn btn-icon btn-quiet"
          title="Help"
          aria-label="Help"
          aria-haspopup="dialog"
          onClick={() => setPanel('help')}
        >
          <IconHelp />
        </button>
      </div>

      {panel === 'guide' && (
        <Modal title="What Legibly checks" onClose={close}>
          <GuidePanel />
        </Modal>
      )}

      {panel === 'plans' && (
        <Modal title="Free & Pro" onClose={close}>
          <PlansPanel onOpenUrl={onOpenUrl} />
        </Modal>
      )}

      {panel === 'help' && (
        <Modal title="Need help?" onClose={close}>
          <div className="modal-body">
            <LinkRow label="Compare plans" url={LINKS.plans} onOpenUrl={onOpenUrl} />
            <LinkRow label="Read the docs" url={LINKS.docs} onOpenUrl={onOpenUrl} />
            <LinkRow label="Send feedback" url={LINKS.feedback} onOpenUrl={onOpenUrl} />
            <LinkRow label="Contact us" url={LINKS.contact} onOpenUrl={onOpenUrl} />
            <LinkRow label="Subscribe to updates" url={LINKS.subscribe} onOpenUrl={onOpenUrl} />
            <p className="microtext modal-foot">
              Legibly runs on your device. Nothing leaves Figma unless you add your own AI key.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
