// Runs inside Figma's plugin sandbox — no DOM access.
// Communicates with ui.tsx via figma.ui.postMessage / figma.ui.onmessage.

figma.showUI(__html__, { width: 360, height: 540 });

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

// figma.currentUser is null when the plugin runs outside an authenticated session
const designerId = figma.currentUser?.id ?? figma.currentUser?.name ?? 'unknown-designer';

// Send context to UI on load
figma.ui.postMessage({
  type: 'INIT',
  payload: { frameInfo: getFrameInfo(), designerId },
});

// Notify UI whenever the designer selects a different frame
figma.on('selectionchange', () => {
  figma.ui.postMessage({
    type: 'SELECTION_CHANGED',
    payload: { frameInfo: getFrameInfo() },
  });
});

// Listen for messages from the UI
figma.ui.onmessage = (msg: { type: string; payload?: unknown }) => {
  if (msg.type === 'CLOSE') figma.closePlugin();
};
