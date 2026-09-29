import React, { useEffect, useState } from "react";

// მინიმალური router — history API, ბიბლიოთეკის გარეშე.
// Netlify-ზე ყველა მისამართი index.html-ზე მიდის (netlify.toml), ამიტომ
// პირდაპირ გახსნილი /services ან /contact-იც მუშაობს.

const listeners = new Set();

export function navigate(to) {
  if (to === window.location.pathname + window.location.search) return;
  window.history.pushState({}, "", to);
  listeners.forEach((fn) => fn());
  window.scrollTo(0, 0);
}

export function usePath() {
  const [loc, setLoc] = useState(() => ({
    path: window.location.pathname, search: window.location.search,
  }));
  useEffect(() => {
    const update = () => setLoc({ path: window.location.pathname, search: window.location.search });
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
