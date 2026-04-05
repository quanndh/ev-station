import { ManageStationListPage } from "@/components/manage/ManageStationListPage";

export default function OwnerStationsPage() {
  return (
    <ManageStationListPage
      rootPath="/owner/stations"
      title="Trạm của bạn"
      breadcrumbItems={[
        { href: "/owner", label: "Tổng quan" },
        { label: "Trạm của bạn" },
      ]}
      showOwner={false}
    />
  );
}
