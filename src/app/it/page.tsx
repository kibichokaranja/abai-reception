import { BrandHeader } from "@/components/BrandHeader";
import { StaffFeedbackList } from "@/components/StaffFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isItManagerAuthenticated } from "@/lib/staff-auth";

export default async function ItManagerPage() {
  const authenticated = await isItManagerAuthenticated();

  return (
    <div className="min-h-dvh pb-20">
      <BrandHeader compact />
      {authenticated ? (
        <StaffFeedbackList
          title="IT manager"
          canExport={false}
          canManageUsers={false}
          canModerate
          defaultPendingMode
          reviewGateEmphasis
        />
      ) : (
        <StaffLoginForm
          title="IT manager login"
          description="Manage the review gate: approve or reject pending guest feedback before it enters the live system. Until an IT manager user exists, the env bootstrap password alone still works."
          loginPath="/api/it/login"
        />
      )}
    </div>
  );
}
