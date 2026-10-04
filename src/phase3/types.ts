export type RedactionStyle = 'label' | 'blocks';

export interface RedactionOptions {
  redactApiKeys: boolean;
  redactEmails: boolean;
  redactIpAddresses: boolean;
  redactPhoneNumbers: boolean;
  customKeywords: string[];
  replacementStyle: RedactionStyle;
  anonymizeUser: boolean;
  userAlias: string;
  anonymizeAssistant: boolean;
  assistantAlias: string;
}

export type ExportFormat = 'markdown' | 'json' | 'html' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadataHeader: boolean;
  includeTimestamp: boolean;
  watermarkText: string;
  includeSandboxSteps?: boolean;
}

export interface RedactionStats {
  apiKeysCount: number;
  emailsCount: number;
  ipsCount: number;
  phoneNumbersCount: number;
  keywordsCount: number;
  totalRedacted: number;
}
