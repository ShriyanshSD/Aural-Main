import { useEffect, useMemo, useState } from 'react'

export interface IndiaStateOption {
  name: string
  code: string
}

const readLocationResponse = async <T,>(response: Response, action: string): Promise<T> => {
  const responseText = await response.text()
  if (!responseText.trim()) {
    throw new Error(`${action} returned an empty response (HTTP ${response.status}).`)
  }
  try {
    return JSON.parse(responseText) as T
  } catch {
    throw new Error(`${action} returned an invalid response (HTTP ${response.status}).`)
  }
}

export const useIndiaLocations = (stateName: string, enabled = true) => {
  const [states, setStates] = useState<IndiaStateOption[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [isLoadingStates, setIsLoadingStates] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [error, setError] = useState('')

  const selectedState = useMemo(
    () => states.find(option => option.name.toLowerCase() === stateName.trim().toLowerCase()),
    [states, stateName]
  )

  useEffect(() => {
    if (!enabled) return
    let active = true
    setIsLoadingStates(true)
    setError('')
    fetch('/api/locations/states', { cache: 'no-store' })
      .then(async response => {
        const data = await readLocationResponse<{ states?: IndiaStateOption[]; error?: string }>(response, 'Loading Indian states')
        if (!response.ok || !Array.isArray(data.states)) throw new Error(data.error || 'Unable to load Indian states.')
        if (active) setStates(data.states)
      })
      .catch(locationError => {
        console.error('Unable to load Indian states:', locationError)
        if (active) setError(locationError instanceof Error ? locationError.message : 'Unable to load Indian states.')
      })
      .finally(() => {
        if (active) setIsLoadingStates(false)
      })
    return () => { active = false }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !selectedState) {
      setCities([])
      return
    }
    let active = true
    setCities([])
    setIsLoadingCities(true)
    setError('')
    fetch(`/api/locations/cities?stateCode=${encodeURIComponent(selectedState.code)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await readLocationResponse<{ cities?: string[]; error?: string }>(response, 'Loading cities')
        if (!response.ok || !Array.isArray(data.cities)) throw new Error(data.error || 'Unable to load cities.')
        if (active) setCities(data.cities)
      })
      .catch(locationError => {
        console.error('Unable to load cities:', locationError)
        if (active) setError(locationError instanceof Error ? locationError.message : 'Unable to load cities.')
      })
      .finally(() => {
        if (active) setIsLoadingCities(false)
      })
    return () => { active = false }
  }, [enabled, selectedState])

  return { states, cities, selectedState, isLoadingStates, isLoadingCities, error }
}
