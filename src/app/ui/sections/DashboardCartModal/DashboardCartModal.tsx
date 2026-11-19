'use client';

import React, { FC } from 'react';

import { useCart } from '@/app/context/CartContext';
import { WhatsAppIcon } from '@/app/ui/icons/WhatsAppIcon';
import CartModal from '@/app/ui/sections/CartModal/CartModal';

const DashboardCartFooter: FC = () => {
  const { cartItems, clearCart, setShowCartModal } = useCart();

  const handleSend = () => {
    if (cartItems.length === 0) return;

    const date = new Date().toLocaleString('en-US');

    const lines: string[] = [
      'Tire Quote Request',
      `Date: ${date}`,
      '',
      'Selected tires:',
      ...cartItems.map(item => {
        const price = item.price > 0 ? ` — $${item.price.toFixed(2)}` : '';
        const store = item.condition ? ` | ${item.condition}` : '';
        const ref = item.code ? `Code: ${item.code}` : `ID: ${item.id}`;
        return `• ${item.name} (${ref}) x${item.quantity}${price}${store}`;
      }),
      '',
    ];

    const url = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    clearCart();
    setShowCartModal(false);
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-gray-200 p-4 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/75">
      <button
        type="button"
        disabled={cartItems.length === 0}
        onClick={handleSend}
        className={`flex justify-center items-center gap-2 px-6 py-3 rounded-md shadow-sm text-base font-semibold text-white bg-green-600 w-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
          cartItems.length === 0
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-green-700 cursor-pointer'
        }`}
      >
        <WhatsAppIcon className="h-5 w-5 shrink-0" />
        Send via WhatsApp
      </button>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          className="text-sm font-semibold text-green-700 hover:text-green-800 cursor-pointer px-4 py-2 rounded-md border border-green-200 hover:bg-green-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          onClick={() => setShowCartModal(false)}
        >
          Continue selecting
        </button>
      </div>
    </div>
  );
};

const DashboardCartModal: FC = () => <CartModal footer={<DashboardCartFooter />} />;

export default DashboardCartModal;
