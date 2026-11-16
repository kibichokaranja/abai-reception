import { BrandHeader } from "@/components/BrandHeader";
import { StaffFeedbackList } from "@/components/StaffFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isManagementAuthenticated } from "@/lib/staff-auth";

export default async function ManagementPage() {
  const authenticated = await isManagementAuthenticated();

  return (
    <div className="min-h-dvh pb-16">
      <BrandHeader compact />
      {authenticated ? (
        <StaffFeedbackList
          title="Guest Feedback — Management"
          canExport={false}
          canManageUsers={false}
        />
      ) : (
        <StaffLoginForm
          title="Management login"
          description="Enter the management password (or username + password after users are created) for feedback analytics and filters. Export and user create are owner-only."
          loginPath="/api/management/login"
        />
      )}
    </div>
  );
}
