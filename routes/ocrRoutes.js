const express = require('express');
const router = express.Router();
const ocrService = require('../services/ocrService');

/**
 * POST /api/ocr/analyze-receipt
 * Analyze extracted receipt text with AI
 */
router.post('/analyze-receipt', async (req, res) => {
  try {
    const { extractedText, userId } = req.body;

    if (!extractedText || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: extractedText and userId'
      });
    }

    const result = await ocrService.analyzeReceiptText(extractedText, userId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Receipt analyzed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('OCR analysis endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during receipt analysis'
    });
  }
});

/**
 * GET /api/ocr/verify-storage
 * Verify receipts-v2 storage bucket exists
 */
router.get('/verify-storage', async (req, res) => {
  try {
    const result = await ocrService.verifyStorageBucket();
    
    if (result.success) {
      res.json({
        success: true,
        bucket: result.bucket,
        message: 'Storage bucket verified'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Storage verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify storage bucket'
    });
  }
});

/**
 * POST /api/ocr/analyze-category
 * Analyze extracted text specifically for category selection
 */
router.post('/analyze-category', async (req, res) => {
  try {
    const { extractedText, availableCategories, userId } = req.body;

    if (!extractedText || !availableCategories || !Array.isArray(availableCategories)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: extractedText and availableCategories'
      });
    }

    const result = await ocrService.analyzeCategoryOnly(extractedText, availableCategories, userId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Category analyzed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Category analysis endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during category analysis'
    });
  }
});

/**
 * POST /api/ocr/analyze-income-document
 * Analyze extracted income document text with AI
 */
router.post('/analyze-income-document', async (req, res) => {
  try {
    const { extractedText, userId } = req.body;

    if (!extractedText || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: extractedText and userId'
      });
    }

    const result = await ocrService.analyzeIncomeDocumentText(extractedText, userId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Income document analyzed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Income document analysis endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during income document analysis'
    });
  }
});

/**
 * POST /api/ocr/setup-storage
 * Create receipts-v2 storage bucket if it doesn't exist
 */
router.post('/setup-storage', async (req, res) => {
  try {
    const result = await ocrService.createStorageBucket();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Storage setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup storage bucket'
    });
  }
});

module.exports = router;
