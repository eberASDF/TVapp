export function useLiveCamera(): {
  active: boolean;
  busy: boolean;
  status: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};
