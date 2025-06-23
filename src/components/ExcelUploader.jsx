import { useState } from 'react';
import './ExcelUploader.css';

const ExcelUploader = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please select a valid Excel (.xlsx) file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload file');
      }

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-uploader">
      <div className="upload-container">
        <h2>Excel File Upload</h2>
        <div className="file-input-container">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".xlsx"
            id="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            {file ? file.name : 'Choose Excel File'}
          </label>
        </div>
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="upload-button"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>

      {data && (
        <div className="results-container">
          <h3>Results</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {data.headers.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {data.headers.map((header, colIndex) => (
                      <td key={colIndex}>{row[header]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelUploader; 