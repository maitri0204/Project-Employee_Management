"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Eye, EyeOff, FileText, Upload } from "lucide-react";
import { UPLOADS_BASE } from "@/lib/api";
import { DocumentsStatus } from "@/types";
import { Badge, Button } from "@/components/ui";

type DocumentUploadRowProps = {
  label: string;
  hint: string;
  required?: boolean;
  status: DocumentsStatus;
  rejectedReason?: string | null;
  fileUrl?: string | null;
  fileName?: string;
  selectedFile?: File | null;
  uploadedAt?: string | null;
  error?: string;
  editable?: boolean;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  actions?: React.ReactNode;
  /** Restrict actions for employee self-service (view-only when approved, upload-only when rejected). */
  employeeView?: boolean;
  /** Always show upload for multi-file add-more rows (until profile lock). */
  alwaysShowUpload?: boolean;
};

function statusBadgeVariant(
  status: DocumentsStatus
): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING_REVIEW":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "default";
  }
}

function statusLabel(status: DocumentsStatus) {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "PENDING_REVIEW":
      return "Pending review";
    case "REJECTED":
      return "Rejected";
    default:
      return "Not uploaded";
  }
}

function isPdf(url: string, file?: File | null) {
  if (file?.type === "application/pdf") return true;
  return url.toLowerCase().includes(".pdf");
}

function isImage(url: string, file?: File | null) {
  if (file?.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(url);
}

function DocumentPreview({
  previewUrl,
  file,
  label,
}: {
  previewUrl: string;
  file?: File | null;
  label: string;
}) {
  const pdf = isPdf(previewUrl, file);
  const image = isImage(previewUrl, file);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
        Preview - {label}
      </div>
      {image && (
        <div className="flex justify-center bg-slate-100 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={label}
            className="max-h-[min(70vh,720px)] w-full rounded-lg object-contain"
          />
        </div>
      )}
      {pdf && (
        <iframe
          src={previewUrl}
          title={`${label} preview`}
          className="h-[min(70vh,720px)] w-full bg-white"
        />
      )}
      {!image && !pdf && (
        <div className="p-4 text-center text-sm text-slate-500">
          Preview not available for this file type. Use Download instead.
        </div>
      )}
    </div>
  );
}

export default function DocumentUploadRow({
  label,
  hint,
  required = false,
  status,
  rejectedReason,
  fileUrl,
  fileName,
  selectedFile,
  uploadedAt,
  error,
  editable = true,
  disabled = false,
  accept = ".jpg,.jpeg,.png,.pdf",
  multiple = false,
  onFileSelect,
  onFilesSelect,
  actions,
  employeeView = false,
  alwaysShowUpload = false,
}: DocumentUploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const hasServerFile = Boolean(fileUrl);
  const hasLocalFile = Boolean(selectedFile);
  const hasFile = hasServerFile || hasLocalFile;
  const isApproved = status === "APPROVED";
  const isRejected = status === "REJECTED";
  const isPending = status === "PENDING_REVIEW";
  const serverViewUrl = hasServerFile ? `${UPLOADS_BASE}${fileUrl}` : null;
  const displayName = selectedFile?.name ?? fileName ?? label;

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const previewUrl = localPreviewUrl ?? serverViewUrl;

  const showViewButton = employeeView
    ? (isApproved && Boolean(previewUrl)) || (isPending && Boolean(previewUrl))
    : Boolean(previewUrl);
  const showDownloadButton = employeeView
    ? isPending && Boolean(previewUrl)
    : Boolean(previewUrl);
  const showReuploadButton = employeeView
    ? isPending && hasFile && editable && !disabled
    : hasFile && editable && !disabled && !isApproved;
  const showUploadButton = alwaysShowUpload
    ? editable && !disabled
    : employeeView
      ? (isRejected || status === "NOT_SUBMITTED") && editable && !disabled
      : !hasFile && editable && !disabled;

  const openPicker = () => {
    if (!disabled && editable) inputRef.current?.click();
  };

  const handleDownload = () => {
    const url = previewUrl;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = displayName;
    link.click();
  };

  const togglePreview = () => {
    if (!previewUrl) return;
    setShowPreview((open) => !open);
  };

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        isRejected ? "border-red-200 bg-red-50/30" : "border-slate-200"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled || !editable}
        onChange={(e) => {
          const list = e.target.files;
          if (!list?.length) return;
          if (multiple && onFilesSelect) {
            onFilesSelect(Array.from(list));
          } else if (onFileSelect) {
            onFileSelect(list[0]);
          }
          setShowPreview(false);
          e.target.value = "";
        }}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {label}
                {required && <span className="text-red-500"> *</span>}
              </p>
              <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{hint}</p>

            {isRejected && rejectedReason && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <span className="font-semibold">Rejected:</span> {rejectedReason}. Please upload
                again.
              </p>
            )}

            {hasFile && (
              <p className="mt-2 text-xs font-medium text-slate-600">
                {hasLocalFile ? "Selected" : "Uploaded"}
                {uploadedAt && !hasLocalFile
                  ? `: ${new Date(uploadedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : hasLocalFile
                    ? `: ${selectedFile?.name}`
                    : ""}
              </p>
            )}

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {isApproved && hasServerFile && (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          )}

          {showViewButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={togglePreview}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Hide" : "View"}
            </Button>
          )}

          {showDownloadButton && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}

          {showReuploadButton && (
            <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={openPicker}>
              <Upload className="h-4 w-4" />
              Reupload
            </Button>
          )}

          {showUploadButton && (
            <Button type="button" size="sm" className="gap-1.5" onClick={openPicker}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          )}

          {actions}
        </div>
      </div>

      {hasLocalFile && !hasServerFile && !showPreview && (
        <p className="mt-3 truncate text-xs text-blue-700">Ready to submit: {displayName}</p>
      )}

      {showPreview && previewUrl && (
        <DocumentPreview previewUrl={previewUrl} file={selectedFile} label={displayName} />
      )}
    </div>
  );
}
