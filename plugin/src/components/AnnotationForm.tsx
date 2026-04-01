import React, { useState } from 'react';
import type { CreateAnnotationInput, AnnotationStatus } from '@a-way/shared';
import { API_URL } from '../constants';

interface Props {
  frameInfo: { frameId: string; frameLink: string } | null;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export function AnnotationForm({ frameInfo }: Props) {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<AnnotationStatus>('draft');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const handleSave = async () => {
    if (!frameInfo) return;
    setSaveState('saving');

    const body: CreateAnnotationInput = {
      designer_id: 'figma-user', // Replace with actual Figma currentUser.id when available
      frame_id: frameInfo.frameId,
      frame_link: frameInfo.frameLink,
      note,
      status,
    };

    try {
      const res = await fetch(`${API_URL}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSaveState(res.ok ? 'success' : 'error');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Frame link
        <input
          readOnly
          value={frameInfo?.frameLink ?? '(no frame selected)'}
          style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 8 }}>
        Note
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AnnotationStatus)}
          style={{ display: 'block', marginTop: 4 }}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </label>

      <button
        onClick={handleSave}
        disabled={saveState === 'saving' || !frameInfo}
        style={{ width: '100%', padding: '8px 0' }}
      >
        {saveState === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {saveState === 'success' && (
        <p style={{ color: 'green', marginTop: 8 }}>Annotation saved.</p>
      )}
      {saveState === 'error' && (
        <p style={{ color: 'red', marginTop: 8 }}>Failed to save. Please try again.</p>
      )}
    </div>
  );
}
