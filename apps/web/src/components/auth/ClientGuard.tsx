"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { me } from "@/lib/authClient";

export function ClientGuard({
  allow,
  redirectTo = "/login",
  children,
}: {
  allow: Array<"admin" | "station_owner" | "user">;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    let alive = true;
    me()
      .then((u) => {
        if (!alive) return;
        if (!allow.includes(u.role)) {
          router.replace(redirectTo);
          setOk(false);
          return;
        }
        setOk(true);
      })
      .catch(() => {
        if (!alive) return;
        router.replace(redirectTo);
        setOk(false);
      });
    return () => {
      alive = false;
    };
  }, [allow, redirectTo, router]);

  if (ok === null) {
    return (
      <div className="min-h-[40vh] grid place-items-center text-sm text-[color:var(--muted-foreground)]">
        Đang kiểm tra đăng nhập…
      </div>
    );
  }

  if (!ok) return null;
  return <>{children}</>;
}

