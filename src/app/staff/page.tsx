import { BrandHeader } from "@/components/BrandHeader";
import { StaffFeedbackList } from "@/components/StaffFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isStaffAuthenticated } from "@/lib/staff-auth";

export default async function StaffPage() {
  const authenticated = await isStaffAuthenticated();

  return (
    <div className="min-h-dvh pb-20">
      <BrandHeader compact />
      {authenticated ? (
        <StaffFeedbackList
          title="Guest Feedback"
          canExport
          canManageUsers
          canEditPermissions
        />
      ) : (
        <StaffLoginForm
          title="Owner login"
          description="Sign in with your username and password for full feedback, analytics, export, users, and dashboard visibility. Until users exist, the env bootstrap password alone still works."
          loginPath="/api/staff/login"
        />
      )}
    </div>
  );
}
