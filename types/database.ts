/**
 * Supabase 데이터베이스 타입 정의
 */

export interface Database {
  public: {
    Tables: {
      proposal: {
        Row: {
          id: string;
          name: string;
          order_num: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          order_num: number;
        };
        Update: Partial<{
          name: string;
          order_num: number;
        }>;
      };
      evaluator: {
        Row: {
          id: string;
          name: string;
          is_submitted: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          is_submitted?: boolean;
        };
        Update: Partial<{
          name: string;
          is_submitted: boolean;
        }>;
      };
      evaluation_item: {
        Row: {
          id: string;
          name: string;
          max_score: number;
          category: string;
          sub_category: string;
          order_num: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          max_score: number;
          category: string;
          sub_category: string;
          order_num: number;
        };
        Update: Partial<{
          name: string;
          max_score: number;
          category: string;
          sub_category: string;
          order_num: number;
        }>;
      };
      evaluation_score: {
        Row: {
          id: string;
          proposal_id: string;
          evaluator_id: string;
          item_id: string;
          score: number;
          grade: string | null;
          created_at: string;
        };
        Insert: {
          proposal_id: string;
          evaluator_id: string;
          item_id: string;
          score: number;
          grade?: string;
        };
        Update: Partial<{
          score: number;
          grade: string;
        }>;
      };
      evaluation: {
        Row: {
          id: string;
          evaluator_id: string;
          proposal_id: string;
          total_score: number | null;
          comment: string | null;
          saved_at: string;
          created_at: string;
        };
        Insert: {
          evaluator_id: string;
          proposal_id: string;
          total_score?: number;
          comment?: string;
        };
        Update: Partial<{
          total_score: number;
          comment: string;
          saved_at: string;
        }>;
      };
      system_config: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: Partial<{
          value: string;
        }>;
      };
      proposal_document: {
        Row: {
          id: string;
          proposal_id: string | null;
          document_type: 'presentation' | 'qualitative' | 'security';
          file_name: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          proposal_id?: string | null;
          document_type: 'presentation' | 'qualitative' | 'security';
          file_name: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: Partial<{
          file_name: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          updated_at: string;
        }>;
      };
    };
  };
}

// 편의를 위한 타입 별칭
export type Proposal = Database['public']['Tables']['proposal']['Row'];
export type Evaluator = Database['public']['Tables']['evaluator']['Row'];
export type EvaluationItem = Database['public']['Tables']['evaluation_item']['Row'];
export type EvaluationScore = Database['public']['Tables']['evaluation_score']['Row'];
export type Evaluation = Database['public']['Tables']['evaluation']['Row'];
export type SystemConfig = Database['public']['Tables']['system_config']['Row'];
export type ProposalDocumentRow = Database['public']['Tables']['proposal_document']['Row'];
