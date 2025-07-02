exports.handler = async (event, context) => {
  console.log('Function called with:', event.httpMethod, event.body);
  
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
    console.log('Received message:', message);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response: `Hi! You asked: "${message}". This is a test response from TJB Business Services. The function is working but OpenAI isn't connected yet.`,
        sessionId: sessionId || 'test'
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
