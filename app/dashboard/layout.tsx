import { SidebarProvider } from "@/lib/sidebar-context";
import { ShellLayout } from "@/components/layout/ShellLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ShellLayout>{children}</ShellLayout>
    </SidebarProvider>
  );
}
