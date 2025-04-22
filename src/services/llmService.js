import axios from 'axios';

/**
 * Process OCR text with a local LLM
 * @param {string} ocrText - The text extracted from OCR
 * @param {string} prompt - The prompt template with {{OCR_RESULT}} placeholder
 * @param {string} llmEndpoint - The endpoint for the local LLM (e.g., http://localhost:11434/api/generate)
 * @returns {Promise<string>} - The generated text from the LLM
 */
export const processWithLocalLLM = async (ocrText, prompt, llmEndpoint) => {
  if (!ocrText) {
    throw new Error('OCRテキストが提供されていません');
  }

  if (!prompt) {
    throw new Error('プロンプトが提供されていません');
  }

  if (!llmEndpoint) {
    throw new Error('LLMエンドポイントが提供されていません');
  }

  // Replace placeholder in the prompt with actual OCR text
  const fullPrompt = prompt.replace('{{OCR_RESULT}}', ocrText);

  try {
    // Default configuration for Gemma on Ollama
    // Adjust as needed for your specific LLM setup
    const requestData = {
      model: "gemma",
      prompt: fullPrompt,
      stream: false
    };

    const response = await axios.post(llmEndpoint, requestData);
    
    if (response.data && response.data.response) {
      return response.data.response;
    } else {
      console.error('Unexpected LLM response format:', response.data);
      throw new Error('予期しないLLM応答フォーマット');
    }
  } catch (error) {
    console.error('LLM API error:', error);
    throw new Error(`LLM処理中にエラーが発生しました: ${error.message || error}`);
  }
};

/**
 * Test connection to local LLM
 * @param {string} llmEndpoint - The endpoint for the local LLM
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
export const testLLMConnection = async (llmEndpoint) => {
  try {
    // Simple test request
    const requestData = {
      model: "gemma",
      prompt: "簡単なテストです。「接続成功」と返してください。",
      stream: false
    };

    const response = await axios.post(llmEndpoint, requestData, {
      timeout: 5000 // 5 second timeout for quick feedback
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('LLM connection test error:', error);
    return false;
  }
};
