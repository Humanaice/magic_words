/**
 * requestAnimationFrame loop with a fixed simulation step.
 *
 * The original game advanced one "tick" per animation frame, so it ran faster
 * on 120/144 Hz screens and slower on busy phones. Here real elapsed time
 * (delta time) is accumulated and the simulation advances in fixed 1/60 s
 * ticks, which keeps every original constant (speeds, timers) unchanged and
 * makes the game run at the same pace on every device. Rendering happens once
 * per animation frame.
 */
export class FixedStepLoop {
  private rafId = 0;
  private last = 0;
  private accumulator = 0;
  private running = false;
  private readonly stepMs: number;

  constructor(
    ticksPerSecond: number,
    private readonly update: () => void,
    private readonly render: () => void,
    /** Upper bound for one frame's delta, so a background tab doesn't fast-forward. */
    private readonly maxFrameMs = 250,
  ) {
    this.stepMs = 1000 / ticksPerSecond;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Forget accumulated time (e.g. after a pause) so the game doesn't jump ahead. */
  resetClock(): void {
    this.last = performance.now();
    this.accumulator = 0;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const delta = Math.min(now - this.last, this.maxFrameMs);
    this.last = now;
    this.accumulator += delta;
    while (this.accumulator >= this.stepMs) {
      this.update();
      this.accumulator -= this.stepMs;
    }
    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };
}
