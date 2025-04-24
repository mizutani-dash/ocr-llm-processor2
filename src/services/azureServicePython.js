/**
 * Python式Azure Document Intelligence/Form Recognizer APIクライアント実装
 * Azure SDKのPython実装を参考にしたJavaScript実装
 */
import axios from 'axios';

/**
 * Pythonコードの実装に近い形でAzure Document Intelligence APIを呼び出す
 * @param {File} file - 処理するファイル
 * @param {Object} config - 設定情報（endpoint, apiKey, modelId）
 * @returns {Promise<Object>} - 処理結果
 */
export const processWithAzurePython = async (file, config) => {
  if (!config || !config.endpoint || !config.apiKey) {
    throw new Error('Azure設定が不完全です。エンドポイントとAPIキーを入力してください。');
  }

  try {
    console.log('Pythonスタイルでドキュメント処理を開始...', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });

    // エンドポイントの末尾スラッシュを処理
    const endpoint = config.endpoint.endsWith('/') 
      ? config.endpoint.slice(0, -1) 
      : config.endpoint;

    // モデルID処理 - 空白の場合はprebuilt-layoutを使用
    const modelId = config.modelId && config.modelId.trim() !== '' 
      ? config.modelId.trim() 
      : 'prebuilt-layout';

    // Python SDKのようにContent-Typeを決定
    const contentType = getContentTypeFromFile(file);
    console.log(`Using content type: ${contentType}`);

    // ファイルをArrayBufferとして読み込む（PythonのSDKがファイルをバイナリとして扱うのと同様）
    const fileBuffer = await readFileAsArrayBuffer(file);

    // まずAPIのバージョンごとに異なるパスを試行
    const apiVersions = [
      {
        path: `${endpoint}/formrecognizer/v2.1/custom/models/${modelId}/analyze`,
        version: '2021-09-30',
        isCustomPath: true
      },
      {
        path: `${endpoint}/formrecognizer/custom/models/${modelId}/analyze`,
        version: '2021-09-30',
        isCustomPath: true
      },
      {
        path: `${endpoint}/formrecognizer/documentModels/${modelId}:analyze`,
        version: '2022-08-31',
        isCustomPath: false
      },
      {
        path: `${endpoint}/documentintelligence/documentModels/${modelId}:analyze`,
        version: '2023-07-31',
        isCustomPath: false
      }
    ];

    // 結果をポーリングする関数
    const pollForResult = async (resultUrl, apiKey) => {
      console.log('結果をポーリング中...', resultUrl);
      
      let complete = false;
      let retryCount = 0;
      const maxRetries = 60; // 最大60回試行（1分間隔で約60分）
      
      while (!complete && retryCount < maxRetries) {
        try {
          const response = await axios.get(resultUrl, {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey
            }
          });
          
          const status = response.data.status;
          console.log(`ポーリング状態: ${status}, 試行: ${retryCount + 1}`);
          
          if (status === 'succeeded') {
            console.log('ドキュメント処理が完了しました');
            return response.data;
          } else if (status === 'failed') {
            throw new Error(`処理が失敗しました: ${JSON.stringify(response.data.errors || {})}`);
          }
          
          // まだ処理中なので待機
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        } catch (error) {
          console.error('ポーリング中にエラーが発生しました:', error);
          throw error;
        }
      }
      
      if (retryCount >= maxRetries) {
        throw new Error('ポーリングがタイムアウトしました');
      }
    };

    // 各APIバージョンを試行
    let lastError = null;
    for (const api of apiVersions) {
      try {
        console.log(`APIパス試行: ${api.path}?api-version=${api.version}`);

        // クエリパラメータの構築
        let params = new URLSearchParams();
        params.append('api-version', api.version);
        
        // PDFの場合はすべてのページを処理
        if (file.type.includes('pdf')) {
          params.append('pages', '1-');
        }

        const url = `${api.path}?${params.toString()}`;
        
        // リクエスト送信
        const response = await axios.post(url, fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Ocp-Apim-Subscription-Key': config.apiKey
          }
        });

        console.log('APIリクエスト成功:', url);

        // レスポンスからOperation-Locationを取得
        const operationLocation = response.headers['operation-location'];
        if (!operationLocation) {
          throw new Error('Operation-Locationヘッダーが見つかりません');
        }

        // 結果をポーリング
        const result = await pollForResult(operationLocation, config.apiKey);
        
        return {
          modelId: modelId,
          apiUrl: url,
          analyzeResult: result.analyzeResult
        };
      } catch (error) {
        console.log(`APIリクエスト失敗 ${api.path}: ${error.message}`);
        
        // エラー詳細をログに記録
        if (error.response) {
          console.log('エラー詳細:', {
            status: error.response.status,
            data: JSON.stringify(error.response.data)
          });
        }
        
        lastError = error;
      }
    }

    // すべての試行が失敗
    console.error('すべてのAPI試行が失敗しました');
    throw new Error(`ドキュメント処理に失敗しました: ${lastError?.message || 'Unknown error'}`);

  } catch (error) {
    console.error('Azure処理エラー:', error);
    throw new Error(`ドキュメント処理中にエラーが発生しました: ${error.message}`);
  }
};

/**
 * ファイルからContent-Typeを取得する
 * @param {File} file - ファイル
 * @returns {string} - Content-Type
 */
function getContentTypeFromFile(file) {
  // ファイル自体のtype属性があればそれを使用
  if (file.type) {
    return file.type;
  }
  
  // 拡張子からContent-Typeを推測
  const filename = file.name.toLowerCase();
  const ext = filename.split('.').pop();
  
  const mimeTypes = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'tif': 'image/tiff',
    'tiff': 'image/tiff',
    'bmp': 'image/bmp',
    'heif': 'image/heif',
    'gif': 'image/gif'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * ファイルをArrayBufferとして読み込む
 * @param {File} file - ファイル
 * @returns {Promise<ArrayBuffer>} - ArrayBuffer
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Azure APIのレスポンスからテキストを抽出
 * @param {Object} result - API結果
 * @returns {string} - 抽出されたテキスト
 */
export const extractTextFromResult = (result) => {
  if (!result || !result.analyzeResult) {
    return '';
  }

  const { analyzeResult } = result;
  
  // content（全文テキスト）があればそれを使用
  if (analyzeResult.content) {
    return analyzeResult.content;
  }
  
  // paragraphs（段落）からテキストを抽出
  let extractedText = '';
  
  if (analyzeResult.paragraphs && analyzeResult.paragraphs.length > 0) {
    extractedText = analyzeResult.paragraphs.map(p => p.content).join('\n\n');
  }
  
  // tables（表）からもテキストを抽出
  if (analyzeResult.tables && analyzeResult.tables.length > 0) {
    extractedText += '\n\n表形式データ:\n';
    
    analyzeResult.tables.forEach((table, tableIndex) => {
      extractedText += `\n表 ${tableIndex + 1}:\n`;
      
      // 2D配列で表データを保持
      const cells = table.cells || [];
      const tableData = [];
      
      // テーブルデータ構造を初期化
      const rowCount = Math.max(...cells.map(cell => cell.rowIndex)) + 1;
      const colCount = Math.max(...cells.map(cell => cell.columnIndex)) + 1;
      
      for (let i = 0; i < rowCount; i++) {
        tableData[i] = Array(colCount).fill('');
      }
      
      // テーブルデータを埋める
      cells.forEach(cell => {
        if (cell.content) {
          tableData[cell.rowIndex][cell.columnIndex] = cell.content;
        }
      });
      
      // テーブルデータを文字列に変換
      tableData.forEach(row => {
        extractedText += row.join(' | ') + '\n';
      });
    });
  }
  
  return extractedText;
};

/**
 * モデル接続テスト - Pythonスタイル実装
 * @param {Object} config - 設定情報
 * @returns {Promise<Object>} - テスト結果
 */
export const testConnectionPython = async (config) => {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('Azure設定が不完全です。エンドポイントとAPIキーを入力してください。');
  }

  try {
    // エンドポイントの末尾スラッシュを処理
    const endpoint = config.endpoint.endsWith('/') 
      ? config.endpoint.slice(0, -1) 
      : config.endpoint;

    // 複数のAPIパスを試行
    const apiPaths = [
      {
        url: `${endpoint}/formrecognizer/v2.1/custom/models?api-version=2021-09-30`,
        version: 'v2.1'
      },
      {
        url: `${endpoint}/formrecognizer/custom/models?api-version=2021-09-30`,
        version: 'v2.0'
      },
      {
        url: `${endpoint}/formrecognizer/documentModels?api-version=2022-08-31`,
        version: '2022-08-31'
      },
      {
        url: `${endpoint}/documentintelligence/documentModels?api-version=2023-07-31`,
        version: '2023-07-31'
      }
    ];

    let modelsList = [];
    let successVersion = null;
    let lastError = null;

    // 各APIパスで接続テスト
    for (const api of apiPaths) {
      try {
        console.log(`接続テスト: ${api.url}`);
        const response = await axios.get(api.url, {
          headers: {
            'Ocp-Apim-Subscription-Key': config.apiKey
          }
        });

        console.log(`API接続成功 (${api.version})`);
        
        // レスポンス形式がAPIバージョンによって異なる
        if (api.version === 'v2.1' || api.version === 'v2.0') {
          // 古いバージョン形式
          modelsList = response.data.modelList || [];
          successVersion = api.version;
          break;
        } else {
          // 新しいバージョン形式
          modelsList = response.data.models || [];
          successVersion = api.version;
          break;
        }
      } catch (error) {
        console.log(`API接続失敗 (${api.version}): ${error.message}`);
        lastError = error;
      }
    }

    if (!successVersion) {
      throw new Error(`接続テストに失敗しました: ${lastError?.message || 'Unknown error'}`);
    }

    console.log(`利用可能なモデル数: ${modelsList.length}`);
    console.log('モデル一覧:', modelsList);

    // カスタムモデルのチェック
    let modelFound = false;
    let correctModelId = null;
    let modelDetails = null;

    if (config.modelId && config.modelId.trim() !== '') {
      const searchModelId = config.modelId.trim()
        .replace(/^.*[\/\\]/, '') // パス形式の接頭辞を削除
        .replace(/[?#].*$/, '');  // URLパラメータを削除

      console.log(`モデル検索: ${searchModelId}`);

      // 利用可能なモデルから検索
      for (const model of modelsList) {
        const modelId = successVersion === 'v2.1' || successVersion === 'v2.0'
          ? model.modelId
          : model.modelId || model.id;

        if (modelId === searchModelId) {
          modelFound = true;
          correctModelId = modelId;
          modelDetails = model;
          console.log('モデルが見つかりました:', modelDetails);
          break;
        } else if (modelId && modelId.includes(searchModelId)) {
          // 部分一致の場合は提案として記録
          correctModelId = modelId;
          console.log(`モデルID提案: ${correctModelId} (入力: ${searchModelId})`);
        }
      }
    }

    return {
      success: true,
      apiVersion: successVersion,
      modelsCount: modelsList.length,
      modelsList: modelsList.map(m => ({
        id: successVersion === 'v2.1' || successVersion === 'v2.0' ? m.modelId : (m.modelId || m.id),
        description: m.description || m.displayName || 'No description'
      })),
      modelFound,
      correctModelId,
      modelDetails
    };
  } catch (error) {
    console.error('接続テスト失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
