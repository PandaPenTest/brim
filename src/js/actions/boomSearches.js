/* @flow */

import {Handler} from "../BoomClient"
import {
  type BoomSearchStatus as Status,
  getBoomSearches
} from "../reducers/boomSearches"
import type {Thunk} from "../reducers/types"
import {getCurrentSpaceName} from "../reducers/spaces"
import BaseSearch from "../models/searches/BaseSearch"

export const registerBoomSearch = (name: string, handler: Handler) => ({
  type: "BOOM_SEARCHES_REGISTER",
  search: {
    name,
    handler,
    status: "FETCHING",
    stats: {}
  }
})

export const setBoomSearchStatus = (name: string, status: Status) => ({
  type: "BOOM_SEARCHES_SET_STATUS",
  name,
  status
})

export const setBoomSearchStats = (name: string, stats: {}) => ({
  type: "BOOM_SEARCHES_SET_STATS",
  name,
  stats
})

export const clearBoomSearches = () => ({
  type: "BOOM_SEARCHES_CLEAR"
})

export const killBoomSearches = (): Thunk => (_dispatch, getState) => {
  const state = getState()
  const searches = getBoomSearches(state)
  for (let name in searches) searches[name].handler.abortRequest()
}

export const cancelBoomSearches = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const searches = getBoomSearches(state)
  for (let name in searches) searches[name].handler.abortRequest(false)
  dispatch(clearBoomSearches())
}

export const issueBoomSearch = (search: BaseSearch): Thunk => (
  dispatch,
  getState,
  boom
) => {
  const program = search.getProgram()
  const searchSpan = search.getSpan()
  const searchSpace = getCurrentSpaceName(getState())
  const name = search.getName()
  const handler = boom.search(program, {searchSpan, searchSpace})

  search.receiveData(handler, dispatch)
  search.receiveStats(handler, dispatch)

  dispatch(registerBoomSearch(name, handler))
  return handler
}
