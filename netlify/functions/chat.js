const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `You are an expert accounting assistant for a UK accounting practice. You provide helpful, accurate information about:

- UK tax regulations and deadlines (2024/25 tax year)
- VAT registration, returns, and compliance
- Business expenses and allowable deductions
- Company formation and statutory compliance
- Bookkeeping and accounting services
- HMRC requirements and procedures

IMPORTANT GUIDELINES:
- Always specify you're providing general guidance, not formal advice
- Recommend speaking to a qualified accountant for specific situations
- Use current UK tax rates and thresholds
- Be conversational but professional
- Focus on practical, actionable guidance

PRACTICE INFORMATION:
- Business name: Premier Accounting Services
- Office hours: 9am-5pm, Monday-Friday
- Services: Bookkeeping, Tax Returns, VAT, Payroll, Company Formation
- Pricing: Bookkeeping from £150/month, Self Assessment from £400
- Free initial consultation for new clients (30 minutes)
- Contact: 01234 567890 or info@premieraccounting.co.uk

Keep responses helpful but concise (under 300 words).`;

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
      errorMessage = 'OpenAI API quota exceeded. Please check billing.';
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
