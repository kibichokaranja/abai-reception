/** Fired by StaffCreateUser after create/edit/delete so Dashboard visibility refreshes. */
export const STAFF_USERS_CHANGED_EVENT = "abai-staff-users-changed";

export function notifyStaffUsersChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STAFF_USERS_CHANGED_EVENT));
  }
}
