import React, { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { testAzureOpenAIConnection } from '../services/llmService';

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
    // 必要な設定がすべて揃っているか確認
    if (!llmConfig.endpoint || !llmConfig.apiKey || !llmConfig.deploymentName) {
      setTestResult({
        success: false,
        message: 'Azure OpenAIのエンドポイント、APIキー、デプロイメント名を入力してください'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const config = {
        endpoint: llmConfig.endpoint,
        apiKey: llmConfig.apiKey,
        deploymentName: llmConfig.deploymentName
      };
      
      const success = await testAzureOpenAIConnection(config);
      
      setTestResult({
        success,
        message: success 
          ? 'Azure OpenAI Serviceへの接続に成功しました' 
          : 'Azure OpenAI Serviceへの接続に失敗しました。設定を確認してください'
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
      <Card.Header as="h5">Azure OpenAI Service 設定</Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>Azure OpenAI エンドポイント</Form.Label>
          <Form.Control
            type="text"
            name="endpoint"
            placeholder="https://your-resource-name.openai.azure.com"
            value={llmConfig.endpoint || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            Azureポータルで作成したOpenAIリソースのエンドポイントを入力してください
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Azure OpenAI APIキー</Form.Label>
          <Form.Control
            type="password"
            name="apiKey"
            placeholder="1234..."
            value={llmConfig.apiKey || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            Azure OpenAIリソースのAPIキーを入力してください
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>デプロイメント名</Form.Label>
          <Form.Control
            type="text"
            name="deploymentName"
            placeholder="gpt-4"
            value={llmConfig.deploymentName || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            Azureポータルでデプロイしたモデルのデプロイメント名を入力してください（例: gpt-4, gpt-35-turbo）
          </Form.Text>
        </Form.Group>

        <Button 
          variant="secondary" 
          onClick={handleTestConnection}
          disabled={disabled || testing || !llmConfig.endpoint || !llmConfig.apiKey || !llmConfig.deploymentName}
          className="mb-3"
        >
          {testing ? '接続テスト中...' : 'Azure OpenAI接続テスト'}
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
