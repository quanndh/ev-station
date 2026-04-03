import { BlobBackground } from "@/components/ui/blob-background";
import { OwnerLayoutClient } from "./OwnerLayoutClient";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <BlobBackground>
      <OwnerLayoutClient>{children}</OwnerLayoutClient>
    </BlobBackground>
  );
}
