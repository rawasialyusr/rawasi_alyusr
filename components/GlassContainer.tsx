"use client";
import React from 'react';

export default function GlassContainer({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`glass-container ${className}`}>
      <style jsx>{`
        .glass-container {
          width: 100%;
          max-width: 1250px;
          margin: 40px auto;
          background: var(--glass-surface);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 768px) {
          .glass-container { padding: 20px; margin: 20px auto; border-radius: 16px; width: 95%; }
        }
      `}</style>
      {children}
    </div>
  );
}