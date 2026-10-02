import React from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingPanel } from './floatingPanel';
import './content.css';

const CONTAINER_ID = 'hackerrank-assistant-root';

function injectAssistant() {
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }

  // Only inject if on HackerRank practice page
  const isChallenge = window.location.pathname.includes('/challenges/');
  if (!isChallenge) {
    return;
  }

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<FloatingPanel onClose={() => container.remove()} />);
}

// Initial injection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAssistant);
} else {
  injectAssistant();
}

// Observe URL changes in Single Page Application (SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    injectAssistant();
  }
}).observe(document, { subtree: true, childList: true });
