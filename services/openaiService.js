const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze extracted receipt text and intelligently fill expense form fields
   * @param {string} extractedText - Text extracted from receipt via OCR
   * @param {Array} availableCategories - Available expense categories from database
   * @returns {Object} Structured expense data
   */
  async analyzeReceiptText(extractedText, availableCategories = []) {
    try {
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text extracted from receipt');
      }

      // Prepare category options for the AI - show available categories clearly
      const categoryOptions = availableCategories.length > 0 
        ? availableCategories.map(cat => `${cat.icon} ${cat.category}`).join(', ')
        : 'Food, Transportation, Shopping, Bills & Utilities, Healthcare, Entertainment, Education, Travel';
      
      const prompt = `You are an AI assistant that analyzes receipt text and extracts expense information. 

Receipt Text:
"${extractedText}"

Available Expense Categories: ${categoryOptions}

Please analyze the receipt text and extract the following information in JSON format:
{
  "amount": number (extract the TOTAL amount paid, prioritize "Total", "Grand Total", "Amount to Pay", "Net Amount" over "Subtotal", return null if not found),
  "date": "YYYY-MM-DD" (extract the transaction date, return null if not found),
  "category": "category_name" (select the most appropriate category from the available options, return null if uncertain),
  "paymentMethod": "upi|card|cash|net_banking" (detect payment method from text, return null if not clear),
  "description": "string" (extract merchant name or brief description, max 100 chars, return null if not found),
  "confidence": number (0-1 confidence score for the extraction)
}

CRITICAL GUIDELINES:
1. For amount: PRIORITIZE these keywords in order:
   - "TOTAL" or "Total" (highest priority)
   - "Grand Total" or "Net Total" 
   - "Amount to Pay" or "Amount Due"
   - "Final Amount" or "Payable Amount"
   - AVOID "Subtotal", "Tax", "Service Charge" unless they are the final amount
   - Look for ₹, Rs, INR symbols

2. For date: Look for date patterns like DD-MM-YYYY, DD/MM/YYYY, or "Date:" followed by date

3. For category: CRITICAL - Analyze merchant name and items purchased:
   - "RESTAURANT NAME" + hamburger/fries/soda = "Food & Dining" (NOT Education!)
   - "UTENSIL EMPORIUM" + forks/spoons/knives = "Shopping" (NOT Education!)
   - "THE CORNER CAFE" + coffee/croissants/sandwich = "Food & Dining" (NOT Education!)
   - ANY RESTAURANT/CAFE + food items = "Food & Dining"
   - ANY SHOP/STORE + products/utensils/tools = "Shopping"
   - HOSPITAL/CLINIC + medical = "Healthcare"
   - SCHOOL/COLLEGE + fees/books = "Education"
   - HOTEL + accommodation = "Housing"
   - TRANSPORT/TAXI + travel = "Transportation"
   - BILLS/UTILITIES + services = "Utilities"
   - ENTERTAINMENT + movies/games = "Entertainment"
   - FINANCIAL + loans/insurance = "Financial"
   
   SPECIFIC EXAMPLES:
   - "RESTAURANT NAME" with hamburger, fries, soda = "Food & Dining"
   - "UTENSIL EMPORIUM" with forks, spoons, knives = "Shopping"
   - "THE CORNER CAFE" with coffee, croissants = "Food & Dining"
   - "McDonald's" with burger, fries = "Food & Dining"
   - "Amazon" with electronics = "Shopping"
   - "Uber" with ride = "Transportation"

4. For payment method: Look for UPI, Card, Cash, Net Banking keywords

5. For description: Extract merchant name or main purchase description

6. Be conservative - return null for uncertain extractions
7. Amount should be a number (not string)
8. Return valid JSON only, no additional text`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing receipt text and extracting structured expense data. CRITICAL RULES: 1) Always prioritize TOTAL amounts over subtotals, taxes, or service charges. 2) For categories, analyze the MERCHANT NAME and ITEMS PURCHASED together - 'RESTAURANT NAME' with hamburger/fries = 'Food & Dining', 'UTENSIL EMPORIUM' with forks/spoons = 'Shopping', NEVER 'Education' unless it's actually a school/university receipt. 3) Match business type to category. 4) If no explicit TOTAL is found, calculate subtotal + tax. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Parse JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText);
        throw new Error('Invalid response format from AI');
      }

      // Validate and clean the response
      const validatedData = this.validateExtractedData(extractedData, availableCategories);
      
      return validatedData;

    } catch (error) {
      console.error('OpenAI Service Error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Validate and clean extracted data
   */
  validateExtractedData(data, availableCategories) {
    const validated = {
      amount: null,
      date: null,
      category: null,
      paymentMethod: null,
      description: null,
      confidence: 0
    };

    // Validate amount
    if (data.amount && typeof data.amount === 'number' && data.amount > 0) {
      validated.amount = data.amount;
    }

    // Validate date
    if (data.date && typeof data.date === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(data.date)) {
        validated.date = data.date;
      }
    }

    // Validate category
    if (data.category && availableCategories.length > 0) {
      const categoryExists = availableCategories.some(cat => 
        cat.category.toLowerCase() === data.category.toLowerCase()
      );
      if (categoryExists) {
        validated.category = data.category;
      }
    }

    // Validate payment method
    const validPaymentMethods = ['upi', 'card', 'cash', 'net_banking'];
    if (data.paymentMethod && validPaymentMethods.includes(data.paymentMethod.toLowerCase())) {
      validated.paymentMethod = data.paymentMethod.toLowerCase();
    }

    // Validate description
    if (data.description && typeof data.description === 'string') {
      validated.description = data.description.trim().substring(0, 100);
    }

    // Validate confidence
    if (data.confidence && typeof data.confidence === 'number') {
      validated.confidence = Math.max(0, Math.min(1, data.confidence));
    }

    return validated;
  }

  /**
   * Get enhanced merchant information for better categorization
   */
  async getMerchantCategory(merchantName) {
    try {
      if (!merchantName || merchantName.trim().length === 0) {
        return null;
      }

      const prompt = `Analyze this merchant name and suggest the most appropriate expense category:

Merchant: "${merchantName}"

Categories: Food & Dining, Utilities, Housing, Transportation, Healthcare, Education, Entertainment, Shopping, Financial, Miscellaneous

Respond with just the category name that best fits this merchant.`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert at categorizing merchants. Respond with just the category name."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      return completion.choices[0].message.content.trim();

    } catch (error) {
      console.error('Merchant categorization error:', error);
      return null;
    }
  }

  /**
   * Analyze extracted text specifically for category selection
   * @param {string} extractedText - Text from OCR
   * @param {Array} availableCategories - Available category names
   * @returns {Object} Category analysis result
   */
  async analyzeCategoryOnly(extractedText, availableCategories) {
    try {
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text extracted from receipt');
      }

      const categoryOptions = availableCategories.join(', ');
      
      const prompt = `You are an AI assistant that analyzes receipt text and selects the most appropriate expense category.

Receipt Text:
"${extractedText}"

Available Categories: ${categoryOptions}

Please analyze the receipt text and select the most appropriate category from the available options.

CRITICAL GUIDELINES:
1. Analyze the MERCHANT NAME and ITEMS PURCHASED together
2. "RESTAURANT NAME" + hamburger/fries/soda = "Food & Dining"
3. "UTENSIL EMPORIUM" + forks/spoons/knives = "Shopping"
4. "THE CORNER CAFE" + coffee/croissants/sandwich = "Food & Dining"
5. HOSPITAL/CLINIC + medical items = "Healthcare"
6. SCHOOL/COLLEGE + fees/books = "Education"
7. TRANSPORT/TAXI + travel = "Transportation"
8. BILLS/UTILITIES + services = "Utilities"
9. ENTERTAINMENT + movies/games = "Entertainment"
10. FINANCIAL + loans/insurance = "Financial"

Return ONLY the exact category name from the available options, nothing else.`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing receipt text and selecting the correct expense category. You must return ONLY the exact category name from the available options. Do not include any additional text or explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim();
      
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      // Validate that the AI response is one of the available categories
      const selectedCategory = availableCategories.find(cat => 
        cat.toLowerCase() === aiResponse.toLowerCase()
      );

      if (!selectedCategory) {
        console.log('AI selected invalid category:', aiResponse);
        console.log('Available categories:', availableCategories);
        throw new Error(`AI selected invalid category: ${aiResponse}`);
      }

      console.log('✅ AI selected category:', selectedCategory);

      return {
        category: selectedCategory,
        confidence: 0.9 // High confidence since we validated it
      };

    } catch (error) {
      console.error('Category Analysis Error:', error);
      throw new Error(`Category analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze extracted income document text and intelligently fill income form fields
   * @param {string} extractedText - Text extracted from income document via OCR
   * @param {Array} availableCategories - Available income categories from database
   * @returns {Object} Structured income data
   */
  async analyzeIncomeDocumentText(extractedText, availableCategories = []) {
    try {
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text extracted from income document');
      }

      // Prepare category options for the AI - show available categories clearly
      const categoryOptions = availableCategories.length > 0 
        ? availableCategories.map(cat => `${cat.icon} ${cat.name}`).join(', ')
        : 'Salary, Freelance, Business, Investments, Rental Income, Sales, Bonus, Other';
      
      const prompt = `You are an AI assistant that analyzes income document text and extracts income information. 

Document Text:
"${extractedText}"

Available Income Categories: ${categoryOptions}

Please analyze the document text and extract the following information in JSON format:
{
  "amount": number (extract the income amount, prioritize "Total", "Amount", "Salary", "Payment", return null if not found),
  "date": "YYYY-MM-DD" (extract the income date, return null if not found),
  "category": "category_name" (select the most appropriate category from the available options, return null if uncertain),
  "subcategory": "subcategory_name" (suggest appropriate subcategory based on the income type, return null if uncertain),
  "paymentMethod": "upi|card|cash|bank_transfer" (detect payment method from text, return null if not clear),
  "description": "string" (extract source name or brief description, max 100 chars, return null if not found),
  "confidence": number (0-1 confidence score for the extraction)
}

CRITICAL GUIDELINES FOR CATEGORIZATION:
1. For amount: PRIORITIZE these keywords in order:
   - "Total" or "Amount" (highest priority)
   - "Salary" or "Payment"
   - "Income" or "Earnings"
   - Look for ₹, Rs, INR symbols
   - Look for numerical values that represent income

2. For date: Look for date patterns like DD-MM-YYYY, DD/MM/YYYY, or "Date:" followed by date

3. For category: Analyze the source and type of income CAREFULLY:
   - "Salary" + company name = "Salary" (employment income)
   - "Freelance" + project = "Freelance" (contract work)
   - "Business" + revenue = "Business" (business income)
   - "Investment" + returns = "Investments" (investment gains)
   - "Rental" + property = "Rental Income" (property rental)
   - "Sales" + products = "Sales" (selling goods/services)
   - "Government" + benefits = "Government Benefits" (pensions, subsidies)
   - "Gifts" + received = "Gifts" (gift money)
   - "Agriculture" + farming = "Agriculture" (farming income)

4. For subcategory: Suggest appropriate subcategory based on income type:
   - Salary: "Monthly Salary", "Bonus", "Overtime", "Commission"
   - Freelance: "Consulting", "Design", "Development", "Writing"
   - Business: "Sales Revenue", "Service Income", "Product Sales"
   - Investments: "Dividends", "Capital Gains", "Interest", "Rental Income"
   - Rental Income: "Residential", "Commercial", "Parking"
   - Sales: "Online Sales", "Retail Sales", "Wholesale"
   - Government Benefits: "Pension", "Subsidy", "Grant", "Unemployment"
   - Gifts: "Cash Gift", "Voucher", "Item Gift"
   - Agriculture: "Crop Sales", "Livestock", "Dairy"

5. For payment method: Look for UPI, Card, Cash, Bank Transfer keywords

6. For description: Extract source name or income description

7. Be conservative - return null for uncertain extractions
8. Amount should be a number (not string)
9. Return valid JSON only, no additional text`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing income document text and extracting structured income data. CRITICAL RULES: 1) Always prioritize TOTAL amounts over partial amounts. 2) For categories, analyze the SOURCE and TYPE of income together - 'Salary' with company name = 'Salary', 'Freelance' with project = 'Freelance', 'Business' with revenue = 'Business', 'Investment' with returns = 'Investments', 'Rental' with property = 'Rental Income', 'Sales' with products = 'Sales', 'Government' with benefits = 'Government Benefits', 'Gifts' with received = 'Gifts', 'Agriculture' with farming = 'Agriculture'. 3) Match income source to category. 4) Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Parse JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText);
        throw new Error('Invalid response format from AI');
      }

      // Validate and clean the response
      const validatedData = this.validateExtractedIncomeData(extractedData, availableCategories);
      
      return validatedData;

    } catch (error) {
      console.error('OpenAI Service Error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Validate and clean extracted income data
   */
  validateExtractedIncomeData(data, availableCategories) {
    const validated = {
      amount: null,
      date: null,
      category: null,
      subcategory: null,
      paymentMethod: null,
      description: null,
      confidence: 0
    };

    // Validate amount
    if (data.amount && typeof data.amount === 'number' && data.amount > 0) {
      validated.amount = data.amount;
    }

    // Validate date
    if (data.date && typeof data.date === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(data.date)) {
        validated.date = data.date;
      }
    }

    // Validate category
    if (data.category && availableCategories.length > 0) {
      const categoryExists = availableCategories.some(cat => 
        cat.name.toLowerCase() === data.category.toLowerCase()
      );
      if (categoryExists) {
        validated.category = data.category;
      }
    }

    // Validate subcategory
    if (data.subcategory && typeof data.subcategory === 'string') {
      validated.subcategory = data.subcategory.trim();
    }

    // Validate payment method
    const validPaymentMethods = ['upi', 'card', 'cash', 'bank_transfer'];
    if (data.paymentMethod && validPaymentMethods.includes(data.paymentMethod.toLowerCase())) {
      validated.paymentMethod = data.paymentMethod.toLowerCase();
    }

    // Validate description
    if (data.description && typeof data.description === 'string') {
      validated.description = data.description.trim().substring(0, 100);
    }

    // Validate confidence
    if (data.confidence && typeof data.confidence === 'number') {
      validated.confidence = Math.max(0, Math.min(1, data.confidence));
    }

    return validated;
  }
}

module.exports = new OpenAIService();
