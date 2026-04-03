import { redirect } from "next/navigation";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function PostLoginRedirectPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!role) redirect("/");

  if (role === "admin") redirect("/admin");
  if (role === "station_owner") redirect("/owner");

  redirect("/");
}

