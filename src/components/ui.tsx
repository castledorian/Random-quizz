"use client";

import { useEffect, useId, useRef, type ReactNode, type CSSProperties } from "react";
import { Asterisk, Check, Coins, ShieldCheck, Sparkles, WandSparkles, X, Zap } from "lucide-react";
import { SHOP_ITEMS } from "@/lib/game";

export function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? "brand-small" : ""}`}><span className="brand-mark"><Asterisk strokeWidth={3.6} /></span><span>quizclub<span className="brand-dot">.</span></span></span>;
}
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input, button, select, textarea")?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); }
      if (event.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select, textarea, [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", handler); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={id}><div className="modal-heading"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div>{children}</div></div>;
}
export function Particles({ seed }: { seed: number }) {
  return <div className="particles" aria-hidden="true" key={seed}>{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ "--x": `${Math.cos(i * 2.4) * (110 + i * 7)}px`, "--y": `${Math.sin(i * 2.4) * (100 + i * 5) - 80}px`, "--r": `${i * 43}deg`, "--delay": `${(i % 4) * 0.02}s`, background: ["#c6f36b", "#ba97f2", "#f5b49f", "#fff"][i % 4] } as CSSProperties} />)}</div>;
}
export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return <button role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`toggle ${checked ? "is-on" : ""}`} onClick={onChange}><span /></button>;
}
export function ShopItemIcon({ id, size = 25 }: { id: string; size?: number }) {
  return id === "double" ? <Zap size={size} /> : id === "hint" ? <WandSparkles size={size} /> : <ShieldCheck size={size} />;
}
export function BonusShop({ coins, active, onBuy, message, disabled = false }: { coins: number; active: string[]; onBuy: (id: string) => void; message?: string; disabled?: boolean }) {
  return <><div className="shop-intro"><span className="eyebrow"><Sparkles size={14} /> UN PETIT COUP DE POUCE ?</span><p>Le talent, c’est bien. Un bonus au bon moment, c’est encore mieux.</p><span className="coin-balance"><Coins size={17} /> {coins} <small>pièces</small></span></div><div className="bonus-list">{SHOP_ITEMS.map(item => <div className="bonus-item" key={item.id}><div className="bonus-icon" style={{ background: `${item.color}15`, color: item.color }}><ShopItemIcon id={item.id} /></div><div><h3>{item.name}</h3><p>{item.description}</p></div><button className={`button ${active.includes(item.id) ? "button-ghost" : "button-soft"}`} disabled={disabled || coins < item.price || active.includes(item.id)} onClick={() => onBuy(item.id)}>{active.includes(item.id) ? <><Check size={15} /> Actif</> : <>{item.price}<Coins size={14} /></>}</button></div>)}</div>{message && <p className="inline-notice" role="status">{message}</p>}<p className="shop-footnote">Une bonne réponse rapporte 80 pièces. Une erreur ? 10 pièces de consolation.</p></>;
}
