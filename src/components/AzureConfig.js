import React from 'react';
import { Form, Card } from 'react-bootstrap';

const AzureConfig = ({ 
  azureConfig, 
  onConfigChange,
  disabled
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onConfigChange({
      ...azureConfig,
      [name]: value
    });
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">Azure Document Intelligence 設定</Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>API エンドポイント</Form.Label>
          <Form.Control
            type="text"
            name="endpoint"
            placeholder="https://your-resource-name.cognitiveservices.azure.com/"
            value={azureConfig.endpoint || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            Azure Document Intelligence のエンドポイントURLを入力してください
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>API キー</Form.Label>
          <Form.Control
            type="password"
            name="apiKey"
            placeholder="your-api-key"
            value={azureConfig.apiKey || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            Azure Document Intelligence のAPIキーを入力してください
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>カスタムモデル ID (オプション)</Form.Label>
          <Form.Control
            type="text"
            name="modelId"
            placeholder="custom-model-id"
            value={azureConfig.modelId || ''}
            onChange={handleChange}
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            カスタムモデルを使用する場合はモデルIDを入力してください
          </Form.Text>
        </Form.Group>
      </Card.Body>
    </Card>
  );
};

export default AzureConfig;
