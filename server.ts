import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const cliArgs = process.argv.slice(2)
let configuredPort = Number(process.env.PORT || 3000)

for (let i = 0; i < cliArgs.length; i += 1) {
  const arg = cliArgs[i]

  if ((arg === '--port' || arg === '-p') && cliArgs[i + 1]) {
    configuredPort = Number(cliArgs[i + 1])
    i += 1
  } else if (arg.startsWith('--port=')) {
    configuredPort = Number(arg.split('=')[1])
  }
}

const app = express()
const PORT = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3000

app.use(express.json())

// Initialize GoogleGenAI server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
})

// System instruction giving the chatbot its specific brand role
const AUREL_CONCIERGE_SYSTEM_INSTRUCTION = `You are the AUREL Bespoke Gifting Concierge and Memory Stylist for the luxury brand AUREL.
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

// Chat API Route (supports multi turn conversation history)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    // Default to gemini-3.5-flash as specified for general chat tasks
    const targetModel = model || 'gemini-3.8-flash'

    // Format multi turn conversation history for @google/genai
    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        systemInstruction: AUREL_CONCIERGE_SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    })

    const replyText = response.text || 'I am here to help you craft an unforgettable keepsake for your cherished moments.'

    // Ensure no hyphens or semicolons in response
    const cleanReply = replyText.replace(/[-;]/g, ' ')

    return res.json({ reply: cleanReply })
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    return res.status(500).json({
      error: 'Unable to communicate with concierge service at this time',
      details: error.message || 'Unknown error'
    })
  }
})

// Mount Vite or serve static
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')))
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'))
    })
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`AUREL Server running on http://0.0.0.0:${PORT}`)
  })
}

startServer()
