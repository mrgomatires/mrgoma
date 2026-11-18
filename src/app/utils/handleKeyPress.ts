import React from 'react';

/**
 * Keeps the typed tire-size field to digits and "/".
 *
 * Only **printable** keys are filtered. Named keys (Enter, Tab, arrows, Delete,
 * Home/End) and shortcuts (Ctrl/Cmd+V, +A, +Z) pass: blocking Tab trapped
 * keyboard users in the field (WCAG 2.1.2) and blocking Enter meant the form
 * could only be submitted with the mouse. Found in 050's review.
 */
export const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!/^[0-9/]$/.test(e.key)) e.preventDefault();
};
