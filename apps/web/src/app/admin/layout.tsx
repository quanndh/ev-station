import { BlobBackground } from "@/components/ui/blob-background";
import { AdminLayoutClient } from "@/app/admin/AdminLayoutClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BlobBackground>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </BlobBackground>
  );
}

