import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageSquare, X, Send, Sparkles, RefreshCw, Trash2, Bot, User, ArrowRight } from 'lucide-react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatbotModalProps {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
  isDarkMode: boolean
  onNavigateToBuilder?: () => void
}

export const ChatbotModal: React.FC<ChatbotModalProps> = ({
  isOpen,
  onClose,
  onOpen,
  isDarkMode,
  onNavigateToBuilder
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: 'Welcome to AUREL. I am your personal memory stylist and gifting concierge. Tell me who you are celebrating or what milestone you wish to commemorate, and together we will compose a gift made with love.',
      timestamp: 'Just now'
    }
  ])

  const [inputPrompt, setInputPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const quickPrompts = [
    'Write a dedication for 1st anniversary magazine',
    'Recommend items for a birthday keepsake hamper',
    'Explain the difference between Matte and Gloss finish',
    'Suggest a thoughtful forever blossom gift'
  ]

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isLoading])

  const handleSendMessage = async (userTextToSend?: string) => {
    const text = (userTextToSend || inputPrompt).trim()
    if (!text || isLoading) return

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

      if (!response.ok) {
        throw new Error('Failed to reach AUREL concierge service')
      }

      const data = await response.json()
      const assistantMessage: ChatMessage = {
        id: 'assistant_' + Date.now(),
        role: 'assistant',
        content: data.reply || 'I am delighted to help you create this memory. Let me know if you would like to explore specific custom hampers or magazines.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      console.error('Chat error:', err)
      const fallbackErrorMessage: ChatMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: 'I apologize, our concierge desk experienced a quiet moment of connection delay. Please feel free to ask again or reach out directly to our WhatsApp concierge.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, fallbackErrorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg_welcome_' + Date.now(),
        role: 'assistant',
        content: 'Welcome to AUREL. I am your personal memory stylist and gifting concierge. Tell me who you are celebrating, and together we will compose a gift made with love.',
        timestamp: 'Just now'
      }
    ])
  }

  return (
    <>
      {/* Floating Concierge Action Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onOpen}
        aria-label="Open AUREL AI Concierge"
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white shadow-xl hover:shadow-2xl transition-all flex items-center gap-2.5 group"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
        </span>
        <Sparkles className="w-5 h-5 text-white" />
        <span className="hidden sm:inline font-sans-body text-xs font-semibold tracking-wider uppercase">
          Concierge Stylist
        </span>
      </motion.button>

      {/* Expandable Chatbot Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-end sm:p-6">
            
            {/* Backdrop on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs sm:hidden pointer-events-auto"
            />

            {/* Chatbot Window */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className={`pointer-events-auto w-full sm:w-[440px] h-[85vh] sm:h-[650px] max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-colors duration-500 ${
                isDarkMode 
                  ? 'bg-[#1C1817] text-[#F3EBE6] border-[#382C29]' 
                  : 'bg-[#FAF7F2] text-[#2C2422] border-[#E8D4CB]'
              }`}
            >
              {/* Concierge Header */}
              <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#B36D6D]/15 text-[#B36D6D] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif-title text-base font-medium tracking-wide flex items-center gap-2">
                      <span>AUREL Concierge</span>
                      <span className="text-[10px] uppercase font-semibold text-[#B36D6D] px-2 py-0.5 rounded-full bg-[#B36D6D]/10">
                        Memory Stylist
                      </span>
                    </h3>
                    <p className="font-editorial text-xs text-[#8E7973] dark:text-[#A89791]">
                      Powered by Gemini Intelligence
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClearChat}
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
                    aria-label="Close concierge chat"
                    className={`p-2 rounded-full transition-colors ${
                      isDarkMode ? 'hover:bg-[#2A2321] text-[#E0D2CB]' : 'hover:bg-[#EFE2DC] text-[#4A3B37]'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Model Speed Option Bar */}
              <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] bg-black/[0.01]">
                <span className="text-[#8E7A74] dark:text-[#A79690]">
                  Gifting Model Mode:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.5-flash')}
                    className={`px-2.5 py-0.5 rounded-full transition-colors font-medium ${
                      selectedModel === 'gemini-3.5-flash'
                        ? 'bg-[#B36D6D] text-white'
                        : 'text-[#8E7A74] hover:text-[#B36D6D]'
                    }`}
                  >
                    Gemini 3.5 Flash (Creative)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                    className={`px-2.5 py-0.5 rounded-full transition-colors font-medium ${
                      selectedModel === 'gemini-3.1-flash-lite'
                        ? 'bg-[#B36D6D] text-white'
                        : 'text-[#8E7A74] hover:text-[#B36D6D]'
                    }`}
                  >
                    Flash Lite (Fast)
                  </button>
                </div>
              </div>

              {/* Scrollable Message Thread */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
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
                    disabled={isLoading}
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
              <div className="p-3 sm:p-4 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
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
                    placeholder="Ask about anniversary gifts, dedication quotes, finishes..."
                    disabled={isLoading}
                    className={`flex-1 px-4 py-3 rounded-full text-xs transition-colors border focus:outline-hidden focus:border-[#B36D6D] ${
                      isDarkMode
                        ? 'bg-[#181413] border-[#382C29] text-[#EDE0DA]'
                        : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                    }`}
                  />

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!inputPrompt.trim() || isLoading}
                    aria-label="Send message to concierge"
                    className="p-3 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] disabled:opacity-50 text-white shadow-md transition-all shrink-0"
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
