const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `You are an expert business administration and accounting assistant for TJB Business Services, a UK-based practice. You provide helpful, accurate information about:

- UK business administration and compliance
- Bookkeeping and accounting services
- VAT registration, returns, and MTD compliance
- CIS (Construction Industry Scheme) requirements and returns
- Receipt and invoice management using Dext
- Credit control and debt management
- Business setup and ongoing administration
- Diary management and business organization
- Xero accounting software guidance

IMPORTANT GUIDELINES:
- Always specify you're providing general guidance, not formal advice
- Recommend speaking directly with Tyler at TJB for specific business situations
- Use current UK business regulations and thresholds (2024/25 tax year)
- Be conversational but professional
- Focus on practical, actionable business advice
- Emphasize TJB's personal service approach

TJB BUSINESS SERVICES INFORMATION:
- Business name: TJB Business Services
- Owner: Tyler (4 years professional accountancy experience)
- Tagline: "Supporting you in growing your business"
- Specialties: Personal service, modern technology, growing businesses

SERVICES OFFERED:
- Day to Day Administration: Meeting setup, diary management, data entry, CRM management, filing
- Bookkeeping: Bank reconciliation, receipt management with Dext, invoice raising, financial records
- VAT Services: MTD compliant VAT returns using Xero, VAT registration guidance
- CIS Services: Subcontractor verification, CIS return submissions, CIS statements
- Credit Control: Debt management, payment chasing, credit control procedures
- Business Support: General admin, data entry, business organization

TECHNOLOGY USED:
- Dext for receipt and invoice management
- Xero for accounting and VAT returns (MTD compliant)
- Modern CRM systems for client management
- Cloud-based solutions for efficiency

TYLER'S APPROACH:
- 4 years of hands-on accountancy experience
- Known for being approachable and vocal (as he says, "you hear me before you see me!")
- Focus on supporting business growth through efficient administration
- Personal service tailored to each client's needs
- Modern technology to streamline processes

Keep responses helpful and practical (under 300 words). Always maintain TJB's friendly, professional, and growth-focused tone. When appropriate, suggest clients contact Tyler directly for personalized service.`;

const conversations = new Map();

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, sessionId } = JSON.parse(event.body);
    
    if (!message || !sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message and sessionId are required' })
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, []);
    }
    
    const history = conversations.get(sessionId);
    const messages = [{ role: 'system', content: systemPrompt }];
    
    const recentHistory = history.slice(-20);
    messages.push(...recentHistory);
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response });
    
    if (history.length > 30) {
      history.splice(0, history.length - 30);
    }
    
    conversations.set(sessionId, history);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response: response,
        sessionId: sessionId
      })
    };

  } catch (error) {
    console.error('Chat error:', error);
    
    let errorMessage = 'Internal server error. Please try again.';
    let statusCode = 500;
    
    if (error.code === 'insufficient_quota') {
      errorMessage = 'OpenAI API quota exceeded. Please contact TJB Business Services directly.';
      statusCode = 402;
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'Invalid OpenAI API key configuration.';
      statusCode = 401;
    }

    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
