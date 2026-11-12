import { BrandHeader } from "@/components/BrandHeader";
import { ReceptionFeedbackList } from "@/components/ReceptionFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isReceptionAuthenticated } from "@/lib/staff-auth";

export default async function ReceptionPage() {
  const authenticated = await isReceptionAuthenticated();

  return (
    <div className="min-h-dvh pb-16">
      <BrandHeader compact />
      {authenticated ? (
        <ReceptionFeedbackList />
      ) : (
        <StaffLoginForm
          title="Reception login"
          description="Enter the reception desk password to browse recent guest feedback."
          loginPath="/api/reception/login"
        />
      )}
    </div>
  );
}
