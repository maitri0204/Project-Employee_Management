"use client";

import { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmployeeOnboardingForm from "@/components/EmployeeOnboardingForm";
import { useAuth } from "@/context/AuthContext";
import {
  canEmployeeEditDocuments,
  canEmployeeEditProfile,
  getDocumentsStatus,
  hasPendingDocumentReviews,
} from "@/lib/employeeProfile";
import { employeeApi } from "@/lib/services";
import { Card } from "@/components/ui";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const employee = user?.employee;

  useEffect(() => {
    void refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locked = !canEmployeeEditProfile(employee);
  const documentsEditable = canEmployeeEditDocuments(employee);
  const documentsStatus = getDocumentsStatus(employee);
  const documentsPendingReview = hasPendingDocumentReviews(employee);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-black">My Profile</h1>
          <p className="mt-1 text-sm text-black">
            Complete your personal details and upload documents for admin review.
          </p>
        </div>

        <Card>
          <EmployeeOnboardingForm
            mode="employee"
            employee={employee}
            email={user?.email}
            disabled={locked}
            documentsEditable={documentsEditable}
            documentsStatus={documentsStatus}
            documentsPendingReview={documentsPendingReview}
            rejectionReason={employee?.documentsRejectedReason}
            onSubmit={async (formData) => {
              await employeeApi.updateMyProfile(formData);
              await refreshUser();
            }}
          />
        </Card>
      </div>
    </ProtectedRoute>
  );
}
