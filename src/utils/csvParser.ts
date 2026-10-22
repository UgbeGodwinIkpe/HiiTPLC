import { Course, Batch, StudentProfile } from '../types';

export interface ParsedStudentItem {
  fullName: string;
  regNumber: string;
  email: string;
  phone: string;
  courseId: string;
  courseTitle: string;
  batchId: string;
  batchName: string;
  isValid: boolean;
  validationErrors: string[];
  isDuplicateInDb?: boolean;
}

export interface CSVParseResult {
  students: ParsedStudentItem[];
  validCount: number;
  invalidCount: number;
  invalidRows: { rowNumber: number; raw: string; reason: string }[];
  warnings: string[];
  rawJson: string;
  delimiter: string;
  detectedHeaders: string[];
}

export interface CSVParseOptions {
  courses: Course[];
  batches: Batch[];
  defaultCourseId?: string;
  defaultBatchId?: string;
  existingStudents?: StudentProfile[];
}

/**
 * Splits a CSV line into tokens, respecting quotes and escaped quotes.
 */
export function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped double quotes ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detects the most probable delimiter: comma, tab, semicolon, or pipe.
 */
export function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = {
    ',': (firstLine.match(/,/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '|': (firstLine.match(/\|/g) || []).length
  };

  let bestDelimiter = ',';
  let maxCount = 0;

  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * Normalizes header string to clean alphanumeric key.
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Maps raw header text to standard student fields.
 */
function mapHeaderToField(header: string): string | null {
  const clean = normalizeKey(header);

  if (['fullname', 'name', 'studentname', 'student', 'studentfullname'].includes(clean)) {
    return 'fullName';
  }
  if (['regnumber', 'registrationnumber', 'regno', 'reg', 'matricno', 'matricnumber', 'studentid', 'admissionno'].includes(clean)) {
    return 'regNumber';
  }
  if (['email', 'emailaddress', 'mail', 'studentemail'].includes(clean)) {
    return 'email';
  }
  if (['phone', 'phonenumber', 'telephone', 'mobile', 'contact', 'gsm', 'tel'].includes(clean)) {
    return 'phone';
  }
  if (['course', 'coursecode', 'coursetitle', 'courseid'].includes(clean)) {
    return 'course';
  }
  if (['batch', 'batchname', 'batchid', 'cohort', 'stream'].includes(clean)) {
    return 'batch';
  }

  return null;
}

/**
 * Core CSV to JSON parser for Student Management.
 */
export function parseStudentCSV(
  rawContent: string,
  options: CSVParseOptions
): CSVParseResult {
  const { courses, batches, defaultCourseId, defaultBatchId, existingStudents = [] } = options;

  // Clean BOM and standardize line endings
  const cleanContent = rawContent.replace(/^\uFEFF/, '').trim();

  // If empty input
  if (!cleanContent) {
    return {
      students: [],
      validCount: 0,
      invalidCount: 0,
      invalidRows: [],
      warnings: [],
      rawJson: '[]',
      delimiter: ',',
      detectedHeaders: []
    };
  }

  // Check if user accidentally pasted raw JSON array
  if (cleanContent.startsWith('[') && cleanContent.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(cleanContent);
      if (Array.isArray(parsedJson)) {
        return parseJsonStudents(parsedJson, options);
      }
    } catch {
      // Continue to CSV parsing if JSON parse failed
    }
  }

  const rawLines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return {
      students: [],
      validCount: 0,
      invalidCount: 0,
      invalidRows: [],
      warnings: [],
      rawJson: '[]',
      delimiter: ',',
      detectedHeaders: []
    };
  }

  const delimiter = detectDelimiter(rawLines[0]);
  const firstRowTokens = parseCSVLine(rawLines[0], delimiter);

  // Check if first line contains recognized headers
  const fieldMapping: (string | null)[] = firstRowTokens.map(mapHeaderToField);
  const recognizedHeaderCount = fieldMapping.filter((f) => f !== null).length;

  let dataLines: string[];
  let headerFields: (string | null)[];
  let detectedHeaders: string[] = [];

  if (recognizedHeaderCount >= 2) {
    // First line is definitely a header row
    headerFields = fieldMapping;
    detectedHeaders = firstRowTokens;
    dataLines = rawLines.slice(1);
  } else {
    // No explicit header row found; use positional convention:
    // Col 0: fullName, Col 1: regNumber, Col 2: email, Col 3: phone, Col 4: course, Col 5: batch
    headerFields = ['fullName', 'regNumber', 'email', 'phone', 'course', 'batch'];
    detectedHeaders = ['fullName (Assumed)', 'regNumber (Assumed)', 'email', 'phone', 'course', 'batch'];
    dataLines = rawLines;
  }

  const fallbackCourse = courses.find((c) => c.id === defaultCourseId) || courses[0];
  const fallbackBatch = batches.find((b) => b.id === defaultBatchId) || batches[0];

  const parsedStudents: ParsedStudentItem[] = [];
  const invalidRows: { rowNumber: number; raw: string; reason: string }[] = [];
  const warnings: string[] = [];
  const seenRegNumbersInFile = new Set<string>();

  dataLines.forEach((line, index) => {
    const rowNumber = recognizedHeaderCount >= 2 ? index + 2 : index + 1;
    const tokens = parseCSVLine(line, delimiter);

    // Skip empty rows
    if (tokens.every((t) => !t.trim())) return;

    let fullName = '';
    let regNumber = '';
    let email = '';
    let phone = '';
    let courseIdentifier = '';
    let batchIdentifier = '';

    tokens.forEach((val, colIdx) => {
      const field = headerFields[colIdx];
      const trimmed = val.trim();
      if (!field) return;

      if (field === 'fullName') fullName = trimmed;
      else if (field === 'regNumber') regNumber = trimmed;
      else if (field === 'email') email = trimmed;
      else if (field === 'phone') phone = trimmed;
      else if (field === 'course') courseIdentifier = trimmed;
      else if (field === 'batch') batchIdentifier = trimmed;
    });

    const validationErrors: string[] = [];

    if (!fullName) {
      validationErrors.push('Missing student full name');
    }
    if (!regNumber) {
      validationErrors.push('Missing registration number');
    }

    // Resolve course
    let resolvedCourse = fallbackCourse;
    if (courseIdentifier) {
      const foundCourse = courses.find(
        (c) =>
          c.id.toLowerCase() === courseIdentifier.toLowerCase() ||
          c.code.toLowerCase() === courseIdentifier.toLowerCase() ||
          c.title.toLowerCase().includes(courseIdentifier.toLowerCase())
      );
      if (foundCourse) {
        resolvedCourse = foundCourse;
      }
    }

    // Resolve batch
    let resolvedBatch = fallbackBatch;
    if (batchIdentifier) {
      const foundBatch = batches.find(
        (b) =>
          b.id.toLowerCase() === batchIdentifier.toLowerCase() ||
          b.name.toLowerCase().includes(batchIdentifier.toLowerCase())
      );
      if (foundBatch) {
        resolvedBatch = foundBatch;
      }
    }

    // Clean reg number formatting
    const normalizedReg = regNumber.trim().toUpperCase();

    // Check duplicate in file
    if (normalizedReg) {
      if (seenRegNumbersInFile.has(normalizedReg)) {
        validationErrors.push(`Duplicate registration number in upload file: ${normalizedReg}`);
      } else {
        seenRegNumbersInFile.add(normalizedReg);
      }
    }

    // Check existing in database
    const isDuplicateInDb = existingStudents.some(
      (s) => s.regNumber.trim().toUpperCase() === normalizedReg
    );
    if (isDuplicateInDb) {
      warnings.push(`Row ${rowNumber}: ${normalizedReg} (${fullName}) is already registered in the system database.`);
    }

    // Auto-generate email if missing
    const generatedEmail = email || (normalizedReg ? `${normalizedReg.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@student.hiit.ng` : '');

    const isValid = validationErrors.length === 0;

    if (!isValid) {
      invalidRows.push({
        rowNumber,
        raw: line,
        reason: validationErrors.join(', ')
      });
    }

    parsedStudents.push({
      fullName,
      regNumber: normalizedReg,
      email: generatedEmail,
      phone,
      courseId: resolvedCourse ? resolvedCourse.id : 'crs_1',
      courseTitle: resolvedCourse ? `${resolvedCourse.code} — ${resolvedCourse.title}` : 'General Course',
      batchId: resolvedBatch ? resolvedBatch.id : 'batch_1',
      batchName: resolvedBatch ? resolvedBatch.name : 'General Batch',
      isValid,
      validationErrors,
      isDuplicateInDb
    });
  });

  const validStudents = parsedStudents.filter((s) => s.isValid);

  // Build clean JSON representation ready for database import
  const cleanJsonArray = validStudents.map((s) => ({
    fullName: s.fullName,
    regNumber: s.regNumber,
    email: s.email,
    phone: s.phone,
    courseId: s.courseId,
    courseTitle: s.courseTitle,
    batchId: s.batchId,
    batchName: s.batchName
  }));

  return {
    students: parsedStudents,
    validCount: validStudents.length,
    invalidCount: invalidRows.length,
    invalidRows,
    warnings,
    rawJson: JSON.stringify(cleanJsonArray, null, 2),
    delimiter,
    detectedHeaders
  };
}

/**
 * Handles JSON array if pasted into the parser
 */
function parseJsonStudents(
  jsonArray: any[],
  options: CSVParseOptions
): CSVParseResult {
  const { courses, batches, defaultCourseId, defaultBatchId, existingStudents = [] } = options;
  const fallbackCourse = courses.find((c) => c.id === defaultCourseId) || courses[0];
  const fallbackBatch = batches.find((b) => b.id === defaultBatchId) || batches[0];

  const parsedStudents: ParsedStudentItem[] = [];
  const invalidRows: { rowNumber: number; raw: string; reason: string }[] = [];
  const warnings: string[] = [];
  const seenReg = new Set<string>();

  jsonArray.forEach((item, idx) => {
    const rowNumber = idx + 1;
    const fullName = String(item.fullName || item.name || '').trim();
    const regNumber = String(item.regNumber || item.regNo || item.matricNo || '').trim().toUpperCase();
    const email = String(item.email || '').trim();
    const phone = String(item.phone || '').trim();
    const courseId = item.courseId || fallbackCourse?.id || 'crs_1';
    const batchId = item.batchId || fallbackBatch?.id || 'batch_1';

    const course = courses.find((c) => c.id === courseId) || fallbackCourse;
    const batch = batches.find((b) => b.id === batchId) || fallbackBatch;

    const validationErrors: string[] = [];
    if (!fullName) validationErrors.push('Missing fullName');
    if (!regNumber) validationErrors.push('Missing regNumber');

    if (regNumber) {
      if (seenReg.has(regNumber)) {
        validationErrors.push(`Duplicate registration number: ${regNumber}`);
      } else {
        seenReg.add(regNumber);
      }
    }

    const isDuplicateInDb = existingStudents.some((s) => s.regNumber.trim().toUpperCase() === regNumber);
    if (isDuplicateInDb) {
      warnings.push(`Item ${rowNumber}: ${regNumber} (${fullName}) already exists in database.`);
    }

    const isValid = validationErrors.length === 0;
    if (!isValid) {
      invalidRows.push({ rowNumber, raw: JSON.stringify(item), reason: validationErrors.join(', ') });
    }

    parsedStudents.push({
      fullName,
      regNumber,
      email: email || `${regNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@student.hiit.ng`,
      phone,
      courseId: course?.id || 'crs_1',
      courseTitle: course ? `${course.code} — ${course.title}` : 'General Course',
      batchId: batch?.id || 'batch_1',
      batchName: batch ? batch.name : 'General Batch',
      isValid,
      validationErrors,
      isDuplicateInDb
    });
  });

  const validStudents = parsedStudents.filter((s) => s.isValid);

  return {
    students: parsedStudents,
    validCount: validStudents.length,
    invalidCount: invalidRows.length,
    invalidRows,
    warnings,
    rawJson: JSON.stringify(validStudents, null, 2),
    delimiter: 'JSON',
    detectedHeaders: ['fullName', 'regNumber', 'email', 'phone', 'courseId', 'batchId']
  };
}

/**
 * Generates sample CSV text tailored to the institution's courses & batches.
 */
export function getSampleStudentCSVText(courses: Course[], batches: Batch[]): string {
  const c1 = courses[0]?.code || 'WD-101';
  const c2 = courses[1]?.code || courses[0]?.code || 'DS-201';
  const b1 = batches[0]?.name || 'March 2026 Morning Cohort';
  const b2 = batches[1]?.name || batches[0]?.name || 'April 2026 Weekend Cohort';

  return `FullName,RegNumber,Email,Phone,CourseCode,BatchName
"Chukwuemeka Okoye","HIIT/2026/020","emeka.okoye@gmail.com","+234 802 334 1122","${c1}","${b1}"
"Amina Mohammed","HIIT/2026/021","amina.m@yahoo.com","+234 803 556 7788","${c1}","${b1}"
"Babatunde Fashola","HIIT/2026/022","babatunde.f@hiit.ng","+234 809 112 3344","${c2}","${b2}"
"Ngozi Eze","HIIT/2026/023","ngozi.eze@outlook.com","+234 818 445 9900","${c2}","${b2}"
"Yusuf Danjuma","HIIT/2026/024","yusuf.d@gmail.com","+234 805 778 2211","${c1}","${b1}"`;
}

/**
 * Triggers a browser download of the standard HiiT CSV template.
 */
export function downloadSampleStudentCSV(courses: Course[], batches: Batch[]) {
  const csvContent = getSampleStudentCSVText(courses, batches);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `HiiT_Abuja_Student_Import_Template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
