import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import { Navigate, Outlet } from "react-router";

export default function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}
