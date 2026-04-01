// Runs inside Figma's plugin sandbox — no DOM access.
// Communicates with ui.tsx via figma.ui.postMessage / figma.ui.onmessage.

figma.showUI(__html__, { width: 360, height: 480 });

function getFrameInfo(): { frameId: string; frameLink: string } | null {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) return null;

  const node = selection[0];
  const frameId = node.id;
  // figma.fileKey may be undefined in local drafts
  const fileKey = figma.fileKey ?? 'unknown';
  const frameLink = `https://www.figma.com/file/${fileKey}?node-id=${encodeURIComponent(frameId)}`;
  return { frameId, frameLink };
}

// Send current frame info to UI on load
figma.ui.postMessage({ type: 'FRAME_INFO', payload: getFrameInfo() });

// Listen for messages from the UI
figma.ui.onmessage = (msg: { type: string; payload?: unknown }) => {
  if (msg.type === 'CLOSE') {
    figma.closePlugin();
  }
};
