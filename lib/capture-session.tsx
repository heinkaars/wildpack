import React, { createContext, useContext, useMemo, useState } from 'react';
import { CelebrationPayload, IdentifyOutcome } from './types';

type CaptureSessionState = {
  photoUri: string | null;
  photoBase64: string | null;
  outcome: IdentifyOutcome | null;
  celebration: CelebrationPayload | null;
};

type CaptureSessionValue = CaptureSessionState & {
  setPhoto: (uri: string, base64: string) => void;
  setOutcome: (outcome: IdentifyOutcome) => void;
  setCelebration: (payload: CelebrationPayload) => void;
  reset: () => void;
};

const initialState: CaptureSessionState = {
  photoUri: null,
  photoBase64: null,
  outcome: null,
  celebration: null,
};

const CaptureSessionContext = createContext<CaptureSessionValue | null>(null);

export function CaptureSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CaptureSessionState>(initialState);

  const value = useMemo<CaptureSessionValue>(() => ({
    ...state,
    setPhoto: (uri, base64) => setState({ photoUri: uri, photoBase64: base64, outcome: null, celebration: null }),
    setOutcome: (outcome) => setState((prev) => ({ ...prev, outcome })),
    setCelebration: (payload) => setState((prev) => ({ ...prev, celebration: payload })),
    reset: () => setState(initialState),
  }), [state]);

  return <CaptureSessionContext.Provider value={value}>{children}</CaptureSessionContext.Provider>;
}

export function useCaptureSession(): CaptureSessionValue {
  const ctx = useContext(CaptureSessionContext);
  if (!ctx) throw new Error('useCaptureSession must be used within a CaptureSessionProvider');
  return ctx;
}
