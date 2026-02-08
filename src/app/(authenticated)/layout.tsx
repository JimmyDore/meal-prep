import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { auth } from "@/lib/auth";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth");
  }

  return (
    <>
      <Header userEmail={session.user.email} userName={session.user.name} />
      {children}
    </>
  );
}
