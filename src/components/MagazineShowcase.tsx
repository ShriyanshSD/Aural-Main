import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, FileText, LoaderCircle, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { FinishType, MagazineCustomization, MagazineUploadMetadata, StoreSettings } from '../types'
import { BrandLogo } from './BrandLogo'
import { MAGAZINE_PRICES, MagazinePageCount } from '../data/magazinePricing'

const magazineSamples = [
  {
    name: 'Magazine 1',
    images: [
      '/magazine-samples/magazine-1/1.png',
      '/magazine-samples/magazine-1/2.png',
      '/magazine-samples/magazine-1/3.png'
    ],
    previewUrl: 'https://heyzine.com/flip-book/4b27ca51f4.html'
  },
  {
    name: 'Magazine 2',
    images: [
      '/magazine-samples/magazine-2/1.png',
      '/magazine-samples/magazine-2/2.png'
    ],
    previewUrl: 'https://heyzine.com/flip-book/9bb79572b3.html'
  },
  {
    name: 'Magazine 3',
    images: [
      '/magazine-samples/magazine-3/1.png',
      '/magazine-samples/magazine-3/2.png',
      '/magazine-samples/magazine-3/3.png',
      '/magazine-samples/magazine-3/4.png'
    ],
    previewUrl: 'https://heyzine.com/flip-book/3355ae211e.html'
  }
]

interface MagazineShowcaseProps {
  isDarkMode: boolean
  userId?: string
  onRequireAuth: () => void
  onCustomizeMagazine: (customization: MagazineCustomization) => boolean
  settings: StoreSettings
  scrollRequestId: number
  onScrollToPreview: (target: HTMLElement) => void
}

interface MagazineDraft {
  customizationId: string
  recipientName: string
  occasionType: string
  customMessage: string
  additionalPreferences: string
  selectedFinish: FinishType
  selectedPageCount: MagazinePageCount
  photos: MagazineUploadMetadata[]
  messageFile: MagazineUploadMetadata | null
}

interface MagazineUploadLimits {
  maxPhotos: number
  maxPhotoSizeBytes: number
  maxTotalPhotoSizeBytes: number
  maxMessageSizeBytes: number
}

const magazineDraftStorageKey = 'aurel_magazine_customization_draft'
const magazinePhotoMimeTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
}

const readMagazineDraft = (): Partial<MagazineDraft> => {
  try {
    const stored = window.localStorage.getItem(magazineDraftStorageKey)
    if (!stored) return {}
    const value: unknown = JSON.parse(stored)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const draft = value as Partial<MagazineDraft>
    return {
      customizationId: typeof draft.customizationId === 'string' && /^[a-f0-9-]{36}$/i.test(draft.customizationId) ? draft.customizationId : undefined,
      recipientName: typeof draft.recipientName === 'string' ? draft.recipientName.slice(0, 100) : undefined,
      occasionType: typeof draft.occasionType === 'string' ? draft.occasionType.slice(0, 80) : undefined,
      customMessage: typeof draft.customMessage === 'string' ? draft.customMessage.slice(0, 10000) : undefined,
      additionalPreferences: typeof draft.additionalPreferences === 'string' ? draft.additionalPreferences.slice(0, 5000) : undefined,
      selectedFinish: draft.selectedFinish === 'matte' || draft.selectedFinish === 'gloss' ? draft.selectedFinish : undefined,
      selectedPageCount: draft.selectedPageCount === 4 || draft.selectedPageCount === 8 ? draft.selectedPageCount : undefined,
      photos: Array.isArray(draft.photos) ? draft.photos
        .filter(file => file && typeof file.id === 'string' && typeof file.originalFilename === 'string')
        .map(file => ({
          id: file.id,
          originalFilename: file.originalFilename,
          contentType: file.contentType,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt
        })) : undefined,
      messageFile: draft.messageFile && typeof draft.messageFile.id === 'string' && typeof draft.messageFile.originalFilename === 'string' ? draft.messageFile : null
    }
  } catch (error) {
    console.error('Unable to restore the saved magazine customization:', error)
    return {}
  }
}

export const MagazineShowcase: React.FC<MagazineShowcaseProps> = ({
  isDarkMode,
  onCustomizeMagazine,
  settings,
  userId,
  onRequireAuth,
  scrollRequestId,
  onScrollToPreview
}) => {
  const [initialDraft] = useState(readMagazineDraft)
  const [customizationId, setCustomizationId] = useState(() => initialDraft.customizationId ?? crypto.randomUUID())
  const [selectedFinish, setSelectedFinish] = useState<FinishType>(initialDraft.selectedFinish ?? 'matte')
  const [recipientName, setRecipientName] = useState(initialDraft.recipientName ?? '')
  const [occasionType, setOccasionType] = useState(initialDraft.occasionType ?? 'Birthday')
  const [customMessage, setCustomMessage] = useState(initialDraft.customMessage ?? '')
  const [additionalPreferences, setAdditionalPreferences] = useState(initialDraft.additionalPreferences ?? '')
  const [selectedPageCount, setSelectedPageCount] = useState<MagazinePageCount>(initialDraft.selectedPageCount ?? 4)
  const [photos, setPhotos] = useState<MagazineUploadMetadata[]>(initialDraft.photos ?? [])
  const [messageFile, setMessageFile] = useState<MagazineUploadMetadata | null>(initialDraft.messageFile ?? null)
  const [uploadLimits, setUploadLimits] = useState<MagazineUploadLimits | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; percent: number } | null>(null)
  const [removingUploadId, setRemovingUploadId] = useState('')
  const [isLoadingUploadLimits, setIsLoadingUploadLimits] = useState(false)
  const [selectedMagazineIndex, setSelectedMagazineIndex] = useState(0)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [magazineDirection, setMagazineDirection] = useState(1)
  const [pageDirection, setPageDirection] = useState(1)
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false)
  const orderButtonRef = useRef<HTMLButtonElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const handledScrollRequestRef = useRef(0)

  const selectedMagazine = magazineSamples[selectedMagazineIndex]
  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#B36D6D] focus:outline-none ${
    isDarkMode
      ? 'border-[#3F302D] bg-[#221B19] text-[#EDE0DA] placeholder:text-[#907D77]'
      : 'border-[#DEC5BB] bg-white text-[#2C2321] placeholder:text-[#A28E87]'
  }`

  useEffect(() => {
    try {
      window.localStorage.setItem(magazineDraftStorageKey, JSON.stringify({
        customizationId,
        recipientName,
        occasionType,
        customMessage,
        additionalPreferences,
        selectedFinish,
        selectedPageCount,
        photos: photos.map(({ previewUrl: _previewUrl, ...photo }) => photo),
        messageFile
      } satisfies MagazineDraft))
    } catch (error) {
      console.error('Unable to save the magazine customization draft:', error)
    }
  }, [customizationId, recipientName, occasionType, customMessage, additionalPreferences, selectedFinish, selectedPageCount, photos, messageFile])

  useEffect(() => {
    let active = true
    const loadLimits = async () => {
      setIsLoadingUploadLimits(true)
      try {
        const response = await fetch('/api/auth/magazine-uploads', { cache: 'no-store' })
        const result = await response.json() as { limits?: MagazineUploadLimits; error?: string }
        if (!response.ok || !result.limits) throw new Error(result.error || 'Upload limits could not be loaded.')
        if (active) setUploadLimits(result.limits)
      } catch (error) {
        if (active) setUploadError(error instanceof Error ? error.message : 'Upload limits could not be loaded.')
      } finally {
        if (active) setIsLoadingUploadLimits(false)
      }
    }
    void loadLimits()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    const loadSavedUploads = async () => {
      try {
        const response = await fetch(`/api/auth/magazine-uploads?action=list&customizationId=${encodeURIComponent(customizationId)}`, {
          credentials: 'same-origin',
          cache: 'no-store'
        })
        const result = await response.json() as { photos?: MagazineUploadMetadata[]; message?: MagazineUploadMetadata | null; error?: string }
        if (!response.ok) throw new Error(result.error || 'Saved magazine uploads could not be restored.')
        if (active && Array.isArray(result.photos)) {
          setPhotos(result.photos)
          setMessageFile(result.message ?? null)
          if (!result.photos.length && !result.message && (photos.length > 0 || messageFile)) {
            setCustomizationId(crypto.randomUUID())
          }
        }
      } catch (error) {
        if (active) setUploadError(error instanceof Error ? error.message : 'Saved magazine uploads could not be restored.')
      }
    }
    void loadSavedUploads()
    return () => { active = false }
  }, [userId, customizationId])

  const uploadApi = async <T,>(payload: Record<string, unknown>): Promise<T> => {
    const response = await fetch('/api/auth/magazine-uploads', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const result = await response.json() as T & { error?: string }
    if (!response.ok) throw new Error(result.error || 'The upload request failed.')
    return result
  }

  const transferFile = (uploadUrl: string, file: File, contentType: string, onProgress: (percent: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('PUT', uploadUrl)
      request.setRequestHeader('Content-Type', contentType)
      request.setRequestHeader('x-upsert', 'false')
      request.upload.onprogress = event => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
      }
      request.onerror = () => reject(new Error('The file could not be uploaded. Check your connection and try again.'))
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) resolve()
        else reject(new Error(`Supabase Storage rejected the upload (HTTP ${request.status}).`))
      }
      request.send(file)
    })

  const uploadOne = async (file: File, fileType: 'photo' | 'message') => {
    if (!userId) {
      setUploadError('Sign in before uploading files to your magazine.')
      setIsOrderFormOpen(false)
      onRequireAuth()
      return null
    }
    if (!uploadLimits) throw new Error('Upload limits are not ready. Please try again in a moment.')
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    const expectedContentType = fileType === 'photo' ? magazinePhotoMimeTypes[extension] : extension === 'txt' ? 'text/plain' : undefined
    if (!expectedContentType || (file.type && file.type !== expectedContentType)) {
      throw new Error(fileType === 'photo' ? 'Choose a JPG, PNG or WEBP image.' : 'Choose a .txt file only.')
    }
    const maxBytes = fileType === 'photo' ? uploadLimits.maxPhotoSizeBytes : uploadLimits.maxMessageSizeBytes
    if (!file.size || file.size > maxBytes) {
      throw new Error(`${file.name} exceeds the ${fileType === 'photo' ? 'photo' : 'TXT'} size limit.`)
    }
    const prepared = await uploadApi<{ uploadId: string; uploadUrl: string; contentType: string }>({
      action: 'prepare',
      customizationId,
      fileType,
      fileName: file.name,
      contentType: expectedContentType,
      fileSize: file.size
    })
    setUploadProgress({ fileName: file.name, percent: 0 })
    try {
      await transferFile(prepared.uploadUrl, file, prepared.contentType, percent => setUploadProgress({ fileName: file.name, percent }))
      const completed = await uploadApi<{ upload: MagazineUploadMetadata }>({
        action: 'complete',
        customizationId,
        uploadId: prepared.uploadId
      })
      return completed.upload
    } catch (error) {
      try {
        await uploadApi({ action: 'remove', customizationId, uploadId: prepared.uploadId })
      } catch (cleanupError) {
        console.error('Unable to clean up an incomplete magazine upload:', cleanupError)
      }
      throw error
    } finally {
      setUploadProgress(null)
    }
  }

  const handlePhotoSelection = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadError('')
    if (!userId) {
      setUploadError('Sign in before uploading files to your magazine.')
      setIsOrderFormOpen(false)
      onRequireAuth()
      return
    }
    if (!uploadLimits) {
      setUploadError('Upload limits are still loading. Please try again.')
      return
    }
    const selectedFiles = Array.from(files)
    const existingSize = photos.reduce((total, photo) => total + photo.fileSize, 0)
    if (photos.length + selectedFiles.length > uploadLimits.maxPhotos) {
      setUploadError(`You can upload up to ${uploadLimits.maxPhotos} photos.`)
      return
    }
    if (existingSize + selectedFiles.reduce((total, file) => total + file.size, 0) > uploadLimits.maxTotalPhotoSizeBytes) {
      setUploadError('The combined photo upload size exceeds the configured limit.')
      return
    }
    for (const file of selectedFiles) {
      try {
        const upload = await uploadOne(file, 'photo')
        if (upload) setPhotos(current => [...current, upload])
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : `Unable to upload ${file.name}.`)
        break
      }
    }
  }

  const handleMessageSelection = async (file: File | undefined) => {
    if (!file) return
    setUploadError('')
    try {
      const upload = await uploadOne(file, 'message')
      if (upload) setMessageFile(upload)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to upload the TXT attachment.')
    }
  }

  const removeUpload = async (file: MagazineUploadMetadata, fileType: 'photo' | 'message') => {
    setUploadError('')
    if (!userId) {
      setUploadError('Sign in to manage your saved magazine uploads.')
      setIsOrderFormOpen(false)
      onRequireAuth()
      return
    }
    setRemovingUploadId(file.id)
    try {
      await uploadApi({ action: 'remove', customizationId, uploadId: file.id })
      if (fileType === 'photo') setPhotos(current => current.filter(photo => photo.id !== file.id))
      else setMessageFile(null)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to remove the uploaded file.')
    } finally {
      setRemovingUploadId('')
    }
  }

  useEffect(() => {
    if (!isOrderFormOpen) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOrderFormOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      orderButtonRef.current?.focus()
    }
  }, [isOrderFormOpen])

  const changeMagazine = (direction: -1 | 1) => {
    setMagazineDirection(direction)
    setSelectedMagazineIndex(index => index + direction)
    setSelectedImageIndex(0)
  }

  const changeImage = (direction: -1 | 1) => {
    setPageDirection(direction)
    setSelectedImageIndex(index => (
      index + direction + selectedMagazine.images.length
    ) % selectedMagazine.images.length)
  }

  const handleOrderSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (uploadProgress) {
      setUploadError('Wait for the current upload to finish before adding your magazine.')
      return
    }
    const added = onCustomizeMagazine({
      customizationId,
      recipientName: recipientName.trim() || 'Beloved',
      printFinish: selectedFinish,
      occasion: occasionType,
      photoUploadIds: photos.map(photo => photo.id),
      pageCount: selectedPageCount,
      dedicationMessage: customMessage.trim(),
      ...(messageFile ? { messageUploadId: messageFile.id } : {}),
      additionalPreferences: additionalPreferences.trim()
    })
    if (added) {
      setIsOrderFormOpen(false)
      setCustomizationId(crypto.randomUUID())
      setRecipientName('')
      setOccasionType('Birthday')
      setCustomMessage('')
      setAdditionalPreferences('')
      setSelectedFinish('matte')
      setSelectedPageCount(4)
      setPhotos([])
      setMessageFile(null)
      setUploadError('')
    }
  }

  useEffect(() => {
    if (scrollRequestId <= handledScrollRequestRef.current || !previewRef.current) return
    handledScrollRequestRef.current = scrollRequestId
    onScrollToPreview(previewRef.current)
  }, [onScrollToPreview, scrollRequestId])

  return (
    <section className={`border-y py-20 transition-colors duration-500 sm:py-28 ${
      isDarkMode
        ? 'border-[#2E2422] bg-[#1A1615] text-[#F3EBE6]'
        : 'border-[#E8D4CB] bg-[#F8F1EB] text-[#2C2422]'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
          <span className="font-editorial text-xs font-semibold uppercase tracking-widest text-[#B36D6D]">
            Signature Creation
          </span>
          <h2 className="mt-2 font-serif-title text-3xl tracking-tight sm:text-4xl lg:text-5xl">
            Your story, made into a magazine
          </h2>
          <p className="mt-3 font-sans-body text-sm leading-relaxed text-[#7D6B65] dark:text-[#BAAAA3]">
            Favourite photographs, inside jokes, little memories, and big milestones. Bring them together and create a keepsake publication that feels completely yours.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-medium uppercase tracking-widest text-[#B36D6D] sm:gap-4">
            <span>Your Memories</span><span aria-hidden="true">·</span>
            <span>Your Stories</span><span aria-hidden="true">·</span>
            <span>Your People</span><span aria-hidden="true">·</span>
            <span>Your Magazine</span>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex justify-center lg:col-span-6">
            <div className="relative w-full max-w-[34rem] px-9 sm:px-14">
              {selectedMagazineIndex > 0 && (
                <button
                  type="button"
                  onClick={() => changeMagazine(-1)}
                  aria-label="Previous magazine"
                  className={`group absolute left-0 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border px-2 py-3 shadow-lg backdrop-blur transition-all sm:px-3 ${
                    isDarkMode
                      ? 'border-[#493936] bg-[#211B19]/90 text-[#F3EBE6] hover:border-[#B36D6D] hover:text-[#F3C2BA]'
                      : 'border-[#E8D4CB] bg-white/90 text-[#5D4640] hover:border-[#B36D6D] hover:text-[#9E5B5B]'
                  }`}
                >
                  <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                  <span className="text-center text-[9px] font-semibold leading-tight">Previous<br />magazine</span>
                </button>
              )}
              {selectedMagazineIndex < magazineSamples.length - 1 && (
                <button
                  type="button"
                  onClick={() => changeMagazine(1)}
                  aria-label="Next magazine"
                  className={`group absolute right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border px-2 py-3 shadow-lg backdrop-blur transition-all sm:px-3 ${
                    isDarkMode
                      ? 'border-[#493936] bg-[#211B19]/90 text-[#F3EBE6] hover:border-[#B36D6D] hover:text-[#F3C2BA]'
                      : 'border-[#E8D4CB] bg-white/90 text-[#5D4640] hover:border-[#B36D6D] hover:text-[#9E5B5B]'
                  }`}
                >
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  <span className="text-center text-[9px] font-semibold leading-tight">Next<br />magazine</span>
                </button>
              )}

              <div ref={previewRef} className="relative w-full max-w-md">
                <AnimatePresence initial={false} mode="wait" custom={magazineDirection}>
                  <motion.div
                    key={selectedMagazineIndex}
                    custom={magazineDirection}
                    initial={{
                      opacity: 0,
                      rotateZ: magazineDirection > 0 ? 2 : -2,
                      x: magazineDirection > 0 ? 56 : -56,
                      scale: 0.97
                    }}
                    animate={{ opacity: 1, rotateZ: 0, x: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      rotateZ: magazineDirection > 0 ? -2 : 2,
                      x: magazineDirection > 0 ? -56 : 56,
                      scale: 0.97
                    }}
                    transition={{
                      x: { type: 'spring', stiffness: 190, damping: 25, mass: 0.9 },
                      rotateZ: { type: 'spring', stiffness: 190, damping: 25, mass: 0.9 },
                      scale: { type: 'spring', stiffness: 190, damping: 25, mass: 0.9 },
                      opacity: { duration: 0.24, ease: 'easeOut' }
                    }}
                    style={{
                      backgroundColor: isDarkMode ? '#221B19' : '#FFFFFF',
                      borderColor: isDarkMode ? '#483531' : '#E0CBC2'
                    }}
                    className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border shadow-2xl shadow-neutral-900/25 sm:aspect-[3/4]"
                  >
                    <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-6 bg-gradient-to-r from-black/25 via-black/10 to-transparent" />
                    <div className="relative z-0 flex h-full min-h-0 flex-col justify-between p-3 sm:p-10">
                      <div className="shrink-0 border-b border-black/10 pb-2 dark:border-white/10 sm:pb-4">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[#B36D6D]">
                          <span className="flex items-center gap-1">
                            <BrandLogo isDarkMode={isDarkMode} className="h-5 w-8 object-contain" />
                            ARCHIVES
                          </span>
                          <span>VOL · 2026</span>
                        </div>
                        <BrandLogo isDarkMode={isDarkMode} className="mx-auto mt-1.5 block h-12 w-24 object-contain sm:mt-2 sm:h-16 sm:w-32" />
                        <p className="mt-1 text-center font-editorial text-xs italic tracking-widest text-[#8F5A54] dark:text-[#D5AEA7]">
                          {settings.tagline}
                        </p>
                      </div>

                      <div className="my-auto min-h-0 py-2 sm:py-4">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-black/5 bg-[#F1E7E1] shadow-inner dark:bg-[#302725]">
                          <AnimatePresence initial={false} mode="wait">
                            <motion.img
                              key={`${selectedMagazineIndex}-${selectedImageIndex}`}
                              initial={{ opacity: 0, x: pageDirection * 36, scale: 0.98 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: pageDirection * -36, scale: 0.98 }}
                              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                              src={selectedMagazine.images[selectedImageIndex]}
                              alt={`${selectedMagazine.name} sample page ${selectedImageIndex + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-contain"
                            />
                          </AnimatePresence>
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                          <button
                            type="button"
                            onClick={() => changeImage(-1)}
                            aria-label="Show previous sample page"
                            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => changeImage(1)}
                            aria-label="Show next sample page"
                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <div className="absolute right-3 top-3 z-10 rounded-full bg-black/35 px-2.5 py-1 text-[9px] font-medium tracking-widest text-white backdrop-blur-sm">
                            {selectedMagazine.name.toUpperCase()} · {selectedImageIndex + 1}/{selectedMagazine.images.length}
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <p className="font-serif-title text-sm font-semibold tracking-wide sm:text-base">
                              PERSONALIZED MEMORIES
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex shrink-0 justify-center gap-1.5 sm:mt-3" aria-label="Sample page selection">
                          {selectedMagazine.images.map((image, index) => (
                            <button
                              key={image}
                              type="button"
                              onClick={() => {
                                setPageDirection(index > selectedImageIndex ? 1 : -1)
                                setSelectedImageIndex(index)
                              }}
                              aria-label={`Show sample page ${index + 1}`}
                              aria-current={index === selectedImageIndex}
                              className={`h-1.5 rounded-full transition-all ${
                                index === selectedImageIndex
                                  ? 'w-6 bg-[#B36D6D]'
                                  : isDarkMode ? 'w-1.5 bg-white/30 hover:bg-white/50' : 'w-1.5 bg-[#B36D6D]/25 hover:bg-[#B36D6D]/50'
                              }`}
                            />
                          ))}
                        </div>
                        {customMessage && (
                          <p className="mt-2 line-clamp-2 shrink-0 px-2 text-center font-editorial text-xs italic text-[#7C6963] dark:text-[#B6A6A0] sm:mt-3">
                            “{customMessage}”
                          </p>
                        )}
                        <a
                          href={selectedMagazine.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mx-auto mt-2 flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#B36D6D]/40 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#9E5B5B] transition-all hover:border-[#B36D6D] hover:bg-[#B36D6D] hover:text-white dark:text-[#F0BDB5] dark:hover:text-white sm:mt-3 sm:gap-2 sm:px-4 sm:py-2 sm:text-[10px]"
                        >
                          <span>Full Preview Sample</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="mt-2 flex shrink-0 items-center justify-between border-t border-black/10 pt-2 text-[9px] uppercase tracking-wider text-[#88746F] dark:border-white/10 dark:text-[#A79690] sm:mt-0 sm:pt-3 sm:text-[10px]">
                        <span>Collectors Issue</span>
                        <span>{selectedMagazine.name}</span>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-lg text-center lg:col-span-6 lg:text-left">
            <span className="font-editorial text-xs font-semibold uppercase tracking-widest text-[#B36D6D]">
              Made just for them
            </span>
            <h3 className="mt-2 font-serif-title text-3xl tracking-tight sm:text-4xl">
              A keepsake, in your own words.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#7D6B65] dark:text-[#BAAAA3]">
              Choose a print finish, pick your page count, and add a name and dedication. Your magazine order will be saved with your account.
            </p>
            <div className="mt-8">
              <motion.button
                ref={orderButtonRef}
                type="button"
                onClick={() => setIsOrderFormOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#B36D6D] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#8C4F49]/20 transition-colors hover:bg-[#9E5B5B] sm:w-auto sm:min-w-[22rem]"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>Make your own magazine. Starts from Rs.499</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOrderFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={event => {
              if (event.target === event.currentTarget) setIsOrderFormOpen(false)
            }}
            className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/55 p-0 backdrop-blur-sm sm:p-5"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97, rotateX: 3 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="magazine-order-title"
              className={`my-auto w-full max-w-2xl overflow-hidden border shadow-2xl sm:rounded-3xl ${
                isDarkMode
                  ? 'border-[#493936] bg-[#1C1817] text-[#F3EBE6]'
                  : 'border-[#E8D4CB] bg-[#FFFCF9] text-[#2C2422]'
              }`}
            >
              <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-5 dark:border-white/10 sm:px-8">
                <div>
                  <span className="flex items-center gap-2 font-editorial text-[10px] font-semibold uppercase tracking-widest text-[#B36D6D]">
                    <Sparkles className="h-3.5 w-3.5" /> Made personal
                  </span>
                  <h2 id="magazine-order-title" className="mt-1 font-serif-title text-2xl sm:text-3xl">
                    Create your magazine
                  </h2>
                  <p className="mt-1 text-xs text-[#8E7973] dark:text-[#A79690]">
                    Your selections are saved with your order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOrderFormOpen(false)}
                  aria-label="Close magazine order form"
                  className={`rounded-full p-2 transition-colors ${
                    isDarkMode ? 'text-[#D2C2BC] hover:bg-white/10' : 'text-[#6B524C] hover:bg-[#F2E5DF]'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleOrderSubmit} className="max-h-[calc(100dvh-6rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
                <fieldset>
                  <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#BCAAA4]">
                    Choose print finish
                  </legend>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([
                      { finish: 'matte', label: 'Matte', description: 'Soft, subtle, glare-free' },
                      { finish: 'gloss', label: 'Gloss', description: 'Vibrant, luminous finish' }
                    ] as const).map(option => (
                      <button
                        key={option.finish}
                        type="button"
                        onClick={() => setSelectedFinish(option.finish)}
                        aria-pressed={selectedFinish === option.finish}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          selectedFinish === option.finish
                            ? 'border-[#B36D6D] bg-[#B36D6D]/10 text-[#8C4F4A] dark:text-[#F3C2BA]'
                            : isDarkMode
                              ? 'border-[#382C29] bg-[#221B1A] text-[#BCAAA4]'
                              : 'border-[#DFC6BD] bg-[#FAF4F0] text-[#55433D]'
                        }`}
                      >
                        <span className="flex items-center justify-between font-serif-title text-sm font-semibold">
                          {option.label}
                          {selectedFinish === option.finish && <Check className="h-4 w-4 text-[#B36D6D]" />}
                        </span>
                        <span className="mt-1 block text-[11px] text-[#7A6761] dark:text-[#AA9892]">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#BCAAA4]">
                    Magazine length
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { pages: 4 },
                      { pages: 8 }
                    ] as const).map(option => (
                      <button
                        key={option.pages}
                        type="button"
                        onClick={() => setSelectedPageCount(option.pages)}
                        aria-pressed={selectedPageCount === option.pages}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                          selectedPageCount === option.pages
                            ? 'border-[#B36D6D] bg-[#B36D6D]/10 text-[#8C4F4A] dark:text-[#F3C2BA]'
                            : isDarkMode
                              ? 'border-[#382C29] bg-[#221B1A] text-[#BCAAA4]'
                              : 'border-[#DFC6BD] bg-[#FAF4F0] text-[#55433D]'
                        }`}
                      >
                        <span className="font-serif-title text-sm font-semibold">{option.pages} pages</span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#B36D6D]">
                          ₹{MAGAZINE_PRICES[option.pages]}
                          {selectedPageCount === option.pages && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#BCAAA4]">
                  Recipient name
                  <input
                    type="text"
                    value={recipientName}
                    onChange={event => setRecipientName(event.target.value)}
                    placeholder="Who is this magazine for?"
                    maxLength={100}
                    className={`${inputClass} mt-1.5 normal-case tracking-normal`}
                  />
                </label>

                <fieldset>
                  <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#BCAAA4]">
                    Occasion theme
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {['Birthday', 'Anniversary', 'Celebration'].map(occasion => (
                      <button
                        key={occasion}
                        type="button"
                        onClick={() => setOccasionType(occasion)}
                        aria-pressed={occasionType === occasion}
                        className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                          occasionType === occasion
                            ? 'bg-[#B36D6D] text-white'
                            : isDarkMode
                              ? 'bg-[#271F1E] text-[#BBA9A3] hover:bg-[#342927]'
                              : 'bg-[#EFE2DC] text-[#5A4843] hover:bg-[#E7D4CD]'
                        }`}
                      >
                        {occasion}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <section className={`rounded-2xl border p-4 ${
                  isDarkMode ? 'border-[#493936] bg-[#211B19]' : 'border-[#E8D4CB] bg-[#FBF6F2]'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#BCAAA4]">Upload your photos</h3>
                      <p className="mt-1 text-[11px] text-[#8E7973] dark:text-[#A79690]">
                        {photos.length} {photos.length === 1 ? 'photo' : 'photos'} selected
                        {uploadLimits ? ` · up to ${uploadLimits.maxPhotos}` : ''}
                      </p>
                    </div>
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#B36D6D]/35 px-3 py-2 text-[11px] font-semibold text-[#9E5B5B] transition hover:bg-[#B36D6D]/10 dark:text-[#F0BDB5] ${
                      !uploadLimits || Boolean(uploadProgress) ? 'pointer-events-none opacity-50' : ''
                    }`}>
                      <Upload className="h-3.5 w-3.5" />
                      Upload Photos
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        multiple
                        disabled={!uploadLimits || Boolean(uploadProgress)}
                        className="sr-only"
                        onChange={event => {
                          void handlePhotoSelection(event.currentTarget.files)
                          event.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>
                  {!userId && <p className="mt-2 text-[11px] text-[#8E7973] dark:text-[#A79690]">Sign in to securely attach photos to your account.</p>}
                  {isLoadingUploadLimits && <p className="mt-2 text-[11px] text-[#8E7973]">Preparing secure uploads…</p>}
                  {photos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map(photo => (
                      <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-black/5 bg-white dark:border-white/10 dark:bg-[#181413]">
                        <img
                          src={photo.previewUrl}
                          alt={photo.originalFilename}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => void removeUpload(photo, 'photo')}
                          disabled={removingUploadId === photo.id || Boolean(uploadProgress)}
                          aria-label={`Remove ${photo.originalFilename}`}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-100 transition hover:bg-red-600 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          {removingUploadId === photo.id
                            ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-1 text-[9px] text-white">{photo.originalFilename}</span>
                      </div>
                    ))}
                  </div>}
                  {uploadProgress && <div className="mt-3" aria-live="polite">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-[#7A6761] dark:text-[#AA9892]">
                      <span className="flex min-w-0 items-center gap-1.5"><LoaderCircle className="h-3 w-3 animate-spin" /><span className="truncate">{uploadProgress.fileName}</span></span>
                      <span>{uploadProgress.percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#B36D6D]/15">
                      <div className="h-full rounded-full bg-[#B36D6D] transition-[width]" style={{ width: `${uploadProgress.percent}%` }} />
                    </div>
                  </div>}
                </section>

                <div>
                  <label htmlFor="magazine-dedication" className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#BCAAA4]">
                    Dedication message
                  </label>
                  <textarea
                    id="magazine-dedication"
                    rows={3}
                    value={customMessage}
                    onChange={event => setCustomMessage(event.target.value)}
                    placeholder="Write a personal message (optional)"
                    maxLength={10000}
                    className={`${inputClass} mt-1.5 resize-y normal-case tracking-normal`}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-[#8E7973] dark:text-[#A79690]">You can also attach a longer message as a plain-text .txt file.</p>
                    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#B36D6D]/35 px-3 py-2 text-[10px] font-semibold text-[#9E5B5B] transition hover:bg-[#B36D6D]/10 dark:text-[#F0BDB5] ${
                      !uploadLimits || Boolean(uploadProgress) ? 'pointer-events-none opacity-50' : ''
                    }`}>
                      <FileText className="h-3.5 w-3.5" />
                      {messageFile ? 'Replace Message (.txt)' : 'Upload Message (.txt)'}
                      <input
                        type="file"
                        accept=".txt,text/plain"
                        disabled={!uploadLimits || Boolean(uploadProgress)}
                        className="sr-only"
                        onChange={event => {
                          void handleMessageSelection(event.currentTarget.files?.[0])
                          event.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>
                  {messageFile && <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#E8D4CB] bg-[#FBF6F2] px-3 py-2 text-[11px] dark:border-[#493936] dark:bg-[#211B19]">
                    <span className="flex min-w-0 items-center gap-2 text-[#6F5C56] dark:text-[#C2B1AA]">
                      <FileText className="h-4 w-4 shrink-0 text-[#B36D6D]" />
                      <span className="truncate">{messageFile.originalFilename}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeUpload(messageFile, 'message')}
                      disabled={removingUploadId === messageFile.id || Boolean(uploadProgress)}
                      className="shrink-0 rounded-full p-1 text-[#8E7973] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Remove TXT message"
                    >
                      {removingUploadId === messageFile.id
                        ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        : <X className="h-3.5 w-3.5" />}
                    </button>
                  </div>}
                </div>

                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#BCAAA4]">
                  Additional preferences (optional)
                  <textarea
                    rows={2}
                    value={additionalPreferences}
                    onChange={event => setAdditionalPreferences(event.target.value)}
                    placeholder="Any other details for your magazine?"
                    maxLength={5000}
                    className={`${inputClass} mt-1.5 resize-y normal-case tracking-normal`}
                  />
                </label>

                {uploadError && <p role="alert" className="rounded-xl border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{uploadError}</p>}

                <motion.button
                  type="submit"
                  disabled={Boolean(uploadProgress)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#B36D6D] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#9E5B5B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Add magazine to bag · ₹{MAGAZINE_PRICES[selectedPageCount]}</span>
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
