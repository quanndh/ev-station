import { ClientGuard } from "@/components/auth/ClientGuard";
import { ManageStationHistoryDetailPage } from "@/components/manage/ManageStationHistoryDetailPage";

export default function AdminStationDetailPage() {
  return (
    <ClientGuard allow={["admin"]}>
      <ManageStationHistoryDetailPage listRootPath="/admin/stations" manageContext="admin" />
    </ClientGuard>
  );
}
