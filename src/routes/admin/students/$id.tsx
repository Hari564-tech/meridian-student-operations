import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { StudentDetailPage } from "@/pages/student-detail";
import { StudentFormPage } from "@/pages/student-form";

export const Route = createFileRoute("/admin/students/$id")({
  component: StudentLayout,
});

function StudentLayout() {
  const { id } = Route.useParams();
  const editing = useRouterState({ select: (s) => s.location.pathname.endsWith("/edit") });
  if (editing) return <StudentFormPage studentId={id} />;
  return <StudentDetailPage studentId={id} />;
}
