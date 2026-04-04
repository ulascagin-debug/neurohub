import { DashboardLayout } from "@/components/dashboard-layout"

export default function DashboardGroup({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
