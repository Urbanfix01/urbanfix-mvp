import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';
import type { DesignSurfaceProps, DesignSurfaceRef } from './DesignSurface';
export default forwardRef<DesignSurfaceRef, DesignSurfaceProps>(function DesignSurface({ html, onMessage, onError }, ref) {
  const view = useRef<WebView>(null);
  const source = useMemo(() => ({ html }), [html]);
  useImperativeHandle(ref, () => ({ send(message) { view.current?.injectJavaScript(`window.__urbanfixReceive&&window.__urbanfixReceive(${JSON.stringify(message).replace(/</g, '\\u003c')});true;`); } }), []);
  return <WebView ref={view} style={{ flex: 1 }} source={source} originWhitelist={['*']}
    onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
    onMessage={(event) => { if (event.nativeEvent.url === 'about:blank') onMessage(event.nativeEvent.data); }}
    onError={() => onError('No se pudo iniciar el editor integrado. Volvé a abrir el proyecto.')}
    javaScriptEnabled domStorageEnabled={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
    setSupportMultipleWindows={false} allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
    javaScriptCanOpenWindowsAutomatically={false} mixedContentMode="never" allowsInlineMediaPlayback={false} />;
});
