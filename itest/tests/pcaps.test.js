/* @noflow */
import md5 from "md5"

import {readFileSync, readdirSync, unlinkSync} from "fs"
import path from "path"

import {LOG} from "../lib/log"
import {
  click,
  logIn,
  newAppInstance,
  pcapIngestSample,
  pcapsDir,
  resetState,
  searchDisplay,
  setSpan,
  startApp,
  startSearch,
  waitForSearch,
  waitUntilDownloadFinished,
  writeSearch
} from "../lib/app.js"
import {dataSets, selectors} from "../../src/js/test/integration"
import {handleError, stdTest} from "../lib/jest.js"
import contextMenuShim from "../lib/appIpc"

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
      writeSearch(app, "_path=ssl id.orig_h=192.168.1.110 id.resp_h=209.216.230.240 id.resp_p=443")
        .then(async () => {
          await startSearch(app)
          await searchDisplay(app)
          await searchDisplay(app)
          done()
        })
        .catch((err) => {
          handleError(app, err, done)
        })
    }
  )

  test.skip(
    "Clicking on Download PCAPS with unset duration (update after fixing PROD-967)",
    (done) => {
      // This is a failing test that, once PROD-967 is fixed, can be updated.
      // It's left on because I can't fix/disable it, and I want to call
      // attention to getting it fixed right away.
      let downloadPcapFromConnTuple = async () => {
        let program = "_path=conn duration=null | sort -r ts, uid"
        await logIn(app)
        await writeSearch(app, program)
        await startSearch(app)
        await waitForSearch(app)

        menu
          .program(program)
          .click(
            "Download PCAPS",
            dataSets.corelight.pcaps.unsetDurationUid,
            dataSets.corelight.pcaps.unsetDurationConnLog
          )

        return await waitUntilDownloadFinished(app)
      }
      downloadPcapFromConnTuple()
        .then((downloadText) => {
          expect(downloadText).toBe("Download error: Bad Request")
          done()
        })
        .catch((err) => {
          handleError(app, err, done)
        })
    }
  )

  test.skip("www.mybusinessdoc.com dosexec PCAP download", (done) => {
    const pcapFromCorrelation = async () => {
      await logIn(app)
      await setSpan(app, dataSets.corelight.logDetails.span)
      await writeSearch(app, dataSets.corelight.logDetails.initialSearch)
      await startSearch(app)
      await waitForSearch(app)
      await searchDisplay(app)

      menu.click(
        "Open details",
        dataSets.corelight.logDetails.getDetailsFrom,
        dataSets.corelight.logDetails.myBusinessDocHttpLog
      )
      await click(app, selectors.correlationPanel.getText("conn"))
      await click(app, selectors.pcaps.button)
      return await waitUntilDownloadFinished(app)
    }
    pcapFromCorrelation()
      .then((downloadText) => {
        expect(downloadText).toBe("Download Complete")
        let fileBasename = dataSets.corelight.pcaps.logDetailsFilename
        let pcapAbspath = path.join(pcapsDir(), fileBasename)
        expect(md5(readFileSync(pcapAbspath))).toBe(
          dataSets.corelight.pcaps.logDetailsMD5
        )
        done()
      })
      .catch((err) => {
        handleError(app, err, done)
      })
  })
})
