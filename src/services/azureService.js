import axios from 'axios';

/**
 * Test the connection to Azure Document Intelligence and validate the custom model ID if provided
 * @param {Object} config - Azure configuration object
 * @param {string} config.endpoint - The Azure endpoint
 * @param {string} config.apiKey - The Azure API key
 * @param {string} config.modelId - Optional custom model ID
 * @returns {Promise<Object>} - The test result
 */
export const testAzureConnection = async (config) => {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('Azure APIの設定が不完全です。エンドポイントとAPIキーを入力してください。');
  }

  try {
    // Remove trailing slash from endpoint if present
    const endpoint = config.endpoint.endsWith('/') 
      ? config.endpoint.slice(0, -1) 
      : config.endpoint;
      
    // Try multiple possible API endpoint paths including older versions
    let baseUrl = `${endpoint}/documentintelligence/documentModels?api-version=2023-07-31`;
    let fallbackUrl = `${endpoint}/formrecognizer/documentModels?api-version=2023-07-31`;
    let oldApiFallbackUrl = `${endpoint}/formrecognizer/v2.1/custom/models?api-version=2021-09-30`;
    
    console.log('Testing API connections:', { primary: baseUrl, fallback: fallbackUrl });
    
    let apiResponse;
    try {
      // Try primary URL first
      apiResponse = await axios.get(baseUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': config.apiKey
        }
      });
      console.log('Primary API endpoint connection successful');
    } catch (primaryError) {
      console.log('Primary API endpoint failed, trying fallback...', primaryError.message);
      try {
        // Try fallback URL
        apiResponse = await axios.get(fallbackUrl, {
          headers: {
            'Ocp-Apim-Subscription-Key': config.apiKey
          }
        });
        console.log('Fallback API endpoint connection successful');
        // Update baseUrl to the successful fallback for model testing
        baseUrl = fallbackUrl;
      } catch (fallbackError) {
        console.log('Standard fallback failed, trying older API version...', fallbackError.message);
        // Try old API format fallback URL
        apiResponse = await axios.get(oldApiFallbackUrl, {
          headers: {
            'Ocp-Apim-Subscription-Key': config.apiKey
          }
        });
        console.log('Old API endpoint connection successful');
        // Update baseUrl to the successful fallback for model testing
        baseUrl = oldApiFallbackUrl;
      }
    }

    // If a custom model ID is provided, check if it exists
    if (config.modelId && config.modelId.trim() !== '') {
      // Get all available models first for detailed output
      console.log('Fetching all available models...');
      const availableModels = apiResponse.data.models || [];
      console.log(`Found ${availableModels.length} models in account`);
      
      // Log all available models for debugging
      if (availableModels.length > 0) {
        console.log('Available models:', availableModels.map(m => ({ 
          id: m.modelId, 
          description: m.description || 'No description'
        })));
      }
      
      // Handle special case if model ID might be a full URL or contain special characters
      const cleanModelId = config.modelId.trim()
        .replace(/^.*[\/\\]/, '') // Remove any path-like prefixes
        .replace(/[?#].*$/, '');     // Remove URL parameters
        
      console.log(`Looking for model with ID: ${cleanModelId}`);

      // First try direct model lookup
      try {
        // Try both API paths
        const attempts = [
          { path: 'documentintelligence', version: '2023-07-31', urlPattern: '${endpoint}/${path}/documentModels/${cleanModelId}?api-version=${version}' },
          { path: 'formrecognizer', version: '2023-07-31', urlPattern: '${endpoint}/${path}/documentModels/${cleanModelId}?api-version=${version}' },
          { path: 'formrecognizer', version: '2022-08-31', urlPattern: '${endpoint}/${path}/documentModels/${cleanModelId}?api-version=${version}' },
          { path: 'formrecognizer', version: '2021-09-30', urlPattern: '${endpoint}/${path}/custom/models/${cleanModelId}?api-version=${version}' },
          // この形式がPythonで動作している可能性が高い
          { path: 'formrecognizer/v2.1', version: '2021-09-30', urlPattern: '${endpoint}/${path}/custom/models/${cleanModelId}?api-version=${version}' }
        ];
        
        let modelFound = false;
        let modelDetails = null;
        
        // Try all combinations until one works
        for (const attempt of attempts) {
          if (modelFound) break;
          
          try {
            const { path, version } = attempt;
            // モデルURLを構築 - 正確なパターンを使用
            let modelUrl;
            if (attempt.urlPattern) {
              // テンプレートリテラルを評価
              modelUrl = eval('`' + attempt.urlPattern + '`');
            } else {
              modelUrl = `${endpoint}/${path}/documentModels/${cleanModelId}?api-version=${version}`;
            }
            console.log(`Attempting to connect to model with: ${modelUrl}`);
            
            const modelResponse = await axios.get(modelUrl, {
              headers: {
                'Ocp-Apim-Subscription-Key': config.apiKey
              }
            });
            
            modelFound = true;
            modelDetails = modelResponse.data;
            console.log('Model found with direct URL!');
          } catch (attemptError) {
            console.log(`Attempt failed with path=${attempt.path}, version=${attempt.version}: ${attemptError.message}`);
          }
        }
        
        if (modelFound) {
          return {
            success: true,
            message: `接続成功しました。カスタムモデル 「${cleanModelId}」 が見つかりました。`,
            modelDetails: modelDetails,
            models: availableModels
          };
        }
        
        // If direct lookup failed, check if we can find it in the list
        const matchingModel = availableModels.find(model => {
          // Try different matching approaches
          const matchExact = model.modelId === cleanModelId;
          const matchCaseInsensitive = model.modelId.toLowerCase() === cleanModelId.toLowerCase();
          const matchPartial = model.modelId.includes(cleanModelId) || cleanModelId.includes(model.modelId);
          return matchExact || matchCaseInsensitive || matchPartial;
        });
        
        if (matchingModel) {
          console.log('Found matching model in list:', matchingModel);
          return {
            success: true,
            message: `接続成功しました。カスタムモデル 「${matchingModel.modelId}」 が見つかりました。入力値「${config.modelId}」と完全に一致していませんが、似たモデルが見つかりました。`,
            suggestion: `正確なモデルIDは '${matchingModel.modelId}' です。このIDを使用することをお勧めします。`,
            modelDetails: matchingModel,
            correctModelId: matchingModel.modelId,
            models: availableModels
          };
        }
        
        // If all attempts failed, return comprehensive error with available models
        console.log('All attempts to find model failed');
        return {
          success: false,
          message: `API接続は成功しましたが、指定されたカスタムモデル 「${config.modelId}」 は見つかりませんでした。`,
          availableModels: availableModels,
          error: '利用可能なモデルを確認してください'
        };
      } catch (modelError) {
        console.error('Error checking custom model:', modelError);
        // Model ID is invalid
        return {
          success: false,
          message: `API接続は成功しましたが、指定されたカスタムモデル 「${config.modelId}」 は見つかりませんでした。`,
          availableModels: availableModels,
          error: modelError.message
        };
      }
    }

    // Just return the successful connection info
    return {
      success: true,
      message: '接続が成功しました。利用可能なモデルが見つかりました。',
      models: apiResponse.data.models || []
    };
  } catch (error) {
    console.error('Azure API connection test error:', error);
    return {
      success: false,
      message: `Azure APIへの接続に失敗しました: ${error.message || '不明なエラー'}`,
      error: error.message || error
    };
  }
};

/**
 * Process the analysis response and poll for results
 * @param {Object} response - The initial API response
 * @param {string} apiKey - The Azure API key
 * @returns {Promise<Object>} - The analysis results
 */
async function processAnalysisResponse(response, apiKey) {
  // Get the operation location from the response headers
  const operationLocation = response.headers['operation-location'];
  if (!operationLocation) {
    throw new Error('Azure APIから操作場所を取得できませんでした。');
  }

  console.log('Operation location:', operationLocation);

  // Poll for results
  let resultResponse;
  let complete = false;
  let retries = 0;
  const maxRetries = 60; // Increased polling attempts for multi-page documents

  while (!complete && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
    resultResponse = await axios.get(operationLocation, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });

    if (resultResponse.data.status === 'succeeded') {
      complete = true;
    } else if (resultResponse.data.status === 'failed') {
      throw new Error(`OCR処理に失敗しました: ${resultResponse.data.error?.message || '不明なエラー'}`);
    }

    retries++;
  }

  if (!complete) {
    throw new Error('OCR処理がタイムアウトしました。大きなファイルや複数ページのPDFであるため、時間がかかっている可能性があります。');
  }

  return resultResponse.data;
}

/**
 * Send a document to Azure Document Intelligence for OCR processing
 * @param {File} file - The file (PDF or image) to process
 * @param {Object} config - Azure configuration object
 * @param {string} config.endpoint - The Azure endpoint
 * @param {string} config.apiKey - The Azure API key
 * @param {string} config.modelId - Optional custom model ID
 * @returns {Promise<Object>} - The OCR results
 */
export const processDocumentWithAzure = async (file, config) => {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('Azure APIの設定が不完全です。エンドポイントとAPIキーを入力してください。');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    // Construct the appropriate API URL based on whether a custom model is used
    let apiUrl;
    let additionalParams = {};
    
    // Add parameters to process all pages for PDFs
    if (file.type.includes('pdf')) {
      additionalParams.pages = '1-';
    }
    
    // More detailed logging to diagnose the issue
    console.log('Processing file:', { 
      name: file.name, 
      type: file.type, 
      size: file.size,
      endpoint: config.endpoint,
      modelId: config.modelId || 'Using default model'
    });
    
    // Remove trailing slash from endpoint if present
    const endpoint = config.endpoint.endsWith('/') 
      ? config.endpoint.slice(0, -1) 
      : config.endpoint;
      
    let customModelId = config.modelId && config.modelId.trim() !== '' 
      ? config.modelId.trim() : 'prebuilt-layout';
      
    // Pythonコードに従って直接Document Intelligenceの呼び出し方法に合わせる
    try {
      console.log('Testing connection to verify custom model...');
      const testResult = await testAzureConnection(config);
      
      // もし修正されたモデルIDが見つかった場合は使用
      if (testResult.correctModelId) {
        customModelId = testResult.correctModelId;
        console.log(`Using corrected model ID: ${customModelId}`);
      }
    } catch (error) {
      console.log('Failed to verify model, but continuing:', error.message);
    }
    
    // まず、呼び出し方法を統一化するために、可能性のあるAPI URLのフォーマットをすべて試す
    const apiFormats = [
      // 最新バージョン - Document Intelligence
      {
        apiUrl: `${endpoint}/documentintelligence/documentModels/${customModelId}:analyze`,
        apiVersion: '2023-07-31',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': config.apiKey
        },
        params: {}
      },
      // 従来のバージョン - Form Recognizer
      {
        apiUrl: `${endpoint}/formrecognizer/documentModels/${customModelId}:analyze`,
        apiVersion: '2023-07-31',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': config.apiKey
        },
        params: {}
      },
      // 従来の別バージョン
      {
        apiUrl: `${endpoint}/formrecognizer/documentModels/${customModelId}:analyze`, 
        apiVersion: '2022-08-31',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': config.apiKey
        },
        params: {}
      },
      // さらに古いバージョン
      {
        apiUrl: `${endpoint}/formrecognizer/custom/models/${customModelId}/analyze`,
        apiVersion: '2021-09-30',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': config.apiKey
        },
        params: {}
      },
      // 最も古いv2.1のパス形式 - Python SDKで使われる可能性が高い
      {
        apiUrl: `${endpoint}/formrecognizer/v2.1/custom/models/${customModelId}/analyze`,
        apiVersion: '2021-09-30',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': config.apiKey
        },
        params: {}
      }
    ];
    
    console.log('API formats to try:', apiFormats.map(f => `${f.apiUrl}?api-version=${f.apiVersion}`));

    // 各APIフォーマットを試す
    let lastError = null;
    for (const apiFormat of apiFormats) {
      try {
        // API バージョンをクエリパラメータとして追加
        const params = { 
          'api-version': apiFormat.apiVersion,
          ...apiFormat.params
        };
        
        // URLを構築
        const url = apiFormat.apiUrl + '?' + new URLSearchParams(params).toString();
        console.log('Trying API URL:', url);
        
        let response;
        
        // 2021-09-30 バージョンの場合は特別な処理
        if (apiFormat.apiVersion === '2021-09-30') {
          // ファイルをバイナリとして読み込む（PythonのSDKの動作に近い方法）
          const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
          });
          
          // Content-Type設定を変更
          // もとのContent-Type値を保持
          const mimeType = file.type || (() => {
            // 拡張子からMIMEタイプを推測
            const ext = file.name.split('.').pop().toLowerCase();
            const mimeTypes = {
              'pdf': 'application/pdf',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'tiff': 'image/tiff',
              'tif': 'image/tiff',
              'bmp': 'image/bmp'
            };
            return mimeTypes[ext] || 'application/octet-stream';
          })();
          
          console.log(`Using binary upload with mime type: ${mimeType}`);
          
          // 直接バイナリデータを送信
          response = await axios.post(url, arrayBuffer, {
            headers: {
              'Ocp-Apim-Subscription-Key': config.apiKey,
              'Content-Type': mimeType
            }
          });
        } else {
          // 新しいAPIバージョン用 - FormDataを使用
          response = await axios.post(url, formData, {
            headers: apiFormat.headers
          });
        }
        
        console.log('API request succeeded with URL:', url);
        return await processAnalysisResponse(response, config.apiKey);
      } catch (error) {
        console.log(`API request failed for URL ${apiFormat.apiUrl}:`, error.message);
        lastError = error;
        
        // より詳細なエラー情報を記録
        if (error.response) {
          console.log('Error response status:', error.response.status);
          console.log('Error response data:', JSON.stringify(error.response.data));
        }
      }
    }
    
    // All attempts failed
    console.error('All API request attempts failed');
    throw new Error(`Azure OCR処理に失敗しました: ${lastError?.message || 'すべてのAPIエンドポイントで失敗しました'}`);
    
  } catch (error) {
    console.error('Azure API error:', error);
    throw new Error(`Azure OCR処理中にエラーが発生しました: ${error.message || error}`);
  }
};

/**
 * Extract text content from Azure Document Intelligence API response
 * @param {Object} apiResponse - The API response from Azure
 * @returns {string} - The extracted text content including selection state information
 */
export const extractTextFromAzureResponse = (apiResponse) => {
  if (!apiResponse || !apiResponse.analyzeResult) {
    console.log('No analyze result found in API response');
    return '';
  }

  console.log('Processing API response to extract text and selection states');
  let extractedText = '';

  // 1. テキスト要素の抽出
  const { paragraphs, tables, documents, content } = apiResponse.analyzeResult;
  
  // まず純粋なテキストを抽出（OCRされた全テキスト）
  if (content) {
    extractedText += '【OCRテキスト全体】\n' + content + '\n\n';
  } else if (paragraphs && paragraphs.length > 0) {
    extractedText += '【段落テキスト】\n' + paragraphs.map(p => p.content).join('\n') + '\n\n';
  }

  // 2. 選択状態（チェックボックス/ラジオボタン）の抽出
  if (documents && documents.length > 0) {
    const document = documents[0];
    extractedText += '【選択状態情報】\n';

    // フォームフィールドの取得
    const fields = document.fields || {};
    
    // 各フィールドをループ処理
    Object.entries(fields).forEach(([key, field]) => {
      // 選択フィールドか確認
      if (field.type === 'selectionMark' || field.valueType === 'selectionMark') {
        const state = field.value?.state || field.valueSelection?.state;
        const isSelected = state === 'selected';
        extractedText += `${key}: ${isSelected ? '✓選択済み' : '☐未選択'}\n`;
      }
      // テキストフィールド
      else if (field.valueString || field.value?.valueString || field.content) {
        const value = field.valueString || field.value?.valueString || field.content || '';
        extractedText += `${key}: ${value}\n`;
      }
    });
    extractedText += '\n';
  }

  // 3. テーブルデータの抽出（行と列の構造を保持）
  if (tables && tables.length > 0) {
    extractedText += '【表形式データ】\n';
    
    tables.forEach((table, tableIndex) => {
      extractedText += `表${tableIndex + 1}:\n`;
      
      // テーブルデータの2次元配列を作成
      const cells = table.cells || [];
      const tableData = [];
      
      // テーブル構造を初期化
      const rowCount = Math.max(...cells.map(cell => cell.rowIndex)) + 1;
      const colCount = Math.max(...cells.map(cell => cell.columnIndex)) + 1;
      
      for (let i = 0; i < rowCount; i++) {
        tableData[i] = Array(colCount).fill('');
      }
      
      // セルデータを埋める
      cells.forEach(cell => {
        // 各セル内の選択状態を確認
        let content = cell.content || '';
        // セルに選択マークがある場合の処理
        const selectionState = cell.selectionState || '';
        if (selectionState === 'selected') {
          content += ' [✓]';
        } else if (selectionState === 'unselected') {
          content += ' [☐]';
        }
        
        tableData[cell.rowIndex][cell.columnIndex] = content;
      });
      
      // テーブルデータを文字列に変換
      tableData.forEach(row => {
        extractedText += row.join(' | ') + '\n';
      });
      extractedText += '\n';
    });
  }

  // 4. フォームフィールドから選択マークを直接検索（代替的なアプローチ）
  const selectionMarks = [];
  const searchSelectionMarks = (obj) => {
    if (!obj) return;
    
    if (obj.type === 'selectionMark' || obj.valueType === 'selectionMark') {
      const state = obj.state || obj.value?.state || '';
      const content = obj.content || obj.valueString || obj.name || 'Unnamed';
      selectionMarks.push({ content, selected: state === 'selected' });
    }
    
    // 再帰的に検索
    if (typeof obj === 'object') {
      Object.values(obj).forEach(value => {
        if (typeof value === 'object' && value !== null) {
          searchSelectionMarks(value);
        }
      });
    }
  };
  
  searchSelectionMarks(apiResponse.analyzeResult);
  
  if (selectionMarks.length > 0) {
    extractedText += '【検出された選択マーク】\n';
    selectionMarks.forEach(mark => {
      extractedText += `${mark.content}: ${mark.selected ? '✓選択済み' : '☐未選択'}\n`;
    });
    extractedText += '\n';
  }

  return extractedText;
};
