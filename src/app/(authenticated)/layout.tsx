import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { isProfileComplete } from "@/db/queries/profiles";
import { auth } from "@/lib/auth";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    redirect("/auth");
  }

  // Redirect to onboarding if profile is incomplete (unless already on /onboarding)
  const pathname = hdrs.get("x-pathname") || "";
  if (!pathname.startsWith("/onboarding")) {
    const profileComplete = await isProfileComplete(session.user.id);
    if (!profileComplete) {
      redirect("/onboarding");
    }
  }

  return (
    <>
      <Header userEmail={session.user.email} userName={session.user.name} />
      {children}
    </>
  );
}
