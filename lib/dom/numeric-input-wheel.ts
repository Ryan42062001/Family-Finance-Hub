/**
 * Central wheel protection for native <input type="number"> controls.
 * Browser wheel default can step focused number inputs; cancel that default
 * without blurring the input (which could submit/normalize draft values).
 *
 * The browser also owns normal wheel scrolling; once canceled, delegate only
 * that scroll to the closest eligible scrolling ancestor and then the page.
 * No preventDefault for unfocused/non-number inputs or unrelated elements.
 */
export type NumericWheelEnvironment = {
  activeElement: Element | null;
  viewportHeight: number;
  getOverflow: (element: HTMLElement) => { x: string; y: string };
  scrollPage: (dx: number, dy: number) => void;
};

const scrollable = (overflow: string) => /^(auto|scroll|overlay)$/.test(overflow);
const clamp = (value: number, upper: number) => Math.min(Math.max(0, value), Math.max(0, upper));

export function protectFocusedNumberFromWheel(
  event: WheelEvent,
  environment: NumericWheelEnvironment,
): boolean {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) ||
      target.type !== "number" ||
      environment.activeElement !== target ||
      event.defaultPrevented) return false;

  // This is not a global scroll blocker: it applies to the focused number
  // input only. Native wheel-to-number stepping cannot run after cancellation.
  event.preventDefault();

  // Ctrl+wheel is a browser zoom gesture, not page scrolling; never convert
  // it to scrolling or to financial input changes.
  if (event.ctrlKey) return true;

  const factor = event.deltaMode === 1 ? 16
    : event.deltaMode === 2 ? environment.viewportHeight
    : 1;
  let dx = event.deltaX * factor;
  let dy = event.deltaY * factor;

  // Scroll containers (forms/dialogs etc.) before the page. Consume only the
  // available distance, allowing normal scroll chaining at their boundaries.
  for (let node: HTMLElement | null = target.parentElement; node; node = node.parentElement) {
    const overflow = environment.getOverflow(node);
    if (dx && scrollable(overflow.x) && node.scrollWidth > node.clientWidth) {
      const prior = node.scrollLeft;
      const next = clamp(prior + dx, node.scrollWidth - node.clientWidth);
      node.scrollLeft = next;
      dx -= next - prior;
    }
    if (dy && scrollable(overflow.y) && node.scrollHeight > node.clientHeight) {
      const prior = node.scrollTop;
      const next = clamp(prior + dy, node.scrollHeight - node.clientHeight);
      node.scrollTop = next;
      dy -= next - prior;
    }
    if (!dx && !dy) break;
  }
  if (dx || dy) environment.scrollPage(dx, dy);
  return true;
}
