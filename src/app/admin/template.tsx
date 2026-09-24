/**
 * template.tsx remounts on every navigation (unlike layout.tsx), so this
 * fades each new admin page in without re-animating the sidebar, which
 * lives in the layout above this and stays mounted across navigations.
 * Plain CSS (`.page-in` in globals.css) so the first paint never waits on
 * hydration.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
