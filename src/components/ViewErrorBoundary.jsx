import React from 'react';

// Keeps a crash inside one menu view from blanking the whole page and shows
// the actual error so it can be reported. Remounted per view via `key`.
export default class ViewErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('View crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-rose-900">
        <div className="font-bold mb-1">This screen failed to load.</div>
        <div className="text-sm font-mono break-words mb-3">
          {String(error?.message || error)}
        </div>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }
}
