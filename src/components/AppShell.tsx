"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import Breadcrumb from "./Breadcrumb";
import ScrollToTopButton from "./ScrollToTopButton";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const hasOwnSidebar = pathname.startsWith("/goods") || pathname.startsWith("/customer");
  const showAppShell = pathname !== "/login" && pathname !== "/";
  const showBreadcrumb = showAppShell;
  const showSidebar = showAppShell && !hasOwnSidebar && Boolean(user);
  const showFooter = pathname !== "/login";
  const isMainDashboard = pathname === "/main";

  return (
    <div
      className={`flex-1 w-full flex flex-col ${
        isMainDashboard ? "max-w-none" : "max-w-[1680px] mx-auto"
      } ${showAppShell ? "pb-[80px] lg:pb-0" : ""}`}
    >
      <div className="flex-1 flex">
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0">
          {showBreadcrumb && !isMainDashboard && <Breadcrumb />}
          <div
            key={`${pathname}-${loading}`}
            className={isMainDashboard ? "" : "animate-[fade-slide-up_320ms_ease-out_both]"}
          >
            {children}
          </div>
        </main>
      </div>
      {showFooter && <Footer />}
      <ScrollToTopButton />
      {showAppShell && <MobileBottomNav />}
    </div>
  );
}
