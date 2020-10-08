import store from '@/store'
import fs from 'fs'
import { fixRaggedRows } from '@/ragged-rows.js'
import { includeHeadersInData } from '@/frictionlessUtilities.js'
import { toggleHeaderNoFeedback } from '@/headerRow.js'
import { pushCsvFormat } from '@/dialect.js'
import detectNewline from 'detect-newline'
import os from 'os'

var parse = require('csv-parse/lib/sync')
var stringify = require('csv-stringify/lib/sync')
var CSVSniffer = require('csv-sniffer')()

// { delimiter: ',', lineTerminator, quoteChar, doubleQuote, escapeChar, nullSequence, skipInitialSpace, header, caseSensitiveHeader, csvddfVersion }
const frictionlessToCsvmapper = {
  delimiter: 'delimiter',
  lineTerminator: 'rowDelimiter',
  quoteChar: 'quote',
  escapeChar: 'escape',
  skipInitialSpace: 'ltrim'
}

export function loadDataIntoHot (hot, data, format) {
  if (_.isArray(data)) {
    loadArrayDataIntoHot(hot, data, format)
  } else {
    loadCsvDataIntoHot(hot, data, format)
  }
}

export function loadCsvDataIntoHot (hot, data, format) {
  // do not handle errors here as caller can activate appropriate user feedback dialog
  let arrays
  // if no format specified, default to csv
  if (typeof format === 'undefined' || !format) {
    detectAndStoreQuoteChar(data, hot.guid, null)
    captureBOM(data, hot.guid)
    arrays = parse(data)
  } else {
    let csvOptions = dialectToCsvOptions(format.dialect)
    detectAndStoreQuoteChar(data, hot.guid, csvOptions)
    // let csv parser handle the line terminators
    _.unset(csvOptions, 'rowDelimiter')
    // TODO: update to stream
    csvOptions.bom = false
    captureBOM(data, hot.guid)
    arrays = parse(data, csvOptions)
    pushCsvFormat(hot.guid, format)
  }
  // initialised data may have been 1 empty column - which might not have parsed correctly - fix here
  if (_.isEmpty(arrays)) {
    arrays = [['']]
  }
  fixRaggedRows(arrays)
  hot.loadData(arrays)
  hot.render()
  // frictionless csv header default = true
  toggleHeaderNoFeedback(hot)
}

function captureBOM (data, hotId) {
  if (data.charCodeAt(0) === 0xFEFF) {
    store.commit('pushTableProperty', { hotId: hotId, key: `bom`, value: 0xFEFF })
  }
}

export function loadArrayDataIntoHot (hot, arrays, format) {
  pushCsvFormat(hot.guid, format)
  fixRaggedRows(arrays)
  hot.loadData(arrays)
  hot.render()
  // frictionless csv header default = true
  toggleHeaderNoFeedback(hot)
}

export function saveDataToFile (hot, format, filename, callback) {
  let tabId = store.getters.getActiveTab
  if (typeof filename === 'string') {
    store.commit('pushTabObject', { id: tabId, filename: filename })
  } else {
    filename = store.getters.getTabObjects(`${tabId}.filename`)
  }
  if (!filename) {
    return
  }
  if (typeof callback === 'undefined') {
    callback = (err) => {
      if (err) {
        console.error('There was a problem saving data to file.')
        throw err
      }
      // console.log('File saved successfully.')
    }
  }

  // unlike handsontable, in frictionless by default, headers should be included (http://frictionlessdata.io/specs/csv-dialect)
  let arrays = includeHeadersInData(hot)
  let data
  // if no format specified, default to csv
  if (typeof format === 'undefined' || !format) {
    // TODO: update to stream
    data = stringify(arrays)
  } else {
    let csvOptions = dialectToCsvOptions(format.dialect)
    if (store.getters.getTableProperty({ key: 'sampledQuoteChar', hotId: hot.guid })) {
      csvOptions.quoted = true
    }
    data = stringify(arrays, csvOptions)
    pushCsvFormat(hot.guid, format)
  }
  reinsertExistingBOM(data, hot.guid)
  fs.writeFile(filename, data, callback)
}

function reinsertExistingBOM (data, hotId) {
  if (data.charCodeAt(0) !== 0xFEFF && store.getters.getTableProperty({ key: 'bom', hotId: hotId })) {
    data = String.fromCodePoint(0xFEFF) + data
  }
}

function dialectToCsvOptions (dialect) {
  let csvOptions = {}
  if (dialect) {
    _.forEach(frictionlessToCsvmapper, function (csvKey, frictionlessKey) {
      if (_.has(dialect, frictionlessKey)) {
        csvOptions[csvKey] = dialect[frictionlessKey]
      }
    })
  }
  return csvOptions
}

function detectAndStoreQuoteChar (data, hotId, csvOptions) {
  let sample = _.truncate(data, { length: 2000 })
  var sniffer = new CSVSniffer()
  // csv-sniffer will throw exception if there is no line terminator in sample
  let newLineString = detectNewline(sample) || _.get(csvOptions, 'rowDelimiter', os.EOL)
  var sniffResult = sniffer.sniff(sample, { newlineStr: newLineString })
  if (sniffResult.quoteChar) {
    store.commit('pushTableProperty', { hotId: hotId, key: `sampledQuoteChar`, value: sniffResult.quoteChar })
  }
}
