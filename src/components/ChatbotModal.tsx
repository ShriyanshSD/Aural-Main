import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Send, Sparkles, RefreshCw, Trash2, User, ArrowRight } from 'lucide-react'
import { AuthUser } from '../types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatbotModalProps {
  isOpen: boolean
  showLauncher?: boolean
  onClose: () => void
  onOpen: () => void
  isDarkMode: boolean
  user: AuthUser | null
  isAuthLoaded: boolean
  onNavigateToBuilder?: () => void
}

const welcomeMessage = (): ChatMessage => ({
  id: 'msg_welcome',
  role: 'assistant',
  content: 'Welcome to AUREL. I am AUREL Assistant, here to help you find thoughtful gifts and create meaningful keepsakes. What special moment would you like to celebrate?',
  timestamp: 'Just now'
})

export const ChatbotModal: React.FC<ChatbotModalProps> = ({
  isOpen,
  showLauncher = true,
  onClose,
  onOpen,
  isDarkMode,
  user,
  isAuthLoaded,
  onNavigateToBuilder
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()])
  const [inputPrompt, setInputPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousUserIdRef = useRef<string | null>(user?.id ?? null)
  const isPreparingConversation = !isAuthLoaded || isHistoryLoading

  const quickPrompts = [
    'Write a dedication for 1st anniversary magazine',
    'Recommend items for a birthday keepsake hamper',
    'Explain the difference between Matte and Gloss finish',
    'Suggest a thoughtful forever blossom gift'
  ]

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, isOpen, isLoading])

  useEffect(() => {
    const nextUserId = user?.id ?? null
    if (previousUserIdRef.current !== nextUserId) {
      setMessages([welcomeMessage()])
      setHistoryError('')
      previousUserIdRef.current = nextUserId
    }
  }, [user?.id])

  useEffect(() => {
    if (!isOpen || !isAuthLoaded || !user) return

    let cancelled = false
    setIsHistoryLoading(true)
    setHistoryError('')
    fetch('/api/chat/history')
      .then(async response => {
        if (!response.ok) throw new Error(`Unable to load saved chat history (${response.status}).`)
        return await response.json() as {
          messages: Array<{ id: string | number; role: 'user' | 'assistant'; content: string; created_at: string }>
        }
      })
      .then(data => {
        if (cancelled) return
        const savedMessages = data.messages.map(message => ({
          id: String(message.id),
          role: message.role,
          content: message.content,
          timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
        setMessages(savedMessages.length ? savedMessages : [welcomeMessage()])
      })
      .catch(error => {
        if (cancelled) return
        console.error('Unable to load saved chat history:', error)
        setHistoryError('Your saved chat history could not be loaded. You can still chat, but new messages may not be saved.')
      })
      .finally(() => {
        if (!cancelled) setIsHistoryLoading(false)
      })

    return () => { cancelled = true }
  }, [isOpen, isAuthLoaded, user?.id])

  const handleSendMessage = async (userTextToSend?: string) => {
    const text = (userTextToSend || inputPrompt).trim()
    if (!text || isLoading || isPreparingConversation) return

    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMessage: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: timeString
    }

    const updatedHistory = [...messages, userMessage]
    setMessages(updatedHistory)
    setInputPrompt('')
    setIsLoading(true)

    try {
      // Map to Gemini role format
      const payload = updatedHistory.map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: payload,
          model: selectedModel
        })
      })

      if (!response.ok) throw new Error(`AUREL Assistant request failed (${response.status}).`)

      const data = await response.json() as { reply?: string }
      const assistantMessage: ChatMessage = {
        id: 'assistant_' + Date.now(),
        role: 'assistant',
        content: data.reply || 'I would be happy to help you create a meaningful keepsake. Tell me what you would like to celebrate.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, assistantMessage])
      if (user) {
        try {
          const saveResponse = await fetch('/api/chat/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [userMessage, assistantMessage].map(message => ({
                role: message.role,
                content: message.content
              }))
            })
          })
          if (!saveResponse.ok) throw new Error(`Saving chat history failed (${saveResponse.status}).`)
          setHistoryError('')
        } catch (error) {
          console.error('Unable to save chat history:', error)
          setHistoryError('Your reply arrived, but this exchange could not be saved to your account.')
        }
      }
    } catch (error) {
      console.error('AUREL Assistant request failed:', error)
      const fallbackErrorMessage: ChatMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: 'I could not connect just now. Please try sending your message again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, fallbackErrorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = async () => {
    if (isLoading || isPreparingConversation) return
    if (user) {
      try {
        const response = await fetch('/api/chat/history', { method: 'DELETE' })
        if (!response.ok) throw new Error(`Clearing chat history failed (${response.status}).`)
      } catch (error) {
        console.error('Unable to clear saved chat history:', error)
        setHistoryError('Your saved chat could not be cleared. Please try again.')
        return
      }
    }
    setHistoryError('')
    setMessages([welcomeMessage()])
  }

  return (
    <>
      {/* Floating AUREL Assistant button */}
      {showLauncher && <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onOpen}
        aria-label="Open AUREL Assistant"
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white shadow-xl hover:shadow-2xl transition-all flex items-center gap-2.5 group"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
        </span>
        <Sparkles className="w-5 h-5 text-white" />
        <span className="hidden sm:inline font-sans-body text-xs font-semibold tracking-wider uppercase">
          AUREL Assistant
        </span>
      </motion.button>}

      {/* Expandable Chatbot Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 isolate flex items-end justify-center pointer-events-none sm:items-center sm:justify-end sm:p-6">
            
            {/* Keep the backdrop behind the interactive chat panel. It does not dismiss the panel. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
              className="fixed inset-0 z-0 bg-black/40 pointer-events-auto"
            />

            {/* Chatbot Window */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 30, stiffness: 240 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="aurel-assistant-title"
              className={`relative z-10 pointer-events-auto w-full sm:w-[440px] h-[90dvh] sm:h-[650px] max-h-[95dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-colors duration-500 ${
                isDarkMode 
                  ? 'bg-[#1C1817] text-[#F3EBE6] border-[#382C29]' 
                  : 'bg-[#FAF7F2] text-[#2C2422] border-[#E8D4CB]'
              }`}
            >
              {/* AUREL Assistant header */}
              <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#B36D6D]/15 text-[#B36D6D] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif-title text-base font-medium tracking-wide flex min-w-0 items-center gap-2">
                      <span id="aurel-assistant-title" className="truncate">AUREL Assistant</span>
                      <span className="hidden shrink-0 text-[10px] uppercase font-semibold text-[#B36D6D] px-2 py-0.5 rounded-full bg-[#B36D6D]/10 sm:inline">
                        Gifting Assistant
                      </span>
                    </h3>
                    <p className="font-editorial text-xs text-[#8E7973] dark:text-[#A89791]">
                      Powered by Gemini Intelligence
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={handleClearChat}
                    disabled={isLoading || isPreparingConversation}
                    title="Clear conversation"
                    aria-label="Clear chat"
                    className={`p-2 rounded-full transition-colors ${
                      isDarkMode ? 'hover:bg-[#2A2321] text-[#A89791]' : 'hover:bg-[#EFE2DC] text-[#7A6762]'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onClose}
                    aria-label="Close AUREL Assistant"
                    className={`p-2 rounded-full transition-colors ${
                      isDarkMode ? 'hover:bg-[#2A2321] text-[#E0D2CB]' : 'hover:bg-[#EFE2DC] text-[#4A3B37]'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Model Speed Option Bar */}
              <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex flex-col items-start gap-2 text-[11px] bg-black/[0.01] sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[#8E7A74] dark:text-[#A79690]">
                  Gifting Model Mode:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.5-flash')}
                    disabled={isLoading || isPreparingConversation}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full transition-colors font-medium ${
                      selectedModel === 'gemini-3.5-flash'
                        ? 'bg-[#B36D6D] text-white'
                        : 'text-[#8E7A74] hover:text-[#B36D6D]'
                    }`}
                  >
                    <span className="sm:hidden">Creative</span>
                    <span className="hidden sm:inline">Gemini 3.5 Flash (Creative)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                    disabled={isLoading || isPreparingConversation}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full transition-colors font-medium ${
                      selectedModel === 'gemini-3.1-flash-lite'
                        ? 'bg-[#B36D6D] text-white'
                        : 'text-[#8E7A74] hover:text-[#B36D6D]'
                    }`}
                  >
                    <span className="sm:hidden">Fast</span>
                    <span className="hidden sm:inline">Flash Lite (Fast)</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Message Thread */}
              <div className="min-h-0 flex-1 touch-pan-y p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4">
                {isPreparingConversation && (
                  <div className="flex items-center gap-2 text-xs text-[#8E7A74]" role="status">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    {isAuthLoaded ? 'Loading your saved messages...' : 'Connecting your account...'}
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-[#B36D6D]/15 text-[#B36D6D] flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1 ${
                      msg.role === 'user'
                        ? 'bg-[#B36D6D] text-white rounded-br-xs shadow-xs'
                        : isDarkMode
                          ? 'bg-[#251E1C] border border-[#3C2E2B] text-[#EDE0DA] rounded-bl-xs'
                          : 'bg-[#FFFFFF] border border-[#E8D4CB] text-[#3A2D29] rounded-bl-xs shadow-xs'
                    }`}>
                      <p className="whitespace-pre-line">
                        {msg.content}
                      </p>
                      <span className={`text-[10px] block text-right pt-0.5 ${
                        msg.role === 'user' ? 'text-white/70' : 'text-[#9A8781]'
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-[#B36D6D] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {historyError && (
                  <p role="status" className="px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
                    {historyError}
                  </p>
                )}

                {/* Typing Indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-[#B36D6D] text-xs pl-9"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-editorial text-xs italic">
                      Styling your memory recommendations...
                    </span>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Inspiration Chips */}
              <div className="px-4 py-2 border-t border-black/5 dark:border-white/5 overflow-x-auto scrollbar-none flex gap-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading || isPreparingConversation}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border ${
                      isDarkMode
                        ? 'border-[#382C29] bg-[#221B1A] text-[#CBB9B2] hover:border-[#B36D6D]'
                        : 'border-[#DFC6BC] bg-[#FAF3EE] text-[#5C4A45] hover:border-[#B36D6D]'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder="Ask AUREL Assistant..."
                    disabled={isLoading || isPreparingConversation}
                    enterKeyHint="send"
                    autoComplete="off"
                    className={`min-w-0 flex-1 px-4 py-3 rounded-full text-base sm:text-xs transition-colors border focus:outline-hidden focus:border-[#B36D6D] ${
                      isDarkMode
                        ? 'bg-[#181413] border-[#382C29] text-[#EDE0DA]'
                        : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                    }`}
                  />

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!inputPrompt.trim() || isLoading || isPreparingConversation}
                    aria-label="Send message to AUREL Assistant"
                    className="touch-manipulation p-3 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] disabled:opacity-50 text-white shadow-md transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </form>

                {onNavigateToBuilder && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => {
                        onNavigateToBuilder()
                        onClose()
                      }}
                      className="text-[11px] text-[#B36D6D] hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                      <span>Ready to mix and match? Open Custom Gift Studio</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
