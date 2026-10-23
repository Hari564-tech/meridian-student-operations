import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PaymentsPage } from "@/pages/payments-page";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/lib/store";
import { useCanViewPayments } from "@/lib/access";

export const Route = createFileRoute("/employee/payments")({
  component: EmployeePaymentsGate,
});

function EmployeePaymentsGate() {
  const user = useAppStore((s) => s.currentUser);
  const showPayments = useCanViewPayments();
  const navigate = useNavigate();
  if (!user || !showPayments) {
    return (
      <EmptyState
        icon={Lock}
        title="Payments is restricted"
        description="An administrator has not given your account access to the Payments section."
        actionLabel="Back to overview"
        onAction={() => void navigate({ to: "/employee/dashboard" })}
      />
    );
  }
  return <PaymentsPage />;
}

