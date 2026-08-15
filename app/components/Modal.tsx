"use client";

import { useEffect, useRef } from "react";

export function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose(): void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? [])];
    focusable()[0]?.focus();
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab") { const items=focusable(); if (!items.length) return; const first=items[0],last=items.at(-1)!; if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); } } };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></header>
      {children}
    </section>
  </div>;
}
