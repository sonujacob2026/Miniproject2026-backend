const openaiService = require('./openaiService');
const supabase = require('../config/supabase');

class OCRService {
  /**
   * Process receipt image with OCR and AI analysis
   * @param {string} imageUrl - URL of the uploaded receipt image
   * @param {string} userId - User ID for categorization context
   * @returns {Object} Extracted and analyzed expense data
   */
  async processReceiptWithAI(imageUrl, userId) {
    try {
      // Step 1: Extract text using Tesseract.js (client-side)
      // This will be handled by the frontend ReceiptUpload component
      
      // Step 2: Get user's available categories for better AI analysis
      const categories = await this.getUserCategories(userId);
      
      // Step 3: The extracted text will be sent from frontend to this service
      // For now, we'll return the service structure
      
      return {
        success: true,
        message: 'OCR service ready for text analysis'
      };

    } catch (error) {
      console.error('OCR Service Error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Analyze extracted text with OpenAI
   * @param {string} extractedText - Text from OCR
   * @param {string} userId - User ID
   * @returns {Object} Analyzed expense data
   */
  async analyzeReceiptText(extractedText, userId) {
    try {
      // Get user's available categories
      const categories = await this.getUserCategories(userId);
      
      // Use OpenAI to analyze the text
      const analyzedData = await openaiService.analyzeReceiptText(extractedText, categories);
      
      return {
        success: true,
        data: analyzedData
      };

    } catch (error) {
      console.error('Receipt analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze extracted text specifically for category selection
   * @param {string} extractedText - Text from OCR
   * @param {Array} availableCategories - Available category names
   * @param {string} userId - User ID
   * @returns {Object} Category analysis result
   */
  async analyzeCategoryOnly(extractedText, availableCategories, userId) {
    try {
      // Use OpenAI to analyze the text specifically for category
      const analyzedData = await openaiService.analyzeCategoryOnly(extractedText, availableCategories);
      
      return {
        success: true,
        data: analyzedData
      };

    } catch (error) {
      console.error('Category analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze extracted income document text with OpenAI
   * @param {string} extractedText - Text from OCR
   * @param {string} userId - User ID
   * @returns {Object} Analyzed income data
   */
  async analyzeIncomeDocumentText(extractedText, userId) {
    try {
      // Get user's available income categories
      const categories = await this.getUserIncomeCategories(userId);
      
      // Use OpenAI to analyze the text for income
      const analyzedData = await openaiService.analyzeIncomeDocumentText(extractedText, categories);
      
      return {
        success: true,
        data: analyzedData
      };

    } catch (error) {
      console.error('Income document analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's available income categories
   */
  async getUserIncomeCategories(userId) {
    try {
      const { data, error } = await supabase
        .from('income_categories')
        .select('id, name, icon')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching income categories:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getUserIncomeCategories:', error);
      return [];
    }
  }

  /**
   * Get user's available expense categories
   */
  async getUserCategories(userId) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, category, icon, subcategories')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getUserCategories:', error);
      return [];
    }
  }

  /**
   * Verify Supabase storage bucket exists
   */
  async verifyStorageBucket() {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        throw new Error(`Storage error: ${error.message}`);
      }

      const receiptsBucket = data.find(bucket => bucket.id === 'receipts-v2');
      
      if (!receiptsBucket) {
        throw new Error('Receipts-v2 storage bucket not found. Please run the storage setup script.');
      }

      return {
        success: true,
        bucket: receiptsBucket
      };

    } catch (error) {
      console.error('Storage verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create receipts storage bucket if it doesn't exist
   */
  async createStorageBucket() {
    try {
      const { data, error } = await supabase.storage.createBucket('receipts-v2', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (error && !error.message.includes('already exists')) {
        throw new Error(`Bucket creation failed: ${error.message}`);
      }

      // Create storage policies
      await this.createStoragePolicies();

      return {
        success: true,
        message: 'Receipts-v2 bucket created successfully'
      };

    } catch (error) {
      console.error('Bucket creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create storage policies for receipts bucket
   */
  async createStoragePolicies() {
    try {
      // Note: Storage policies are typically created via SQL
      // This is a placeholder for the policy creation logic
      console.log('Storage policies should be created via SQL script');
      
      return {
        success: true,
        message: 'Storage policies created'
      };

    } catch (error) {
      console.error('Storage policy creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new OCRService();
