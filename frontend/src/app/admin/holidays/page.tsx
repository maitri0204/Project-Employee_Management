"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Download, FileSpreadsheet, Loader2, Plus } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import HolidayAdminCalendar from "@/components/holidays/HolidayAdminCalendar";
import { holidayApi } from "@/lib/services";
import { HolidayImportResult, ManagedHoliday } from "@/types";
import { Badge, Button, Card, Input } from "@/components/ui";

function formatHolidayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState<ManagedHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importResult, setImportResult] = useState<HolidayImportResult | null>(null);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await holidayApi.getManaged();
      setHolidays(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHolidays();
  }, [fetchHolidays]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim() || !description.trim()) return;

    setSaving(true);
    setError("");
    setSuccess("");
    setImportResult(null);
    try {
      await holidayApi.create(date, description.trim());
      setDate("");
      setDescription("");
      setSuccess("Holiday saved successfully.");
      await fetchHolidays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarSave = async (dateKey: string, holidayDescription: string) => {
    setSaving(true);
    setError("");
    setSuccess("");
    setImportResult(null);
    try {
      await holidayApi.create(dateKey, holidayDescription);
      setSuccess("Holiday saved successfully.");
      await fetchHolidays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save holiday");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSample = async () => {
    setDownloadingSample(true);
    setError("");
    try {
      await holidayApi.downloadSampleTemplate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download sample file");
    } finally {
      setDownloadingSample(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");
    setImportResult(null);
    try {
      const res = await holidayApi.uploadExcel(file);
      setImportResult(res.data ?? null);
      setSuccess(res.message || "Holidays imported successfully.");
      await fetchHolidays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import holidays");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (holiday: ManagedHoliday) => {
    setDeletingId(holiday.id);
    setError("");
    setSuccess("");
    try {
      await holidayApi.delete(holiday.id);
      setSuccess(`Removed holiday on ${formatHolidayDate(holiday.dateKey)}.`);
      setHolidays((prev) => prev.filter((h) => h.id !== holiday.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete holiday");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 p-6 text-white shadow-xl sm:p-8">
          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              Admin
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Company Holidays</h1>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100 sm:text-base">
              View holidays on the calendar, click any date to add or edit, or import them in bulk
              from Excel. Changes sync automatically to leave calculations.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <HolidayAdminCalendar
          holidays={holidays}
          loading={loading}
          saving={saving}
          deletingId={deletingId}
          onSave={handleCalendarSave}
          onDelete={handleDelete}
          onDateSelect={setDate}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="overflow-hidden border-indigo-100 p-0 shadow-md">
            <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 className="font-semibold text-slate-900">Add single holiday</h2>
                  <p className="text-xs text-slate-500">
                    Or pick a date on the calendar above to add or edit inline.
                  </p>
                </div>
              </div>
            </div>
            <form onSubmit={handleAddHoliday} className="space-y-4 p-5">
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                label="Description"
                placeholder="e.g. Independence Day"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save holiday
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden border-amber-100 p-0 shadow-md">
            <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-amber-700" />
                <div>
                  <h2 className="font-semibold text-slate-900">Import from Excel</h2>
                  <p className="text-xs text-slate-500">Upload .xlsx or .xls with two columns.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">Required columns</p>
                <p className="mt-1 text-xs text-amber-900">
                  <strong>date</strong> — YYYY-MM-DD or DD/MM/YYYY
                  <br />
                  <strong>description</strong> — holiday name
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                disabled={downloadingSample}
                onClick={() => void handleDownloadSample()}
              >
                {downloadingSample ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download sample Excel
              </Button>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-black">Excel file</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={uploading}
                  onChange={handleExcelUpload}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-700"
                />
              </label>
              {uploading && (
                <p className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing holidays...
                </p>
              )}
            </div>
          </Card>
        </div>

        {importResult && (
          <Card className="border-blue-100 bg-blue-50/40">
            <h3 className="font-semibold text-slate-900">Import summary</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="success">{importResult.added} added</Badge>
              <Badge variant="warning">{importResult.updated} updated</Badge>
              <Badge variant="default">{importResult.skipped} skipped</Badge>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-red-700">
                {importResult.errors.map((item) => (
                  <li key={`${item.row}-${item.message}`}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
