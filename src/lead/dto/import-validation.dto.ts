export interface ImportRowError {
  rowNumber: number;
  status: 'imported' | 'skipped' | 'duplicate' | 'invalid';
  errors: string[];
  data?: Record<string, any>;
}

export interface ImportValidationResult {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  validRows: Record<string, any>[];
  errors: ImportRowError[];
  duplicatesList: Array<{
    rowNumber: number;
    existingLead: any;
    newData: Record<string, any>;
  }>;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  duplicates: number;
  failed: number;
  rows: ImportRowError[];
}
