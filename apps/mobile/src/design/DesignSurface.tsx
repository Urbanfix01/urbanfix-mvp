import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
export type DesignSurfaceRef = { send(message: unknown): void };
export type DesignSurfaceProps = { html: string; onMessage(data: string): void; onError(message: string): void };
export default forwardRef<DesignSurfaceRef, DesignSurfaceProps>(function DesignSurface({ html, onMessage }, ref) {
  const iframe = useRef<HTMLIFrameElement>(null), callback = useRef(onMessage); callback.current = onMessage;
  useImperativeHandle(ref, () => ({ send: (message) => iframe.current?.contentWindow?.postMessage(message, '*') }), []);
  useEffect(() => {
    const receive = (event: MessageEvent) => { if (event.source === iframe.current?.contentWindow && typeof event.data === 'string') callback.current(event.data); };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  // srcdoc can send ready before the effect subscribes; init is idempotent.
  return <iframe ref={iframe} title="Editor integrado UrbanFix" sandbox="allow-scripts" srcDoc={html}
    onLoad={() => callback.current(JSON.stringify({ version: 1, type: 'ready' }))}
    style={{ border: 0, width: '100%', height: '100%', flex: 1, minHeight: 300 }} />;
});
