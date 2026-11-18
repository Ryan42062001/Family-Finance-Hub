"use client";

// FFH-P09: opens the browser's print dialog, where "Save as PDF" is available. Nothing is generated or stored on a server.
export default function PrintButton() {
  return <button type="button" onClick={() => window.print()}>Print or save as PDF</button>;
}
