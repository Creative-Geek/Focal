import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ScanLine, Settings, Home, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsDialog } from "./SettingsDialog";
import { Button } from "./ui/button";
import { UserMenu } from "./UserMenu";
const Header: React.FC = () => {
  const activeLinkClass = "text-focal-blue-500";
  const inactiveLinkClass =
    "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
  return (
    <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-40 border-b">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <NavLink to="/" className="flex items-center gap-1.5 sm:gap-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-gray-900" />
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-white">
              Focal
            </h1>
          </NavLink>
          <nav className="hidden sm:flex items-center space-x-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "font-semibold transition-colors duration-200",
                  isActive ? activeLinkClass : inactiveLinkClass
                )
              }
            >
              Scan
            </NavLink>
            <NavLink
              to="/expenses"
              className={({ isActive }) =>
                cn(
                  "font-semibold transition-colors duration-200",
                  isActive ? activeLinkClass : inactiveLinkClass
                )
              }
            >
              Expenses
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="relative top-0 right-0" />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};
const Footer: React.FC<{ onSettingsClick: () => void }> = ({
  onSettingsClick,
}) => {
  return (
    <footer className="bg-background border-t hidden sm:block">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <div className="flex justify-center items-center gap-4">
          <p>
            Built with ❤️ at Cloudflare. All expenses are stored locally in your
            browser.
          </p>
          <Button variant="ghost" size="sm" onClick={onSettingsClick}>
            <Settings className="h-4 w-4 mr-2" />
            API Key Settings
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          AI features require a Google AI API key. Configure your key in
          settings to enable receipt scanning.
        </p>
      </div>
    </footer>
  );
};
const BottomNav: React.FC<{ onSettingsClick: () => void }> = ({
  onSettingsClick,
}) => {
  const location = useLocation();
  const activeLinkClass = "text-focal-blue-500";
  const inactiveLinkClass = "text-gray-500 dark:text-gray-400";
  const getLinkClass = (path: string) =>
    cn(
      "flex flex-col items-center gap-1 transition-colors duration-200 w-1/3",
      location.pathname === path ? activeLinkClass : inactiveLinkClass
    );
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t h-16 z-40 flex items-center justify-around safe-area-inset-bottom">
      <NavLink to="/" className={getLinkClass("/")}>
        <Home className="h-6 w-6" />
        <span className="text-xs font-medium">Scan</span>
      </NavLink>
      <NavLink to="/expenses" className={getLinkClass("/expenses")}>
        <Wallet className="h-6 w-6" />
        <span className="text-xs font-medium">Expenses</span>
      </NavLink>
      <button
        onClick={onSettingsClick}
        className={cn(
          "flex flex-col items-center gap-1 transition-colors duration-200 w-1/3",
          inactiveLinkClass
        )}
      >
        <Settings className="h-6 w-6" />
        <span className="text-xs font-medium">Settings</span>
      </button>
    </nav>
  );
};
export const Layout: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden">
      <Header />
      <main className="flex-grow pb-20 sm:pb-0">
        <Outlet />
      </main>
      <Footer onSettingsClick={() => setIsSettingsOpen(true)} />
      <BottomNav onSettingsClick={() => setIsSettingsOpen(true)} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
};
