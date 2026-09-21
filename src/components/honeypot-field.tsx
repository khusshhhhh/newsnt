/**
 * Hidden decoy field for the inquiry forms — real visitors never see or
 * focus it, but simple bots that fill every field in a form will trip it.
 * Paired with the elapsed-time check in submitInquiry (see
 * lib/actions/inquiries.ts); together they filter spam without ever
 * showing a real person a CAPTCHA.
 */
export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
    >
      <label htmlFor="inquiry-company">Company</label>
      <input id="inquiry-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
