import React from 'react';
import { Card, Button, Tabs, Tab } from 'react-bootstrap';

const ResultDisplay = ({ ocrResult, llmResult }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('テキストがクリップボードにコピーされました');
  };

  if (!ocrResult && !llmResult) {
    return null;
  }

  return (
    <Card className="mb-4">
      <Card.Header as="h5">処理結果</Card.Header>
      <Card.Body>
        <Tabs defaultActiveKey="formatted" className="mb-3">
          {llmResult && (
            <Tab eventKey="formatted" title="整形済みデータ">
              <Card.Title>LLM処理結果</Card.Title>
              <div className="border p-3 mb-3 bg-light">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {llmResult}
                </pre>
              </div>
              <Button 
                variant="primary" 
                onClick={() => copyToClipboard(llmResult)}
              >
                電子カルテ用にコピー
              </Button>
            </Tab>
          )}
          
          {ocrResult && (
            <Tab eventKey="raw" title="OCR生データ">
              <Card.Title>OCR処理結果（生データ）</Card.Title>
              <div className="border p-3 mb-3 bg-light">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {typeof ocrResult === 'object' ? JSON.stringify(ocrResult, null, 2) : ocrResult}
                </pre>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => copyToClipboard(typeof ocrResult === 'object' 
                  ? JSON.stringify(ocrResult, null, 2) 
                  : ocrResult)}
              >
                生データをコピー
              </Button>
            </Tab>
          )}
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default ResultDisplay;
