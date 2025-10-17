export type WorkspaceJobType = 'EXPORT';

export type WorkspaceJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ExportFormat = 'json' | 'csv';

export interface ExportData {
  contacts: any[];
  companies: any[];
  deals: any[];
  pipelines: any[];
  activities: any[];
}

export interface ExportJobMetadata {
  format: ExportFormat;
  includeContacts: boolean;
  includeCompanies: boolean;
  includeDeals: boolean;
  includePipelines: boolean;
  includeActivities: boolean;
}
