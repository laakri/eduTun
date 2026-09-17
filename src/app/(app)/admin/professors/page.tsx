import { requireRole } from "@/core/auth.service";
import { PeopleTable } from "@/components/admin/PeopleTable";

export default async function AdminProfessorsPage() {
  await requireRole("admin");
  return <PeopleTable role="prof" title="Professors" description="Review the people teaching and publishing on Curio." />;
}