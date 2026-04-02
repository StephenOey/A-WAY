import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnnotationForm } from './components/AnnotationForm';
import { AnnotationList } from './components/AnnotationList';
import type { Annotation } from '@a-way/shared';
import './styles.css';

interface FrameInfo { frameId: string; frameLink: string; }
type Tab = 'create' | 'list';

function App() {
  const [frameInfo,          setFrameInfo]          = useState<FrameInfo | null>(null);
  const [designerId,         setDesignerId]         = useState('');
  const [activeTab,          setActiveTab]          = useState<Tab>('create');
  const [editingAnnotation,  setEditingAnnotation]  = useState<Annotation | null>(null);
  const [refreshKey,         setRefreshKey]         = useState(0);

  useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === 'INIT') {
        setFrameInfo(msg.payload.frameInfo ?? null);
        setDesignerId(msg.payload.designerId ?? '');
      }
      if (msg.type === 'SELECTION_CHANGED') {
        setFrameInfo(msg.payload.frameInfo ?? null);
        setEditingAnnotation(null);
        setRefreshKey(k => k + 1);
      }
    };
  }, []);

  const handleEdit = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setActiveTab('create');
  };

  const handleSaved = () => {
    setEditingAnnotation(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="app">
      <div className="app-header">
        <span className="app-title">A·WAY</span>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          {editingAnnotation ? '✏ Edit' : '+ Create'}
        </button>
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => { setActiveTab('list'); setEditingAnnotation(null); }}
        >
          This Frame
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'create' && (
          <AnnotationForm
            frameInfo={frameInfo}
            designerId={designerId}
            editingAnnotation={editingAnnotation}
            onCancelEdit={() => setEditingAnnotation(null)}
            onSaved={handleSaved}
          />
        )}
        {activeTab === 'list' && (
          <AnnotationList
            frameInfo={frameInfo}
            onEdit={handleEdit}
            refreshKey={refreshKey}
          />
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
