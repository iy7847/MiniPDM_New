import React from 'react';
import { createPortal } from 'react-dom';
import { useCadViewerStore } from '../../stores/useCadViewerStore';
import { CadViewer } from './CadViewer';

export const GlobalCadViewer: React.FC = () => {
  const { isOpen, file, fileName, closeCadViewer } = useCadViewerStore();

  if (!isOpen || !file) return null;

  return createPortal(
    <CadViewer
      file={file}
      fileName={fileName}
      isModal={true}
      initialRenderMode="edges"
      showDimensionsBanner={true}
      onClose={closeCadViewer}
    />,
    document.body
  );
};
