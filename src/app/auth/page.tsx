import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { auth } from "@/lib/auth";

export default async function AuthPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center font-bold text-3xl">Meal Prep</h1>
        <AuthTabs />
      </div>
    </div>
  );
}
