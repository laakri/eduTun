import { requireRole } from "@/core/auth.service";
import { PeopleTable } from "@/components/admin/PeopleTable";

export default async function AdminStudentsPage() {
  await requireRole("admin");
  return <PeopleTable role="student" title="Students" description="Review accounts, Bac access, and expiry at a glance." />;
}