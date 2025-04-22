import React, { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { testLLMConnection } from '../services/llmService';

const LlmConfig = ({ llmConfig, onConfigChange, disabled }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onConfigChange({
      ...llmConfig,
      [name]: value
    });
  };

  const handleTestConnection = async () => {
    if (!llmConfig.endpoint) {
      setTestResult({
        success: false,
        message: 'エンドポイントを入力してください'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const success = await testLLMConnection(llmConfig.endpoint);
      
      setTestResult({
        success,
        message: success 
          ? 'ローカルLLMへの接続に成功しました' 
          : 'ローカルLLMへの接続に失敗しました。エンドポイントを確認してください'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `エラー: ${error.message || '不明なエラー'}`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">ローカルLLM設定</Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>ローカルLLMエンドポイント</Form.Label>
          <Form.Control
            type="text"
            name="endpoint"
            placeholder="http://localhost:11434/api/generate"
            value={llmConfig.endpoint || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            ローカルLLM（Ollama、LM Studio等）のAPIエンドポイントを入力してください
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>モデル名</Form.Label>
          <Form.Control
            type="text"
            name="model"
            placeholder="gemma"
            value={llmConfig.model || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            使用するモデル名を入力してください（例: gemma, llama3, mixtral）
          </Form.Text>
        </Form.Group>

        <Button 
          variant="secondary" 
          onClick={handleTestConnection}
          disabled={disabled || testing || !llmConfig.endpoint}
          className="mb-3"
        >
          {testing ? '接続テスト中...' : 'LLM接続テスト'}
        </Button>

        {testResult && (
          <Alert variant={testResult.success ? 'success' : 'danger'}>
            {testResult.message}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default LlmConfig;
