import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnnotationForm } from './components/AnnotationForm';

interface FrameInfo {
  frameId: string;
  frameLink: string;
}

function App() {
  const [frameInfo, setFrameInfo] = useState<FrameInfo | null>(null);

  useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === 'FRAME_INFO') {
        setFrameInfo(msg.payload ?? null);
      }
    };
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>A-WAY Annotation</h2>
      <AnnotationForm frameInfo={frameInfo} />
    </div>
  );
}

const container = document.getElementById('root')!;
createRoot(container).render(<App />);
