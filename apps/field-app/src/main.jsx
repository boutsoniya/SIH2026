import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('NARCOSCOPE render error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          padding: '48px 24px',
          display: 'grid',
          placeItems: 'center',
          background: '#070b12',
          color: '#e8eef8',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: 720,
            width: '100%',
            border: '1px solid #33465f',
            borderRadius: 18,
            padding: 28,
            background: '#0c131f'
          }}>
            <div style={{ fontSize: 12, letterSpacing: '.14em', opacity: .65 }}>NARCOSCOPE</div>
            <h1 style={{ margin: '10px 0 12px', fontSize: 28 }}>Field app failed to render</h1>
            <p style={{ color: '#9aaabd', lineHeight: 1.6 }}>
              The deployment is reachable, but the browser hit a runtime error while loading the app.
            </p>
            <pre style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              padding: 14,
              borderRadius: 10,
              background: '#09101a',
              color: '#d7e0eb',
              border: '1px solid #223247'
            }}>{this.state.error?.stack || this.state.error?.message || String(this.state.error)}</pre>
            <p style={{ color: '#7f8ea3', fontSize: 12 }}>
              Open the browser console for the full error details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  rootElement.innerHTML = '<div style="min-height:100vh;background:#070b12;color:#9aaabd;display:grid;place-items:center;font:14px system-ui,sans-serif">Loading NARCOSCOPE…</div>';

  try {
    createRoot(rootElement).render(
      <React.StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('NARCOSCOPE bootstrap error', error);
    rootElement.innerHTML = `<div style="min-height:100vh;padding:48px 24px;background:#070b12;color:#e8eef8;font:14px system-ui,sans-serif"><div style="max-width:720px;margin:0 auto;border:1px solid #33465f;border-radius:18px;padding:28px;background:#0c131f"><div style="font-size:12px;letter-spacing:.14em;opacity:.65">NARCOSCOPE</div><h1 style="font-size:28px">Field app failed to start</h1><p style="color:#9aaabd;line-height:1.6">The deployment is reachable, but the browser could not start the React application.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;border-radius:10px;background:#09101a;color:#d7e0eb;border:1px solid #223247">${error?.stack || error?.message || String(error)}</pre></div></div>`;
  }
}
