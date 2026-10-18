import { GoogleGenAI } from '@google/genai'
import type { IncomingMessage, ServerResponse } from 'node:http'

interface ChatMessage {
  role: string
  content: string
}

interface ChatPayload {
  messages?: ChatMessage[]
  model?: string
}

type ChatRequest = IncomingMessage & { body?: unknown }

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
})

const AUREL_ASSISTANT_SYSTEM_INSTRUCTION = `You are AUREL Assistant, a warm and thoughtful gifting assistant for the luxury brand AUREL.
Brand tagline: "Made With Love For You"
Core brand philosophy: AUREL helps people turn special moments into something they can hold, see, and remember.

Your capabilities and offerings at AUREL:
1. Custom Magazines for birthdays and anniversaries (available in Velvet Matte and Radiant Gloss finish). You help clients compose meaningful dedication notes, titles, and select photographs/chapters.
2. Artisanal Curated Gift Hampers (such as The Keepsake Romance Hamper and The Celebration Luxury Hamper).
3. Fresh Luxury Bouquets (Blush Garden Roses and Whispering Peonies) and Single Preserved Eternal Blossom Stems.
4. The Mix and Match Custom Gift Studio where users can design their own bespoke hamper with personalized boxes, botanical stems, scented candles, and treats.

Tone and style:
Warm, poetic, attentive, intimate, and refined. Never sound like a generic corporate bot.
STRICT RULE: Do not use hyphens and do not use semicolons anywhere in your responses. Use commas, spaces, or bullet points instead.
Assist the user with thoughtful gift recommendations, emotional dedication wording, and customized memory ideas.`

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export async function chatHandler(req: ChatRequest, res: ServerResponse): Promise<void> {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body as ChatPayload
      : {}
    const { messages, model } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      sendJson(res, 400, { error: 'Messages array is required' })
      return
    }

    const targetModel = model || 'gemini-2.8-flash'
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        systemInstruction: AUREL_ASSISTANT_SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    })

    const replyText = response.text || 'I am here to help you craft an unforgettable keepsake for your cherished moments.'
    const cleanReply = replyText.replace(/[-;]/g, ' ')

    sendJson(res, 200, { reply: cleanReply })
  } catch (error: unknown) {
    console.error('Gemini API Error:', error)
    sendJson(res, 500, {
      error: 'Unable to communicate with AUREL Assistant at this time',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
