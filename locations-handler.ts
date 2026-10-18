import type { IncomingMessage, ServerResponse } from 'node:http'
import { City, State } from 'country-state-city'

interface LocationRequest extends IncomingMessage {
  query?: unknown
}

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.end(JSON.stringify(payload))
}

export function indiaStatesHandler(_req: LocationRequest, res: ServerResponse): void {
  const states = State.getStatesOfCountry('IN')
    .map(state => ({ name: state.name, code: state.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name))
  sendJson(res, 200, { states })
}

export function indiaCitiesHandler(req: LocationRequest, res: ServerResponse): void {
  const query = req.query && typeof req.query === 'object' && !Array.isArray(req.query)
    ? req.query as Record<string, unknown>
    : {}
  const queryStateCode = query.stateCode
  const stateCode = Array.isArray(queryStateCode) ? queryStateCode[0] : queryStateCode
  if (!stateCode || !State.getStateByCodeAndCountry(stateCode, 'IN')) {
    sendJson(res, 400, { error: 'Choose a valid Indian state or union territory.' })
    return
  }
  const cities = City.getCitiesOfState('IN', stateCode)
    .map(city => city.name)
    .sort((a, b) => a.localeCompare(b))
  sendJson(res, 200, { cities })
}
