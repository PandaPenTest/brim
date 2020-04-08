/* @noflow */
import {readdirSync, unlinkSync} from "fs"
import path from "path"

import {LOG} from "../lib/log"
import {
  click,
  clickPcapButton,
  newAppInstance,
  pcapIngestSample,
  pcapsDir,
  searchDisplay,
  startApp,
  startSearch,
  waitForSearch,
  waitUntilDownloadFinished,
  writeSearch
} from "../lib/app"
import {selectors} from "../../src/js/test/integration"
import {handleError, stdTest} from "../lib/jest"

const clearPcaps = async (app) => {
  let dir = await pcapsDir(app)
  let files = readdirSync(dir)
  files.forEach((fileBasename) => {
    if (fileBasename.match(/^packets-.+\.pcap$/)) {
      let fileAbspath = path.join(dir, fileBasename)
      unlinkSync(fileAbspath)
      LOG.debug(`Unlinked file ${fileAbspath}`)
    }
  })
}

describe("Test PCAPs", () => {
  let app
  let testIdx = 0

  beforeEach(async () => {
    app = newAppInstance(path.basename(__filename), ++testIdx)
    await startApp(app)
    await clearPcaps(app)
    await pcapIngestSample(app)
  })

  afterEach(async () => {
    await clearPcaps(app)
    if (app && app.isRunning()) {
      return await app.stop()
    }
  })

  stdTest(
    "pcap button downloads deterministically-formed pcap file",
    (done) => {
      writeSearch(
        app,
        "_path=ssl id.orig_h=192.168.1.110 id.resp_h=209.216.230.240 id.resp_p=443"
      )
        .then(async () => {
          await startSearch(app)
          await waitForSearch(app)
          await searchDisplay(app)
          await click(app, selectors.viewer.resultCellContaining("ssl"))
          await clickPcapButton(app)
          done()
        })
        .catch((err) => {
          handleError(app, err, done)
        })
    }
  )
})
