import React, { useState } from 'react';
import { Form, Card, Button, Alert, ListGroup } from 'react-bootstrap';
import { testAzureConnection } from '../services/azureService';
import { testConnectionPython } from '../services/azureServicePython';

const AzureConfig = ({ 
  azureConfig, 
  onConfigChange,
  disabled
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showModels, setShowModels] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onConfigChange({
      ...azureConfig,
      [name]: value
    });
  };

  const handleTestConnection = async () => {
    if (!azureConfig.endpoint || !azureConfig.apiKey) {
      setTestResult({
        success: false,
        message: 'エンドポイントとAPIキーを入力してください'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setShowModels(false);

    try {
      // Python風実装を優先的に使用
      try {
        console.log('Python風実装でテスト実行');
        const pythonResult = await testConnectionPython(azureConfig);
        setTestResult(pythonResult);
        if (pythonResult.success) {
          // showNotification('接続テスト成功 (Python実装)', 'Azure Document Intelligence APIに正常に接続できました。', 'success');
          return;
        }
      } catch (pythonError) {
        console.log('Python風実装のテストに失敗、標準実装を試行:', pythonError);
      }
      
      // 通常の実装をフォールバックとして使用
      const result = await testAzureConnection(azureConfig);
      setTestResult(result);
      if (result.success) {
        // showNotification('接続テスト成功', 'Azure Document Intelligence APIに正常に接続できました。', 'success');
      } else {
        // Tests can return partial success
        // showNotification('接続テスト完了', 'テスト結果を確認してください。', 'warning');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setTestResult({
        success: false,
        message: `エラー: ${error.message || '不明なエラー'}`
      });
      // showNotification('接続テスト失敗', `エラー: ${error.message}`, 'danger');
    } finally {
      setTesting(false);
    }
  };

  const toggleShowModels = () => {
    setShowModels(!showModels);
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
        
        <Button 
          variant="secondary" 
          onClick={handleTestConnection}
          disabled={disabled || testing || !azureConfig.endpoint || !azureConfig.apiKey}
          className="mb-3"
        >
          {testing ? 'Azure接続テスト中...' : 'Azure接続テスト'}
        </Button>

        {testResult && (
          <div className="mt-3">
            <Alert variant={testResult.success ? 'success' : 'danger'}>
              {testResult.message}
            </Alert>
            
            {testResult.suggestion && (
              <Alert variant="info" className="mt-2">
                <strong>提案:</strong> {testResult.suggestion}
                {testResult.correctModelId && (
                  <div className="mt-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        onConfigChange({
                          ...azureConfig,
                          modelId: testResult.correctModelId
                        });
                        setTestResult({
                          ...testResult,
                          message: `モデルIDが「${testResult.correctModelId}」に更新されました。`,
                          applied: true
                        });
                      }}
                      disabled={azureConfig.modelId === testResult.correctModelId || testResult.applied}
                    >
                      この正確なモデルIDを使用する
                    </Button>
                  </div>
                )}
              </Alert>
            )}
            
            {testResult.success && testResult.models && testResult.models.length > 0 && (
              <div className="mt-2">
                <Button 
                  variant="link" 
                  onClick={toggleShowModels} 
                  className="p-0 mb-2"
                >
                  {showModels ? '利用可能なモデルを非表示' : '利用可能なモデルを表示'}
                </Button>
                
                {showModels && (
                  <ListGroup className="mb-3" style={{ fontSize: '0.9rem' }}>
                    {testResult.models.map((model, index) => (
                      <ListGroup.Item 
                        key={index}
                        className={azureConfig.modelId === model.modelId ? 'bg-light' : ''}
                        action
                        onClick={() => {
                          if (azureConfig.modelId !== model.modelId) {
                            onConfigChange({
                              ...azureConfig,
                              modelId: model.modelId
                            });
                          }
                        }}
                      >
                        <strong>モデルID:</strong> {model.modelId || 'N/A'}
                        {azureConfig.modelId === model.modelId && (
                          <span className="ms-2 badge bg-primary">使用中</span>
                        )}
                        <br />
                        <strong>説明:</strong> {model.description || '説明なし'}<br />
                        {model.createdDateTime && (
                          <small className="text-muted">作成日時: {new Date(model.createdDateTime).toLocaleString()}</small>
                        )}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AzureConfig;
