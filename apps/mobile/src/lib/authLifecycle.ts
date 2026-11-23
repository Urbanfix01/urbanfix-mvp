type AuthRefresh = { startAutoRefresh(): void; stopAutoRefresh(): void };
type Lifecycle = {
  currentState: string | null;
  addEventListener(event: 'change', listener: (state: string) => void): { remove(): void };
};

export function attachAuthRefresh(auth: AuthRefresh, lifecycle: Lifecycle) {
  const change = (state: string | null) => {
    if (state === 'active') auth.startAutoRefresh();
    else auth.stopAutoRefresh();
  };
  const subscription = lifecycle.addEventListener('change', change);
  change(lifecycle.currentState);
  return () => { subscription.remove(); auth.stopAutoRefresh(); };
}
