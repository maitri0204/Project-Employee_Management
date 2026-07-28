import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { sendError, sendSuccess } from "../utils/response";
import {
  deleteHolidayById,
  getAllCachedHolidays,
  listManagedHolidays,
  normalizeHolidayDescription,
  parseHolidayDateInput,
  refreshHolidayCache,
  seedDefaultHolidaysIfEmpty,
  upsertHoliday,
} from "../services/holiday.service";

export const listHolidays = async (_req: Request, res: Response) => {
  try {
    await refreshHolidayCache();
    return sendSuccess(res, "Company holidays fetched successfully.", getAllCachedHolidays());
  } catch (error) {
    console.error("List holidays error:", error);
    return sendError(res, "Failed to fetch holidays.", 500);
  }
};

export const listManagedHolidaysHandler = async (_req: Request, res: Response) => {
  try {
    const holidays = await listManagedHolidays();
    return sendSuccess(res, "Holidays fetched successfully.", holidays);
  } catch (error) {
    console.error("List managed holidays error:", error);
    return sendError(res, "Failed to fetch holidays.", 500);
  }
};

export const createHoliday = async (req: Request, res: Response) => {
  try {
    const { date, description } = req.body;

    const dateKey = parseHolidayDateInput(date);
    const desc = normalizeHolidayDescription(description);

    if (!dateKey) {
      return sendError(res, "Please provide a valid date (YYYY-MM-DD).");
    }
    if (!desc) {
      return sendError(res, "Please provide a holiday description.");
    }

    const holiday = await upsertHoliday(dateKey, desc);
    return sendSuccess(res, "Holiday saved successfully.", holiday, 201);
  } catch (error) {
    console.error("Create holiday error:", error);
    return sendError(res, "Failed to save holiday.", 500);
  }
};

export const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await deleteHolidayById(id);
    return sendSuccess(res, "Holiday deleted successfully.");
  } catch (error) {
    console.error("Delete holiday error:", error);
    return sendError(res, "Failed to delete holiday.", 500);
  }
};

type UploadResult = {
  added: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export const uploadHolidayExcel = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return sendError(res, "Please upload an Excel file (.xlsx or .xls).");
    }

    const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return sendError(res, "The Excel file has no sheets.");
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: "",
    });

    if (!rows.length) {
      return sendError(res, "The Excel file has no data rows.");
    }

    const headers = Object.keys(rows[0]);
    const dateCol = headers.find((h) => h.trim().toLowerCase() === "date");
    const descCol = headers.find((h) => h.trim().toLowerCase() === "description");

    if (!dateCol || !descCol) {
      return sendError(res, 'Excel must include columns named "date" and "description".');
    }

    const existing = await listManagedHolidays();
    const existingKeys = new Set(existing.map((h) => h.dateKey));

    const result: UploadResult = { added: 0, updated: 0, skipped: 0, errors: [] };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const dateKey = parseHolidayDateInput(row[dateCol]);
      const description = normalizeHolidayDescription(row[descCol]);

      if (!dateKey && !description) {
        result.skipped += 1;
        continue;
      }

      if (!dateKey) {
        result.errors.push({ row: rowNumber, message: "Invalid date." });
        continue;
      }

      if (!description) {
        result.errors.push({ row: rowNumber, message: "Description is required." });
        continue;
      }

      const isUpdate = existingKeys.has(dateKey);
      await upsertHoliday(dateKey, description);
      existingKeys.add(dateKey);

      if (isUpdate) result.updated += 1;
      else result.added += 1;
    }

    if (result.added === 0 && result.updated === 0 && result.errors.length > 0) {
      return sendError(res, "No holidays were imported. Please check the Excel file.", 400);
    }

    return sendSuccess(
      res,
      `Imported ${result.added + result.updated} holiday(s).`,
      result
    );
  } catch (error) {
    console.error("Upload holiday excel error:", error);
    return sendError(res, "Failed to import holidays from Excel.", 500);
  }
};

const HOLIDAY_SAMPLE_ROWS = [
  { date: "2026-01-26", description: "Republic Day" },
  { date: "2026-08-15", description: "Independence Day" },
  { date: "2026-10-02", description: "Gandhi Jayanti" },
  { date: "25/12/2026", description: "Christmas (DD/MM/YYYY example)" },
];

export const downloadHolidaySampleTemplate = (_req: Request, res: Response) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(HOLIDAY_SAMPLE_ROWS);
    worksheet["!cols"] = [{ wch: 14 }, { wch: 36 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Holidays");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="holiday-import-sample.xlsx"'
    );
    return res.send(buffer);
  } catch (error) {
    console.error("Download holiday sample error:", error);
    return sendError(res, "Failed to generate sample Excel file.", 500);
  }
};

export const seedHolidays = async (_req: Request, res: Response) => {
  try {
    const count = await seedDefaultHolidaysIfEmpty();
    return sendSuccess(
      res,
      count > 0 ? `Seeded ${count} default holidays.` : "Holiday list already exists in database."
    );
  } catch (error) {
    console.error("Seed holidays error:", error);
    return sendError(res, "Failed to seed holidays.", 500);
  }
};
