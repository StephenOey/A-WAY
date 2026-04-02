export type AnnotationStatus = 'active' | 'draft';

export interface Annotation {
  id: string;
  designer_id: string;
  frame_id: string;
  frame_link: string;
  note: string;
  status: AnnotationStatus;
  created_at: string;
  expires_at: string;
}
