import { BrandHeader } from "@/components/BrandHeader";
import { ReceptionFeedbackList } from "@/components/ReceptionFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isReceptionAuthenticated } from "@/lib/staff-auth";
import { STAFF_DESK_LABEL } from "@/lib/types";

export default async function ReceptionPage() {
  const authenticated = await isReceptionAuthenticated();

  return (
    <div className="min-h-dvh pb-20">
      <BrandHeader compact />
      {authenticated ? (
        <ReceptionFeedbackList />
      ) : (
        <StaffLoginForm
          title={`${STAFF_DESK_LABEL} login`}
          description="Sign in with your username and password to view approved category averages. Until users exist, the env bootstrap password alone still works."
          loginPath="/api/reception/login"
        />
      )}
    </div>
  );
}
