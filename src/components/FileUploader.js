import React, { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { processDocumentWithAzure } from '../services/azureService';
import { processWithAzurePython } from '../services/azureServicePython';

const FileUploader = ({ onFileUpload, isProcessing }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');
    
    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      return;
    }

    // Check file type
    const fileType = selectedFile.type;
    if (!fileType.includes('jpeg') && !fileType.includes('jpg') && !fileType.includes('pdf')) {
      setError('ファイルはJPEGまたはPDF形式である必要があります');
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (fileType.includes('jpeg') || fileType.includes('jpg')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // For PDFs just show an icon or text
      setPreview('PDF文書');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }
    onFileUpload(file);
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">問診票のアップロード</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>JPEGまたはPDFファイルを選択</Form.Label>
            <Form.Control 
              type="file" 
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.pdf"
              disabled={isProcessing}
            />
            <Form.Text className="text-muted">
              アップロードされた問診票はAzure OCRで処理されます。
            </Form.Text>
          </Form.Group>

          {error && <Alert variant="danger">{error}</Alert>}

          {preview && (
            <div className="mb-3 mt-3 text-center">
              <h6>プレビュー</h6>
              {typeof preview === 'string' && preview === 'PDF文書' ? (
                <div className="pdf-preview">PDF文書</div>
              ) : (
                <img 
                  src={preview} 
                  alt="問診票のプレビュー" 
                  style={{ maxWidth: '100%', maxHeight: '300px' }} 
                />
              )}
            </div>
          )}

          <Button 
            variant="primary" 
            type="submit" 
            disabled={!file || isProcessing}
          >
            {isProcessing ? '処理中...' : 'OCR処理を開始'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default FileUploader;
