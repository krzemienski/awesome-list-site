import { Component, lazy, Suspense, type ComponentProps, type ComponentType } from "react";

/**
 * Lazy component for chrome that is optional to the page (a breadcrumb
 * disclosure, a contact link). It renders outside RouteErrorBoundary, so a
 * rejected chunk import must degrade to nothing instead of unmounting the app.
 *
 * React.lazy caches a rejection for the life of the lazy object, and the
 * browser's module map caches a failed `import()` per URL, so calling the same
 * import again rejects without a request. The lazy is therefore recreated, and
 * the retry imports the failed chunk's URL with a `?retry=n` suffix, which the
 * browser has never seen. The chunk's own dependencies keep their URLs and are
 * shared with the app. The retry is triggered when the browser reports
 * `online`, when the component mounts again, and when `retryOptionalChunks()`
 * is called (route change, user intent), never by a loop. A browser whose
 * error omits the URL cannot retry and keeps the chunk hidden until reload.
 */
const RETRY_EVENT = "awesome:retry-optional-chunks";

export function retryOptionalChunks() {
  window.dispatchEvent(new Event(RETRY_EVENT));
}

function failedChunkUrl(error: unknown): string | undefined {
  const raw = error instanceof Error ? /https?:\/\/[^\s"')]+/.exec(error.message)?.[0] : undefined;
  if (!raw) return undefined;
  const url = new URL(raw);
  return url.origin + url.pathname;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- props are contravariant; any accepts every component's own props
export function lazyOptional<M, T extends ComponentType<any>>(
  importer: () => Promise<M>,
  pick: (module: M) => T = (module) => (module as { default: T }).default,
) {
  let failed = false;
  let failedUrl: string | undefined;
  let attempt = 0;
  const load = (): Promise<M> =>
    failedUrl ? import(/* @vite-ignore */ `${failedUrl}?retry=${++attempt}`) : importer();
  const create = () =>
    lazy(() =>
      load().then(
        (module) => ({ default: pick(module) }),
        (error: unknown) => {
          failed = true;
          failedUrl = failedChunkUrl(error) ?? failedUrl;
          throw error;
        },
      ),
    );
  let Inner = create();
  const renew = () => {
    if (!failed) return;
    failed = false;
    Inner = create();
  };

  class OptionalChunk extends Component<ComponentProps<T>, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    constructor(props: ComponentProps<T>) {
      super(props);
      renew();
    }

    componentDidMount() {
      window.addEventListener("online", this.handleRetry);
      window.addEventListener(RETRY_EVENT, this.handleRetry);
    }

    componentWillUnmount() {
      window.removeEventListener("online", this.handleRetry);
      window.removeEventListener(RETRY_EVENT, this.handleRetry);
    }

    handleRetry = () => {
      if (!this.state.hasError) return;
      renew();
      this.setState({ hasError: false });
    };

    render() {
      if (this.state.hasError) return null;
      return (
        <Suspense fallback={null}>
          <Inner {...(this.props as ComponentProps<T>)} />
        </Suspense>
      );
    }
  }

  return OptionalChunk;
}
