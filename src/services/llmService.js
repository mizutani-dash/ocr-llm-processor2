import axios from 'axios';

/**
 * Process OCR text with Azure OpenAI Service
 * @param {string} ocrText - The text extracted from OCR
 * @param {string} prompt - The prompt template with {{OCR_RESULT}} placeholder
 * @param {Object} config - The Azure OpenAI configuration
 * @param {string} config.endpoint - The Azure OpenAI endpoint
 * @param {string} config.apiKey - The Azure OpenAI API key
 * @param {string} config.deploymentName - The model deployment name
 * @returns {Promise<string>} - The generated text from Azure OpenAI
 */
export const processWithAzureOpenAI = async (ocrText, prompt, config) => {
  if (!ocrText) {
    throw new Error('OCRテキストが提供されていません');
  }

  if (!prompt) {
    throw new Error('プロンプトが提供されていません');
  }

  if (!config || !config.endpoint || !config.apiKey || !config.deploymentName) {
    throw new Error('Azure OpenAIの設定が不完全です');
  }

  // Replace placeholder in the prompt with actual OCR text
  // OCRテキストを制限してトークン数を削減する
  const MAX_OCR_LENGTH = 3000; // 最大文字数を制限
  let limitedOcrText = ocrText;
  
  if (ocrText.length > MAX_OCR_LENGTH) {
    console.log(`OCRテキストが長すぎるため制限します: ${ocrText.length} -> ${MAX_OCR_LENGTH} 文字`);
    limitedOcrText = ocrText.substring(0, MAX_OCR_LENGTH) + "\n... [テキストが長すぎるため制限されました]"; 
  }
  
  const fullPrompt = prompt.replace('{{OCR_RESULT}}', limitedOcrText);

  try {
    // Azure OpenAI APIのリクエスト形式
    const requestData = {
      messages: [
        {
          role: 'system',
          content: '問診票を構造化して名前、症状、既往歴を表形式で整理。簡潔に。'
        },
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      temperature: 0.0, // 最も決定的な応答にしてトークンを節約
      max_tokens: 300,  // さらにトークン数を削減
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    console.log('Azure OpenAI request data:', JSON.stringify(requestData));

    // Azure OpenAIへのリクエストエンドポイント設定
    // 複数のAPI仕様・バージョンに対応
    // Pythonコードで動作している最新バージョンを使用
    const apiVersion = '2024-02-01'; // Pythonコードで動作している値に更新
    
    // エンドポイントの正規化
    let baseEndpoint = config.endpoint.trim();
    // プロトコルが含まれていない場合は追加
    if (!baseEndpoint.startsWith('http')) {
      baseEndpoint = `https://${baseEndpoint}`;
    }
    // 末尾のスラッシュを削除
    baseEndpoint = baseEndpoint.endsWith('/') ? baseEndpoint.slice(0, -1) : baseEndpoint;
    
    // エンドポイントを構築
    const endpoint = `${baseEndpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    console.log('使用するエンドポイント:', endpoint);
    
    // APIリクエストを送信
    console.log('リクエストを送信中...');
    
    try {
      let retryCount = 0;
      const maxRetries = 2; // 最大再試行回数を増やす
      let response = null;
      
      while (retryCount <= maxRetries) {
        try {
          response = await axios.post(endpoint, requestData, {
            headers: {
              'Content-Type': 'application/json',
              'api-key': config.apiKey,
              'Accept': 'application/json'
            },
            timeout: 30000 // タイムアウトを増やす
          });
          
          console.log('API呼び出しに成功しました');
          break; // 成功したらループを抜ける
        } catch (err) {
          // 429エラー（レート制限）の場合は再試行
          if (err.response && err.response.status === 429 && retryCount < maxRetries) {
            retryCount++;
            console.log(`レート制限エラーです。${retryCount}回目の再試行まで 90 秒間待機します...`);
            await new Promise(resolve => setTimeout(resolve, 90000)); // 90秒待機に延長
            continue;
          }
          // それ以外のエラーはスロー
          throw err;
        }
      }
      
      if (response && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        console.error('予期しない応答フォーマット:', response ? response.data : '応答なし');
        throw new Error('予期しないAzure OpenAI応答フォーマット');
      }
    } catch (error) {
      console.error('Azure OpenAI APIに接続できませんでした:', error);
      throw error;
    }
    
    // 成功レスポンスの処理は上記tryブロック内で完了している
  } catch (error) {
    console.error('Azure OpenAI API error:', error);
    
    // CORSの問題がある可能性を確認
    if (error.message && error.message.includes('CORS')) {
      console.error('CORSエラーが発生した可能性があります。プロキシサーバーの使用を検討してください。');
    }
    
    // 詳細なエラー情報を表示
    if (error.response) {
      console.error('Azure OpenAI API response status:', error.response.status);
      console.error('Azure OpenAI API response data:', error.response.data);
      console.error('Azure OpenAI API response headers:', error.response.headers);
      
      // 広くエラーメッセージを探索
      let errorMessage = '';
      const errorData = error.response.data;
      
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error && errorData.error.innerError && errorData.error.innerError.message) {
          errorMessage = errorData.error.innerError.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      }
      
      if (error.response.status === 401) {
        throw new Error(`Azure OpenAI認証エラー: APIキーが正しくないか期限切れの可能性があります`);
      } else if (error.response.status === 404) {
        throw new Error(`Azure OpenAIエンドポイントが見つかりません: エンドポイントURLまたはデプロイメント名を確認してください`);
      } else {
        throw new Error(`Azure OpenAIエラー (${error.response.status}): ${errorMessage || error.message || '不明なエラー'}`);
      }
    } else if (error.request) {
      // リクエストは送信されたが、応答が存在しない場合
      console.error('Azure OpenAI API no response received:', error.request);
      throw new Error(`Azure OpenAIから応答がありませんでした。エンドポイントのアクセス性やネットワーク接続を確認してください: ${config.endpoint}`);
    } else {
      // リクエストの作成中に発生したエラー
      console.error('Azure OpenAI request setup error:', error.message);
      throw new Error(`Azure OpenAIリクエスト作成エラー: ${error.message || error}`);
    }
  }
};

// 後方互換性のために元の関数名を維持
export const processWithLocalLLM = processWithAzureOpenAI;
export const processWithChatGPT = processWithAzureOpenAI;
export const processWithCopilot = processWithAzureOpenAI;

/**
 * Test connection to Azure OpenAI Service
 * @param {Object} config - The Azure OpenAI configuration
 * @param {string} config.endpoint - The Azure OpenAI endpoint
 * @param {string} config.apiKey - The Azure OpenAI API key
 * @param {string} config.deploymentName - The model deployment name
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
export const testAzureOpenAIConnection = async (config) => {
  try {
    if (!config || !config.endpoint || !config.apiKey || !config.deploymentName) {
      console.error('Azure OpenAIの設定が不完全です');
      return false;
    }
    
    // 設定内容をログ出力（APIキーはマスク）
    console.log('Azure OpenAI設定確認:', { 
      endpoint: config.endpoint,
      apiKey: config.apiKey ? '***' + config.apiKey.substr(-4) : undefined, // 最後の4文字のみ表示
      deploymentName: config.deploymentName
    });

    // Simple test request to Azure OpenAI
    const requestData = {
      messages: [
        {
          role: 'user',
          content: '簡単なテストです。「接続成功」と返してください。'
        }
      ],
      max_tokens: 20,
      temperature: 0.0
    };

    console.log('Azure OpenAI connection test request:', JSON.stringify(requestData));

    // Azure OpenAIへのリクエストエンドポイント設定
    // 複数のAPI仕様・バージョンに対応
    // Pythonコードで動作している最新バージョンを使用
    const apiVersion = '2024-02-01'; // Pythonコードで動作している値に更新
    
    // エンドポイントの正規化
    let baseEndpoint = config.endpoint.trim();
    // プロトコルが含まれていない場合は追加
    if (!baseEndpoint.startsWith('http')) {
      baseEndpoint = `https://${baseEndpoint}`;
    }
    // 末尾のスラッシュを削除
    baseEndpoint = baseEndpoint.endsWith('/') ? baseEndpoint.slice(0, -1) : baseEndpoint;
    
    // APIリクエストを送信
    console.log('テストリクエストを送信中...');
    
    // エンドポイントを構築
    const endpoint = `${baseEndpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${apiVersion}`;
    console.log('使用するエンドポイント:', endpoint);
    
    try {
      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000 // 10秒のタイムアウト
      });
      
      console.log('Azure OpenAI接続テスト成功:', response.data);
      return true;
    } catch (error) {
      console.error('Azure OpenAI接続テスト失敗:', error.message);
      
      if (error.response) {
        console.error('レスポンスステータス:', error.response.status);
        console.error('レスポンスデータ:', error.response.data);
      }
      
      return false;
    }
    // ここに到達することは通常ないはず
  } catch (error) {
    console.error('Azure OpenAI connection test error:', error);
    if (error.response) {
      console.error('Azure OpenAI response data:', error.response.data);
      console.error('Azure OpenAI response status:', error.response.status);
    }
    return false;
  }
};

// 後方互換性のために元の関数名を維持
export const testLLMConnection = testAzureOpenAIConnection;
export const testOpenAIConnection = testAzureOpenAIConnection;
export const testCopilotConnection = testAzureOpenAIConnection;
