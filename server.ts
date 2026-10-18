import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import {
  loginHandler,
  logoutHandler,
  chatHistoryHandler,
  resendSignupVerificationHandler,
  sessionHandler,
  signupHandler,
  verifySignupHandler
} from './auth-handler'

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
app.post('/api/auth/signup', (req, res) => signupHandler(req, res))
app.post('/api/auth/verify', (req, res) => verifySignupHandler(req, res))
app.post('/api/auth/resend-verification', (req, res) => resendSignupVerificationHandler(req, res))
app.post('/api/auth/login', (req, res) => loginHandler(req, res))
app.get('/api/auth/me', (req, res) => sessionHandler(req, res))
app.post('/api/auth/logout', (req, res) => logoutHandler(req, res))
app.all('/api/chat/history', (req, res) => chatHistoryHandler(req, res))

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

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
    const response = await ai.models.generateContent({
      model: model || 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: AUREL_ASSISTANT_SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    })

    const replyText = response.text || 'I am here to help you craft an unforgettable keepsake for your cherished moments.'
    return res.json({ reply: replyText.replace(/[-;]/g, ' ') })
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    return res.status(500).json({
      error: 'Unable to communicate with AUREL Assistant at this time',
      details: error.message || 'Unknown error'
    })
  }
})

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
