import { BrandHeader } from "@/components/BrandHeader";
import { StaffFeedbackList } from "@/components/StaffFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isManagementAuthenticated } from "@/lib/staff-auth";

export default async function ManagementPage() {
  const authenticated = await isManagementAuthenticated();

  return (
    <div className="min-h-dvh pb-20">
      <BrandHeader compact />
      {authenticated ? (
        <StaffFeedbackList
          title="Guest Feedback — Management"
          canExport={false}
          canManageUsers={false}
          canModerate
        />
      ) : (
        <StaffLoginForm
          title="Management login"
          description="Sign in with your username and password. Until users exist, the env bootstrap password alone still works. What you see is controlled by the owner."
          loginPath="/api/management/login"
        />
      )}
    </div>
  );
}
