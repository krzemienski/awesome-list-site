import { Component, lazy, Suspense, type ComponentProps, type ComponentType } from "react";

/**
 * Lazy component for chrome that is optional to the page (a breadcrumb
 * disclosure, a contact link). It renders outside RouteErrorBoundary, so a
 * rejected chunk import must degrade to nothing instead of unmounting the app.
 *
 * React.lazy caches a rejection for the life of the lazy object, so the lazy is
 * recreated, never reused, once the failure has been seen: when the browser
 * reports `online`, and when the component mounts again (navigation).
 */
export function lazyOptional<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  let failed = false;
  const create = () =>
    lazy(() =>
      factory().catch((error: unknown) => {
        failed = true;
        throw error;
      }),
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
      window.addEventListener("online", this.handleOnline);
    }

    componentWillUnmount() {
      window.removeEventListener("online", this.handleOnline);
    }

    handleOnline = () => {
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
