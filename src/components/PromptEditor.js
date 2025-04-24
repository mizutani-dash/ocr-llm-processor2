import React from 'react';
import { Form, Card } from 'react-bootstrap';

const PromptEditor = ({ prompt, onPromptChange, disabled }) => {
  return (
    <Card className="mb-4">
      <Card.Header as="h5">LLM プロンプト編集</Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>プロンプトテンプレート</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            disabled={disabled}
            placeholder="ここにLLMへのプロンプトを入力してください。OCRの結果は {'{{OCR_RESULT}}'} として参照できます。"
          />
          <Form.Text className="text-muted">
            プロンプト内で {'{{OCR_RESULT}}'} と記載された部分はOCR結果に置き換えられます。
            Local LLMに問診票データの整形方法を指示するプロンプトを記述してください。
          </Form.Text>
        </Form.Group>
      </Card.Body>
    </Card>
  );
};

export default PromptEditor;
