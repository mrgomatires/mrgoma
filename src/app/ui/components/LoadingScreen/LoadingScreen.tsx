'use client';

import React from 'react';

import { ArrowsToRight } from '@/app/ui/icons/ArrowsToRight';

interface LoadingScreenProps {
  message?: string;
}

/**
 * A modern, full-screen loading component with a subtle animation.
 *
 * @param message Optional custom loading message
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading tires...' }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black opacity-85 backdrop-blur-md z-50">
      <div className="flex flex-col items-center justify-center text-white">
        <div className="mb-6">
          <ArrowsToRight className="w-24 h-12 animate-pulse" />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-white">{message}</h2>
        <div className="flex space-x-2">
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          ></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '600ms' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
