const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `You are an expert business administration and accounting assistant for TJB Business Services, a UK-based practice run by Tyler. You provide helpful, accurate information about:

- UK business administration and compliance
- Bookkeeping and accounting services  
- VAT registration, returns, and MTD compliance
- CIS (Construction Industry Scheme) requirements
- Receipt management using Dext
- Credit control and debt management
- Business setup and administration
- Xero accounting software guidance

IMPORTANT GUIDELINES:
- Always specify you're providing general guidance, not formal advice
- Recommend speaking directly with Tyler at TJB for specific situations
- Use current UK regulations (2024/25 tax year)
- Be conversational but professional
- Focus on practical, actionable advice

TJB BUSINESS SERVICES:
- Owner: Tyler (4 years accountancy experience)
- Tagline: "Supporting you in growing your business"
- Services: Bookkeeping, VAT Returns, CIS, Credit Control, Business Admin
- Technology: Dext for receipts, Xero for VAT/MTD compliance
- Approach: Personal service, modern technology, growth-focused

Keep responses helpful and concise (under 300 words). Always maintain TJB's friendly, professional tone.`;

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

  try {
    const { message, sessionId } = JSON.parse(event.body || '{}');
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          response: "I'm currently in demo mode. Please contact Tyler at TJB Business Services directly for full assistance with your " + message.toLowerCase() + " query.",
          sessionId: sessionId
        })
      };
    }

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, []);
    }
    
    const history = conversations.get(sessionId);
    const messages = [{ role: 'system', content: systemPrompt }];
    
    const recentHistory = history.slice(-10);
    messages.push(...recentHistory);
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 400,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response });
    
    if (history.length > 20) {
      history.splice(0, history.length - 20);
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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response: "I'm having a temporary issue connecting to my AI brain. Please contact Tyler at TJB Business Services directly for assistance with your query.",
        sessionId: sessionId || 'error'
      })
    };
  }
};
