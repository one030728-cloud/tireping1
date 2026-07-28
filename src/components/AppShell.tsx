"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import Breadcrumb from "./Breadcrumb";
import ScrollToTopButton from "./ScrollToTopButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const hasOwnSidebar = pathname.startsWith("/goods") || pathname.startsWith("/customer");
  const showBreadcrumb = user && pathname !== "/login" && pathname !== "/";
  const showSidebar = showBreadcrumb && !hasOwnSidebar;
  const showFooter = pathname !== "/login";
  const isMainDashboard = pathname === "/main";

  return (
    <div
      className={`flex-1 w-full flex flex-col ${
        isMainDashboard ? "max-w-none" : "max-w-[1680px] mx-auto"
      }`}
    >
      <div className="flex-1 flex">
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0">
          {showBreadcrumb && !isMainDashboard && <Breadcrumb />}
          <div
            key={`${pathname}-${loading}`}
            className="animate-[fade-slide-up_320ms_ease-out_both]"
          >
            {children}
          </div>
        </main>
      </div>
      {showFooter && <Footer />}
      <ScrollToTopButton />
    </div>
  );
}
