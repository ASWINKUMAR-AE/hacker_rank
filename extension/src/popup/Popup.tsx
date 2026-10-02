import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import '../content/content.css';

const root = createRoot(document.getElementById('popup-root')!);
root.render(<Popup />);
