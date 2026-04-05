import { ManageStationHistoryDetailPage } from "@/components/manage/ManageStationHistoryDetailPage";

export default function OwnerStationHistoryPage() {
  return (
    <ManageStationHistoryDetailPage listRootPath="/owner/stations" manageContext="owner" />
  );
}
