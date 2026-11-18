import { FC, Ref } from 'react';

interface ButtonSearchProps {
  onClick?: () => void;
  disabled: '' | boolean | string;
  /**
   * Defaults to `button`.
   *
   * It was optional and unset, and React omits an attribute whose value is
   * `undefined` — which leaves a bare `<button>`, and HTML defaults *that* to
   * `submit`. Harmless where it renders today, and a form submitted by the wrong
   * control the first time one of these is placed inside a `<form>`.
   */
  type?: 'submit' | 'reset' | 'button';
  /** Lets a size picker hand focus to Search once the size is complete (049). */
  ref?: Ref<HTMLButtonElement>;
  /** A ring that says "next" after the size is complete (049, D3). */
  highlight?: boolean;
}

const ButtonSearch: FC<ButtonSearchProps> = ({
  onClick,
  disabled,
  type = 'button',
  ref,
  highlight = false,
}) => {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={!disabled}
      className={`w-full py-2 text-lg font-medium rounded-lg transition-colors ${
        disabled
          ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }${highlight ? ' search-ready' : ''}`}
    >
      {disabled ? 'Search Tires' : 'Select all measurements'}
    </button>
  );
};

export default ButtonSearch;
