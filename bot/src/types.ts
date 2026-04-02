export type AnnotationStatus = 'active' | 'draft';

export interface Annotation {
  id: string;
  designer_id: string;
  frame_id: string;
  frame_link: string;
  note: string;
  status: AnnotationStatus;
  tags: string[];
  created_at: string; // ISO 8601
  expires_at: string; // ISO 8601
}
