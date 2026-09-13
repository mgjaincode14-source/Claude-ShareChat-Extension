export interface FileAttachment {
  id?: string;
  file_name?: string;
  name?: string;
  file_size?: number;
  file_type?: string;
  extracted_content?: string;
  url?: string;
}

export interface UnifiedMessage {
  id: string;
  uuid: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO string
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:MM AM/PM
  isTimestampVerified: boolean; // false = no real created_at/timestamp field was found on this message
  attachments?: FileAttachment[];
  parentMessageId?: string | null;
  model?: string;
}

export interface UnifiedConversation {
  id: string;
  uuid: string;
  title: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdDateString: string; // YYYY-MM-DD
  messages: UnifiedMessage[];
  metadata: {
    model?: string;
    exportSource: 'claude_zip' | 'claude_json' | 'browser_extension' | 'raw_paste' | 'claude_share_link';
    totalMessages: number;
    userMessagesCount: number;
    assistantMessagesCount: number;
    hasAttachments: boolean;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

export interface ImportResult {
  success: boolean;
  conversations: UnifiedConversation[];
  errors: string[];
  message: string;
}
