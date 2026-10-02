import { describe, it, expect } from 'vitest';
import { ReactSolver } from '../backend/src/services/reactSolver';

describe('ReactSolver', () => {
  const solver = new ReactSolver();

  it('should parse existing React code and identify components and hooks', () => {
    const code = `
      import React, { useState } from 'react';
      
      export default function Counter() {
        const [count, setCount] = useState(0);
        const handleIncrement = () => setCount(count + 1);
        return <button onClick={handleIncrement}>{count}</button>;
      }
    `;

    const info = solver.analyzeReactCode(code, 'Counter.jsx');
    expect(info.components.length).toBeGreaterThan(0);
    expect(info.components[0].name).toBe('Counter');
    expect(info.components[0].stateHooks).toContain('count');
  });

  it('should generate minimal diff patch and summarize changes', () => {
    const orig = `import React from 'react'; export default function App() { return <div>Hello</div>; }`;
    const mod = `import React, { useState } from 'react'; export default function App() { const [items, setItems] = useState([]); return <div>Hello</div>; }`;

    const patch = solver.generatePatch(orig, mod, 'src/App.jsx');
    expect(patch.file).toBe('src/App.jsx');
    expect(patch.requiresApproval).toBe(true);
    expect(patch.changesSummary.some(c => c.includes('useState'))).toBe(true);
    expect(patch.diff).toContain('+import React, { useState }');
  });

  it('should validate React syntax and detect direct mutations', () => {
    const badCode = `
      export default function App() {
        state.count = 5;
        return <div>{state.count}</div>;
      }
    `;
    const result = solver.validateReactCode(badCode);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Direct mutation'))).toBe(true);
  });
});
