export type AnnotationStatus = 'active' | 'draft';
export type ExpiryDays = 7 | 30 | 90;

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

export type CreateAnnotationInput = Omit<Annotation, 'id' | 'created_at' | 'expires_at'> & {
  expires_in?: ExpiryDays;
};

export type UpdateAnnotationInput = Partial<Pick<Annotation, 'note' | 'status' | 'tags'>>;
