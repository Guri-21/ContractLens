import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function callClaude(systemPrompt: string, userMessage: string, jsonSchema: any) {
  if (process.env.MOCK_MODE === 'true') {
    console.log('Mock mode enabled, returning placeholder data.');
    return {}; // Placeholder for mock responses
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ],
    tools: [
      {
        name: 'extract_structured_data',
        description: 'Extracts data matching the requested schema',
        input_schema: jsonSchema,
      }
    ],
    tool_choice: { type: 'tool', name: 'extract_structured_data' },
  });

  const toolCall = response.content.find((block) => block.type === 'tool_use');
  if (toolCall && toolCall.type === 'tool_use') {
    return toolCall.input;
  }
  
  throw new Error("Failed to extract structured data from Claude.");
}
