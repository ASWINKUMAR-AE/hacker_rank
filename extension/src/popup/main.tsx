import React from 'react';
import { createRoot } from 'react-dom/client';
import { PopupView } from './PopupView';
import '../content/content.css';

const el = document.getElementById('popup-root');
if (el) {
  const root = createRoot(el);
  root.render(<PopupView />);
}
