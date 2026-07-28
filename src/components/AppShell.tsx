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

  return (
    <div className="flex-1 w-full max-w-[1240px] mx-auto flex flex-col">
      <div className="flex-1 flex">
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0">
          {showBreadcrumb && <Breadcrumb />}
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
