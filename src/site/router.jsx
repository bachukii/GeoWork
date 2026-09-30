import React, { useEffect, useState } from "react";

// მინიმალური router — history API, ბიბლიოთეკის გარეშე.
// Netlify-ზე ყველა მისამართი index.html-ზე მიდის (netlify.toml), ამიტომ
// პირდაპირ გახსნილი /services ან /contact-იც მუშაობს.

const listeners = new Set();

const here = () => window.location.pathname + window.location.search + window.location.hash;

export function navigate(to) {
  if (to === here()) {
    scrollToHash();
    return;
  }
  window.history.pushState({}, "", to);
  listeners.forEach((fn) => fn());
  if (!window.location.hash) window.scrollTo(0, 0);
}

// #slug — გადახვევა ელემენტზე (რენდერის შემდეგ, რომ ელემენტი უკვე არსებობდეს)
export function scrollToHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
}

export function usePath() {
  const read = () => ({
    path: window.location.pathname, search: window.location.search, hash: window.location.hash,
  });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const update = () => setLoc(read());
    listeners.add(update);
    window.addEventListener("popstate", update);
    return () => { listeners.delete(update); window.removeEventListener("popstate", update); };
  }, []);
  return loc;
}

export function Link({ to, className, children, onClick, ...rest }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
