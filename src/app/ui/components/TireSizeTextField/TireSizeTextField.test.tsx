import { useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import TireSizeTextField, { isCompleteTireSize } from './TireSizeTextField';

function Host() {
  const [value, setValue] = useState('');
  return <TireSizeTextField value={value} onValueChange={setValue} />;
}

describe('TireSizeTextField (home, instant quote and the size index)', () => {
  it('formats digits as Width/Aspect/Diameter while typing', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByRole('textbox', { name: 'Tire Size' });
    await user.type(input, '225');
    expect(input).toHaveValue('225');
    await user.type(input, '40');
    expect(input).toHaveValue('225/40');
    await user.type(input, '18');
    expect(input).toHaveValue('225/40/18');
  });

  it('reduces a pasted size to its digits', () => {
    render(<Host />);
    const input = screen.getByRole('textbox', { name: 'Tire Size' });
    fireEvent.change(input, { target: { value: 'P225/40 ZR18' } });
    expect(input).toHaveValue('225/40/18');
  });

  it('flags an incomplete size, and its message is described by the field', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByRole('textbox', { name: 'Tire Size' });
    await user.type(input, '2254');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
  });

  it('clears', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByRole('textbox', { name: 'Tire Size' });
    await user.type(input, '22540');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(input).toHaveValue('');
  });

  it('knows a complete size', () => {
    expect(isCompleteTireSize('225/40/18')).toBe(true);
    expect(isCompleteTireSize('225/40/1')).toBe(false);
  });
});
