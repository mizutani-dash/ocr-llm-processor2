import React from 'react';
import { Card, Button, Tabs, Tab, ButtonGroup } from 'react-bootstrap';

const ResultDisplay = ({ ocrResult, llmResult }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('テキストがクリップボードにコピーされました');
  };

  // ファイルダウンロード関数
  const downloadAsTextFile = (content, fileName) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // OCR結果をダウンロード
  const downloadOcrResult = () => {
    const content = typeof ocrResult === 'object' ? JSON.stringify(ocrResult, null, 2) : ocrResult;
    downloadAsTextFile(content, 'ocr-result.txt');
  };

  // LLM結果をダウンロード
  const downloadLlmResult = () => {
    downloadAsTextFile(llmResult, 'llm-formatted-result.txt');
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
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflow: 'auto' }}>
                  {llmResult}
                </pre>
              </div>
              <ButtonGroup className="mb-2">
                <Button 
                  variant="primary" 
                  onClick={() => copyToClipboard(llmResult)}
                >
                  電子カルテ用にコピー
                </Button>
                <Button 
                  variant="outline-primary" 
                  onClick={downloadLlmResult}
                >
                  テキストファイルでダウンロード
                </Button>
              </ButtonGroup>
            </Tab>
          )}
          
          {ocrResult && (
            <Tab eventKey="raw" title="OCR生データ">
              <Card.Title>OCR処理結果（生データ）</Card.Title>
              <div className="border p-3 mb-3 bg-light">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflow: 'auto' }}>
                  {typeof ocrResult === 'object' ? JSON.stringify(ocrResult, null, 2) : ocrResult}
                </pre>
                <p className="text-muted text-center mt-2">※ データ量が多い場合は一部表示されていません。すべてのデータをご覧になるには「テキストファイルでダウンロード」ボタンをご利用ください。</p>
              </div>
              <ButtonGroup className="mb-2">
                <Button 
                  variant="secondary" 
                  onClick={() => copyToClipboard(typeof ocrResult === 'object' 
                    ? JSON.stringify(ocrResult, null, 2) 
                    : ocrResult)}
                >
                  生データをコピー
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={downloadOcrResult}
                >
                  テキストファイルでダウンロード
                </Button>
              </ButtonGroup>
            </Tab>
          )}
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default ResultDisplay;
