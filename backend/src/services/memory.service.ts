import OpenAI from 'openai';
import Memory from '../models/Memory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Asynchronously extract and save user facts after they send a message
export const extractAndStoreMemories = async (userId: string, userMessage: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a precise memory extraction engine. Analyze the user statement. If the user states a distinct, persistent personal fact about themselves, their preferences, their life, or their job (e.g. "I am a student", "I live in Delhi", "I hate mushrooms", "My name is Ritik"), extract it into a short, concise, permanent third-person fact (e.g. "User is a student in Delhi"). If no new personal fact is presented, return the strict string "NONE" and nothing else. Output facts ONLY as a pure JSON array format like ["Fact 1", "Fact 2"] or exactly "NONE".'
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 150
    });

    const resultString = response.choices[0].message.content?.trim();

    if (!resultString || resultString === 'NONE') return;

    // Parse the JSON array
    let factsArray: string[] = [];
    try {
      if (resultString.startsWith('[')) {
        factsArray = JSON.parse(resultString);
      }
    } catch {
       return;
    }

    // Save them to DB if unique enough
    for (const fact of factsArray) {
      if (typeof fact === 'string' && fact.trim().length > 3) {
        // Basic deduplication check
        const existing = await Memory.findOne({ userId, fact: fact.trim() });
        if (!existing) {
          await Memory.create({ userId, fact: fact.trim() });
        }
      }
    }

  } catch (error) {
    console.error('Failed to extract memories:', error);
  }
};

// Retrieve memory block for system prompt
export const getUserMemoriesString = async (userId: string): Promise<string> => {
  try {
    const memories = await Memory.find({ userId }).sort({ createdAt: 1 }).limit(50);
    if (memories.length === 0) return '';
    
    const factList = memories.map(m => `- ${m.fact}`).join('\n');
    return `\n\n--- WHAT YOU KNOW ABOUT THE USER ALREADY ---\n${factList}\nIncorporate these facts implicitly into your answers to personalize the experience.`;
  } catch (error) {
    console.error('Failed to get memories:', error);
    return '';
  }
};

// API Endpoint hooks
export const getAllUserMemories = async (userId: string) => {
  return Memory.find({ userId }).sort({ createdAt: -1 });
};

export const deleteUserMemory = async (memoryId: string) => {
  return Memory.findByIdAndDelete(memoryId);
};
