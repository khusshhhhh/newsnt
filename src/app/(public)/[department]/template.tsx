/**
 * template.tsx remounts on every navigation (unlike layout.tsx), so this
 * fades each new page in without re-animating the header/footer, which
 * live in the layout above this and stay mounted across navigations. The
 * animation is plain CSS (`.page-in` in globals.css) so the first paint
 * never waits on JavaScript.
 */
export default function DepartmentTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
