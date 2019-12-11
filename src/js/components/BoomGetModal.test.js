/* @flow */
import React from "react"

import {changeSearchBarInput} from "../state/actions"
import {submitSearchBar} from "../state/thunks/searchBar"
import BoomGetModal from "./BoomGetModal"
import logInto from "../test/helpers/loginTo"
import modal from "../modal"
import provide from "../test/helpers/provide"

test("renders with boom get command", () => {
  let {store} = logInto("cluster1", "space1")

  store.dispatchAll([
    changeSearchBarInput("hi"),
    submitSearchBar(),
    modal.show("boom-get")
  ])

  let wrapper = provide(store, <BoomGetModal />)
  wrapper
    .find("input[type='checkbox']")
    .simulate("change", {target: {checked: true}})
  wrapper.find("input[value='Copy']").simulate("click")
  wrapper.find("input[value='Done']").simulate("click")

  expect(modal.getName(store.getState())).toBe("")
})