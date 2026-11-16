import { BrandHeader } from "@/components/BrandHeader";
import { StaffFeedbackList } from "@/components/StaffFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isStaffAuthenticated } from "@/lib/staff-auth";

export default async function StaffPage() {
  const authenticated = await isStaffAuthenticated();

  return (
    <div className="min-h-dvh pb-16">
      <BrandHeader compact />
      {authenticated ? (
        <StaffFeedbackList
          title="Guest Feedback"
          canExport
          canManageUsers
        />
      ) : (
        <StaffLoginForm
          title="Owner login"
          description="Enter the owner password (or username + password after users are created) for full feedback, analytics, export, and user management."
          loginPath="/api/staff/login"
        />
      )}
    </div>
  );
}
