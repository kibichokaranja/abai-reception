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
        />
      ) : (
        <StaffLoginForm
          title="IT manager login"
          description="Approve pending guest feedback before it becomes a live system review. Until an IT manager user exists, the env bootstrap password alone still works."
          loginPath="/api/it/login"
        />
      )}
    </div>
  );
}
