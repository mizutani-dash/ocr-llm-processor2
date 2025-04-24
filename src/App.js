import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import FileUploader from './components/FileUploader';
import AzureConfig from './components/AzureConfig';
import PromptEditor from './components/PromptEditor';
import ResultDisplay from './components/ResultDisplay';
import LlmConfig from './components/LlmConfig';

// Services
import { processDocumentWithAzure, extractTextFromAzureResponse } from './services/azureService';
import { processWithAzurePython, extractTextFromResult } from './services/azureServicePython';
import { processWithLocalLLM } from './services/llmService';

function App() {
  // State for file and processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [llmResult, setLlmResult] = useState('');

  // Configuration state
  const [azureConfig, setAzureConfig] = useState(() => {
    const savedConfig = localStorage.getItem('azureConfig');
    return savedConfig ? JSON.parse(savedConfig) : {
      endpoint: '',
      apiKey: '',
      modelId: ''
    };
  });

  const [llmConfig, setLlmConfig] = useState(() => {
    const savedConfig = localStorage.getItem('llmConfig');
    return savedConfig ? JSON.parse(savedConfig) : {
      endpoint: '',
      apiKey: '',
      deploymentName: ''
    };
  });

  // Prompt template state
  const [promptTemplate, setPromptTemplate] = useState(() => {
    const savedPrompt = localStorage.getItem('promptTemplate');
    return savedPrompt || `あなたは医療機関の事務スタッフです。以下の問診票のOCRデータを解析して、電子カルテに入力しやすい形式に整形してください。
患者情報、症状、既往歴、アレルギー、服用薬などの重要情報を抽出し、明確に分類して表示してください。

問診票データ:
{{OCR_RESULT}}

整形後のデータ形式は以下の通りです:
【患者基本情報】
- 氏名: 
- 年齢: 
- 性別: 
- 連絡先: 

【主訴・症状】
- 

【既往歴】
- 

【服用中の薬剤】
- 

【アレルギー】
- 

【その他特記事項】
- `;
  });

  // Save configurations to localStorage when they change
  useEffect(() => {
    localStorage.setItem('azureConfig', JSON.stringify(azureConfig));
  }, [azureConfig]);

  useEffect(() => {
    localStorage.setItem('llmConfig', JSON.stringify(llmConfig));
  }, [llmConfig]);

  useEffect(() => {
    localStorage.setItem('promptTemplate', promptTemplate);
  }, [promptTemplate]);

  // Handle file upload and processing
  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setError('');
    setOcrResult(null);
    setLlmResult('');

    try {
      // Step 1: Process with Azure OCR (優先的にPython風実装を使用)
      let azureResponse;
      let extractedText;
      
      try {
        console.log('Python風実装でAzure OCR処理を実行');
        azureResponse = await processWithAzurePython(file, azureConfig);
        extractedText = extractTextFromResult(azureResponse);
        console.log('Python風実装での処理が成功しました');
      } catch (pythonError) {
        console.log('Python風実装での処理に失敗、標準実装を使用:', pythonError.message);
        // フォールバックとして標準実装を使用
        azureResponse = await processDocumentWithAzure(file, azureConfig);
        extractedText = extractTextFromAzureResponse(azureResponse);
      }
      
      setOcrResult({
        rawResponse: azureResponse,
        extractedText
      });

      // Step 2: Process with Local LLM
      if (extractedText && llmConfig.endpoint) {
        try {
          // 詳細なデバッグログを追加
          console.log('★ LLM処理開始: 設定値確認');
          console.log(' - endpoint:', llmConfig.endpoint);
          console.log(' - apiKey:', llmConfig.apiKey ? `***${llmConfig.apiKey.substr(-4)}` : 'null');
          console.log(' - deploymentName:', llmConfig.deploymentName);
          
          // エンドポイント形式を正規化
          let endpoint = llmConfig.endpoint.trim();
          // プロトコルが含まれていない場合は追加
          if (!endpoint.startsWith('http')) {
            endpoint = `https://${endpoint}`;
            console.log(' - プロトコルを追加しました:', endpoint);
          }
          
          // Azure OpenAIの設定情報を正しい形式で渡す
          const configForLLM = {
            endpoint: endpoint,
            apiKey: llmConfig.apiKey,
            deploymentName: llmConfig.deploymentName
          };
          
          console.log('★ LLM処理に渡す設定:', configForLLM);
          
          const formattedText = await processWithLocalLLM(
            extractedText, 
            promptTemplate, 
            configForLLM
          );
          
          setLlmResult(formattedText);
        } catch (llmError) {
          console.error('LLM processing error:', llmError);
          setError(`LLM処理エラー: ${llmError.message}`);
          // Continue even if LLM processing fails
        }
      }
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      setError(`OCR処理エラー: ${ocrError.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="App">
      <Container fluid="md" className="py-4">
        <Row className="mb-4">
          <Col>
            <h1 className="text-center">問診票OCR＆LLM処理アプリ</h1>
            <p className="text-center text-muted">
              医療問診票をOCRで読み取り、ローカルLLMで電子カルテ用に整形します
            </p>
          </Col>
        </Row>

        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger">{error}</Alert>
            </Col>
          </Row>
        )}

        {isProcessing && (
          <Row className="mb-4">
            <Col className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">処理中...</span>
              </Spinner>
              <p className="mt-2">ファイル処理中...</p>
            </Col>
          </Row>
        )}

        <Row>
          <Col lg={6}>
            <FileUploader 
              onFileUpload={handleFileUpload} 
              isProcessing={isProcessing} 
            />
            
            <AzureConfig 
              azureConfig={azureConfig}
              onConfigChange={setAzureConfig}
              disabled={isProcessing}
            />
            
            <LlmConfig 
              llmConfig={llmConfig}
              onConfigChange={setLlmConfig}
              disabled={isProcessing}
            />
          </Col>
          
          <Col lg={6}>
            <PromptEditor 
              prompt={promptTemplate}
              onPromptChange={setPromptTemplate}
              disabled={isProcessing}
            />
            
            <ResultDisplay 
              ocrResult={ocrResult ? ocrResult.extractedText : null}
              llmResult={llmResult}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
