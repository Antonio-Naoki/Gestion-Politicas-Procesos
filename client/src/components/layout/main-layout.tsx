import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface MainLayoutProps {
  children: React.ReactNode;
  pendingApprovalCount?: number;
  pendingTaskCount?: number;
}

export function MainLayout({ 
  children, 
  pendingApprovalCount = 0, 
  pendingTaskCount = 0 
}: MainLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleSidebar} />
          <div className="relative w-64 h-full">
            <Sidebar 
              pendingApprovalCount={pendingApprovalCount} 
              pendingTaskCount={pendingTaskCount} 
            />
          </div>
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <Sidebar 
        pendingApprovalCount={pendingApprovalCount} 
        pendingTaskCount={pendingTaskCount} 
      />
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar} 
          notificationCount={pendingApprovalCount + pendingTaskCount}
        />
        
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
