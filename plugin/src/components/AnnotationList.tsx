import React, { useEffect, useState, useCallback } from 'react';
import type { Annotation } from '@a-way/shared';
import { API_URL } from '../constants';

interface Props {
  frameInfo: { frameId: string; frameLink: string } | null;
  onEdit: (annotation: Annotation) => void;
  refreshKey: number;
}

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0)  return 'Today';
  if (days === 1)  return 'Yesterday';
  if (days < 30)   return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1mo ago' : `${months}mo ago`;
}

export function AnnotationList({ frameInfo, onEdit, refreshKey }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchAnnotations = useCallback(async () => {
    if (!frameInfo) { setAnnotations([]); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/annotations?frame_id=${encodeURIComponent(frameInfo.frameId)}`
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setAnnotations(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [frameInfo]);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations, refreshKey]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_URL}/annotations/${id}`, { method: 'DELETE' });
      setAnnotations(prev => prev.filter(a => a.id !== id));
    } catch {
      // best-effort
    }
  };

  if (!frameInfo) {
    return (
      <div className="state-center">
        <div className="state-icon">🖼</div>
        <div className="state-text">Select a frame to see its annotations.</div>
      </div>
    );
  }

  if (loading) {
    return <div className="state-center"><div className="state-text">Loading…</div></div>;
  }

  if (error) {
    return <p className="feedback feedback-error" style={{ marginTop: 0 }}>{error}</p>;
  }

  if (annotations.length === 0) {
    return (
      <div className="state-center">
        <div className="state-icon">📋</div>
        <div className="state-text">No annotations on this frame yet.</div>
      </div>
    );
  }

  return (
    <div className="annotation-list">
      {annotations.map(a => (
        <div key={a.id} className="annotation-card">
          <p className="annotation-note">{a.note}</p>

          {(a.tags ?? []).length > 0 && (
            <div className="annotation-tags">
              {(a.tags ?? []).map(tag => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}

          <div className="annotation-meta">
            <div className="annotation-meta-left">
              <span className={`status-badge status-${a.status}`}>{a.status}</span>
              <span className="annotation-date">{relativeTime(a.created_at)}</span>
            </div>
            <div className="annotation-actions">
              <button className="btn btn-ghost" title="Edit" onClick={() => onEdit(a)}>✎</button>
              <button className="btn btn-danger" title="Delete" onClick={() => handleDelete(a.id)}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
