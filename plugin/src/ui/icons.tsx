/** Icons shared by more than one component. Single-component icons stay local. */
import React from 'react';

export function IconClose(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Gear — opens the "how Legibly checks" guide. */
export function IconGear(): React.ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12.9 9.7a1.1 1.1 0 00.22 1.21l.04.04a1.33 1.33 0 11-1.88 1.88l-.04-.04a1.1 1.1 0 00-1.21-.22 1.1 1.1 0 00-.67 1v.11a1.33 1.33 0 11-2.67 0v-.06a1.1 1.1 0 00-.72-1 1.1 1.1 0 00-1.21.22l-.04.04A1.33 1.33 0 112.84 11l.04-.04a1.1 1.1 0 00.22-1.21 1.1 1.1 0 00-1-.67h-.11a1.33 1.33 0 110-2.67h.06a1.1 1.1 0 001-.72 1.1 1.1 0 00-.22-1.21l-.04-.04A1.33 1.33 0 114.67 2.5l.04.04a1.1 1.1 0 001.21.22h.05a1.1 1.1 0 00.67-1v-.11a1.33 1.33 0 112.67 0v.06a1.1 1.1 0 00.67 1 1.1 1.1 0 001.21-.22l.04-.04a1.33 1.33 0 111.88 1.88l-.04.04a1.1 1.1 0 00-.22 1.21v.05a1.1 1.1 0 001 .67h.11a1.33 1.33 0 110 2.67h-.06a1.1 1.1 0 00-1 .67z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Question mark in a circle — opens the help menu. */
export function IconHelp(): React.ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6.3 6.15a1.75 1.75 0 113.35.75c-.24.53-.75.8-1.13 1.1-.32.26-.42.5-.42.95"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.3" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** Trailing glyph on rows that leave Figma for the browser. */
export function IconExternal(): React.ReactElement {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 3.5H3.5v9h9v-3M9.5 3.5h3v3M12.5 3.5L7 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
