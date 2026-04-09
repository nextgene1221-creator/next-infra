import { requireAuth } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import SessionProvider from "@/components/SessionProvider";
import MeetingAlertPoller from "@/components/MeetingAlertPoller";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <SessionProvider>
      <MeetingAlertPoller />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar userName={session.user.name} userRole={session.user.role} />
        <main className="flex-1 bg-surface p-4 md:p-6 pt-16 md:pt-6 min-w-0">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
