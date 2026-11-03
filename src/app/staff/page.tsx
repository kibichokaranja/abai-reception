import { BrandHeader } from "@/components/BrandHeader";
import { StaffFeedbackList } from "@/components/StaffFeedbackList";
import { StaffLoginForm } from "@/components/StaffLoginForm";
import { isStaffAuthenticated } from "@/lib/staff-auth";

export default async function StaffPage() {
  const authenticated = await isStaffAuthenticated();

  return (
    <div className="min-h-dvh pb-16">
      <BrandHeader compact />
      {authenticated ? <StaffFeedbackList /> : <StaffLoginForm />}
    </div>
  );
}
