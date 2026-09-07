import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from '../features/search/CommandPalette';
import { NotificationDrawer } from '../features/notifications/NotificationDrawer';
import { GlobalScanner } from './GlobalScanner';
import { LicenseBanner } from './components/LicenseBanner';
import { LicenseBlockedOverlay } from './components/LicenseBlockedOverlay';

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text-primary selection:bg-brand-500/30">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <LicenseBanner />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <NotificationDrawer />
      <GlobalScanner />
      <LicenseBlockedOverlay />
    </div>
  );
};
