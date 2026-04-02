import React, { useState, useEffect, useRef } from 'react';
import type { CreateAnnotationInput, AnnotationStatus, Annotation, ExpiryDays } from '../types';
import { API_URL } from '../constants';

interface Props {
  frameInfo: { frameId: string; frameLink: string } | null;
  designerId: string;
  editingAnnotation?: Annotation | null;
  onCancelEdit?: () => void;
  onSaved?: () => void;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const EXPIRY_OPTIONS: { label: string; value: ExpiryDays }[] = [
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export function AnnotationForm({ frameInfo, designerId, editingAnnotation, onCancelEdit, onSaved }: Props) {
  const [note,       setNote]       = useState('');
  const [status,     setStatus]     = useState<AnnotationStatus>('active');
  const [tags,       setTags]       = useState<string[]>([]);
  const [tagInput,   setTagInput]   = useState('');
  const [expiryDays, setExpiryDays] = useState<ExpiryDays>(30);
  const [saveState,  setSaveState]  = useState<SaveState>('idle');
  const [errorMsg,   setErrorMsg]   = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = !!editingAnnotation;

  // Pre-fill form when entering edit mode; reset when leaving
  useEffect(() => {
    if (editingAnnotation) {
      setNote(editingAnnotation.note);
      setStatus(editingAnnotation.status);
      setTags(editingAnnotation.tags ?? []);
      setSaveState('idle');
    } else {
      setNote('');
      setStatus('active');
      setTags([]);
      setExpiryDays(30);
      setSaveState('idle');
    }
    setTagInput('');
  }, [editingAnnotation]);

  // Auto-clear success banner after 3 s
  useEffect(() => {
    if (saveState === 'success') {
      timerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [saveState]);

  // ── Tag helpers ──────────────────────────────────────────────────
  const commitTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTag(); }
    else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  // ── Save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isEditing && !frameInfo) return;
    setSaveState('saving');
    setErrorMsg('');

    try {
      let res: Response;

      if (isEditing) {
        res = await fetch(`${API_URL}/annotations/${editingAnnotation!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note, status, tags }),
        });
      } else {
        const body: CreateAnnotationInput = {
          designer_id: designerId || 'unknown-designer',
          frame_id:    frameInfo!.frameId,
          frame_link:  frameInfo!.frameLink,
          note, status, tags,
          expires_in: expiryDays,
        };
        res = await fetch(`${API_URL}/annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        setSaveState('success');
        if (!isEditing) {
          setNote('');
          setStatus('draft');
          setTags([]);
          setExpiryDays(30);
        }
        onSaved?.();
      } else {
        const text = await res.text().catch(() => '');
        setErrorMsg(text || `Server error ${res.status}`);
        setSaveState('error');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setSaveState('error');
    }
  };

  const canSave = saveState !== 'saving' && note.trim().length > 0
    && (isEditing || !!frameInfo);

  return (
    <div>
      {/* Edit mode banner */}
      {isEditing && (
        <div className="banner banner-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✏ Editing annotation</span>
          <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 6px' }} onClick={onCancelEdit}>
            Cancel
          </button>
        </div>
      )}

      {/* No frame warning */}
      {!isEditing && !frameInfo && (
        <div className="banner banner-warn">Select a frame in Figma to annotate it.</div>
      )}

      {/* Frame link */}
      {!isEditing && frameInfo && (
        <div className="field">
          <span className="field-label">Frame</span>
          <a
            href={frameInfo.frameLink}
            className="frame-link"
            target="_blank"
            rel="noreferrer"
            title={frameInfo.frameLink}
          >
            {frameInfo.frameLink.replace('https://', '')}
          </a>
        </div>
      )}

      {/* Note */}
      <div className="field">
        <label className="field-label" htmlFor="aw-note">Note</label>
        <textarea
          id="aw-note"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          placeholder="Describe this design decision…"
          disabled={saveState === 'saving'}
        />
      </div>

      {/* Status + Expiry row */}
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="aw-status">Status</label>
          <select
            id="aw-status"
            value={status}
            onChange={e => setStatus(e.target.value as AnnotationStatus)}
            className="select-sm"
            disabled={saveState === 'saving'}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
        </div>

        {!isEditing && (
          <div className="field">
            <label className="field-label" htmlFor="aw-expiry">Expires</label>
            <select
              id="aw-expiry"
              value={expiryDays}
              onChange={e => setExpiryDays(Number(e.target.value) as ExpiryDays)}
              className="select-sm"
              disabled={saveState === 'saving'}
            >
              {EXPIRY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="field">
        <span className="field-label">Tags</span>
        <div className="tags-wrap">
          {tags.map(tag => (
            <span key={tag} className="tag-chip">
              {tag}
              <button onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>×</button>
            </span>
          ))}
          <input
            className="tag-text-input"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
            onBlur={commitTag}
            placeholder={tags.length === 0 ? 'Add tags (Enter to confirm)…' : ''}
            disabled={saveState === 'saving'}
          />
        </div>
      </div>

      {/* Save / Update button */}
      <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
        {saveState === 'saving' ? 'Saving…' : isEditing ? 'Update' : 'Save'}
      </button>

      {saveState === 'success' && (
        <p className="feedback feedback-success">{isEditing ? 'Updated!' : 'Annotation saved.'}</p>
      )}
      {saveState === 'error' && (
        <p className="feedback feedback-error">{errorMsg || 'Failed to save. Please try again.'}</p>
      )}
    </div>
  );
}
