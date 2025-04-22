import axios from 'axios';

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
    if (config.modelId) {
      // Custom model
      apiUrl = `${config.endpoint}/formrecognizer/documentModels/${config.modelId}:analyze?api-version=2023-07-31`;
    } else {
      // Default prebuilt model
      apiUrl = `${config.endpoint}/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31`;
    }

    // First, submit the document for analysis
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Ocp-Apim-Subscription-Key': config.apiKey
      }
    });

    // Get the operation location from the response headers
    const operationLocation = response.headers['operation-location'];
    if (!operationLocation) {
      throw new Error('Azure APIから操作場所を取得できませんでした。');
    }

    // Poll for results
    let resultResponse;
    let complete = false;
    let retries = 0;
    const maxRetries = 30; // Maximum number of polling attempts

    while (!complete && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
      resultResponse = await axios.get(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': config.apiKey
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
      throw new Error('OCR処理がタイムアウトしました。');
    }

    return resultResponse.data;
  } catch (error) {
    console.error('Azure API error:', error);
    throw new Error(`Azure OCR処理中にエラーが発生しました: ${error.message || error}`);
  }
};

/**
 * Extract text content from Azure Document Intelligence API response
 * @param {Object} apiResponse - The API response from Azure
 * @returns {string} - The extracted text content
 */
export const extractTextFromAzureResponse = (apiResponse) => {
  if (!apiResponse || !apiResponse.analyzeResult) {
    return '';
  }

  const { paragraphs, tables } = apiResponse.analyzeResult;
  let extractedText = '';

  // Extract text from paragraphs
  if (paragraphs && paragraphs.length > 0) {
    extractedText += paragraphs.map(p => p.content).join('\n\n');
  }

  // Extract text from tables if available
  if (tables && tables.length > 0) {
    extractedText += '\n\n表形式データ:\n';
    
    tables.forEach((table, tableIndex) => {
      extractedText += `\n表 ${tableIndex + 1}:\n`;
      
      // Create a 2D array to hold the table data
      const cells = table.cells || [];
      const tableData = [];
      
      // Initialize the table data structure
      const rowCount = Math.max(...cells.map(cell => cell.rowIndex)) + 1;
      const colCount = Math.max(...cells.map(cell => cell.columnIndex)) + 1;
      
      for (let i = 0; i < rowCount; i++) {
        tableData[i] = Array(colCount).fill('');
      }
      
      // Fill in the table data
      cells.forEach(cell => {
        if (cell.content) {
          tableData[cell.rowIndex][cell.columnIndex] = cell.content;
        }
      });
      
      // Convert the table data to a string
      tableData.forEach(row => {
        extractedText += row.join(' | ') + '\n';
      });
    });
  }

  return extractedText;
};
