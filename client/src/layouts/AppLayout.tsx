import React from 'react';
import { Header } from '../components/Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        RoomWise &copy; 2026 — Smart Classroom Allocation & Disruption Recovery System
      </footer>
    </div>
  );
};
