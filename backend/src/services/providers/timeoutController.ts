import { AppError } from '../../utils/http.js';

/**
 * Combines an external abort signal (e.g. client disconnect) with an
 * inactivity timeout: the controller aborts if the external signal aborts,
 * OR if `reset()` isn't called again within `timeoutMs`. This lets a
 * streaming provider call be cut off both when the caller goes away and
 * when the provider itself hangs (no bytes, ever) without capping the
 * total duration of a long-but-healthy stream.
 */
export class TimeoutController {
  readonly controller = new AbortController();
  private timer: NodeJS.Timeout | undefined;
  private timedOut = false;

  constructor(
    private readonly timeoutMs: number,
    externalSignal?: AbortSignal,
  ) {
    if (externalSignal) {
      if (externalSignal.aborted) {
        this.controller.abort();
      } else {
        externalSignal.addEventListener('abort', () => this.controller.abort(), { once: true });
      }
    }
    this.reset();
  }

  /** Call after every chunk received to push the deadline back out. */
  reset() {
    if (this.controller.signal.aborted) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timedOut = true;
      this.controller.abort();
    }, this.timeoutMs);
    this.timer.unref?.();
  }

  clear() {
    clearTimeout(this.timer);
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get isTimeout(): boolean {
    return this.timedOut;
  }
}

/**
 * If `error` is an AbortError caused by our own inactivity timeout (rather
 * than the caller's external signal), turn it into a clear AppError so it
 * surfaces to the user/logs as a timeout instead of a generic abort.
 */
export function normalizeTimeoutError(error: unknown, timeout: TimeoutController): unknown {
  if (timeout.isTimeout && error instanceof Error && error.name === 'AbortError') {
    return new AppError(504, 'The AI provider took too long to respond.', 'AI_PROVIDER_TIMEOUT');
  }
  return error;
}
