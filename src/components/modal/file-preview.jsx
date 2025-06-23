import React, { useEffect, useRef, useState } from 'react';
// import { Document, Page } from 'react-pdf';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// import * as pdfjsLib from 'pdfjs-dist';

const FilePreviewModal = ({ fileName, fileData, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
    renderFile(fileData);
  }, []);

  const renderFile = (file) => {
    const mimeType = file.type || 'application/octet-stream';
    const fileType = mimeType.split('/')[0];

    console.log('MIME Type:', mimeType);

    if (mimeType === 'application/pdf') {
        renderPDF(file);
    } else if (fileType === 'image') {
        renderImage(file);
    } else {
        console.error('Unsupported file type:', mimeType);
    }
  };

  const renderPDF = (pdfBlob) => {
    const reader = new FileReader();

    reader.onload = (event) => {
        const pdfData = new Uint8Array(event.target.result);

        pdfjsLib.getDocument(pdfData).promise.then((pdf) => {
            console.log('PDF loaded');

            pdf.getPage(1).then((page) => {
                const container = containerRef.current;
                const dpi = 300;
                const scale = dpi / 72;
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (container) {
                    container.style.width = `${viewport.width}px`;
                    container.style.height = `${viewport.height}px`;
                }

                page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise.then(() => {
                    console.log('Page rendered');
                });
            });
        });
    };

    reader.readAsArrayBuffer(pdfBlob);
  };


  const renderImage = (imageBlob) => {
    const reader = new FileReader();

    reader.onload = (event) => {
        const image = new Image();
        image.src = event.target.result;

        image.onload = () => {
            const container = containerRef.current;
            container.innerHTML = '';

            container.style.width = `${image.width}px`;
            container.style.height = `${image.height}px`;
            container.appendChild(image);
        };
    };

    reader.readAsDataURL(imageBlob);
  };

  const onLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

//   const renderFilePreview = () => {
//     const fileExtension = fileName?.split('.').pop().toLowerCase();
    
//     if (fileExtension === 'pdf') {
//       // Display PDF
//       return (
//         <div>
//           <Document
//             file={{ data: fileData }}
//             onLoadSuccess={onLoadSuccess}
//           >
//             <Page pageNumber={pageNumber} />
//           </Document>
//           <div className="flex justify-between mt-2">
//             <button 
//               disabled={pageNumber <= 1} 
//               onClick={() => setPageNumber(pageNumber - 1)} 
//               className="text-blue-600"
//             >
//               Previous
//             </button>
//             <span>{`Page ${pageNumber} of ${numPages}`}</span>
//             <button 
//               disabled={pageNumber >= numPages} 
//               onClick={() => setPageNumber(pageNumber + 1)} 
//               className="text-blue-600"
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       );
//     } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
//       // Display Image
//       return (
//         <img 
//           src={URL.createObjectURL(fileData)} 
//           alt={fileName} 
//           className="max-w-full h-auto"
//         />
//       );
//     } else {
//       return <p>Unsupported file type</p>;
//     }
//   };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <h3 className="text-lg font-medium mb-4">File Preview</h3>
        <div className="max-h-[80vh] overflow-auto">
          {/* {renderFilePreview()} */}
          <div ref={containerRef}>
            <canvas ref={canvasRef} style={{ width: '100%', backgroundColor: 'blue' }} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default FilePreviewModal;
