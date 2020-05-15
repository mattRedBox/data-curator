import { currentPos$ } from '@/rxSubject.js'

const state = {
  hotTabs: {},
  packageProperties: {},
  provenanceProperties: { markdown: '', hotErrors: {} },
  fkPackageComponents: {}
}

export function getHotColumnPropertiesFromPropertyObject (property) {
  let allHotColumnProperties = state.hotTabs[property.hotId].columnProperties
  if (!allHotColumnProperties) {
    mutations.resetAllColumnPropertiesForHotId(state, property.hotId)
    allHotColumnProperties = state.hotTabs[property.hotId].columnProperties
  }
  let hotColumnProperties = allHotColumnProperties[property.columnIndex]
  if (!hotColumnProperties) {
    mutations.resetColumnPropertiesForHotId(state, property)
    hotColumnProperties = allHotColumnProperties[property.columnIndex]
  }
  return hotColumnProperties
}

export function getHotIdFromTabIdFunction () {
  return getters.getHotIdFromTabId(state, getters)
}

const getters = {
  getFkPackageComponents: (state, getters) => (url) => {
    return state.fkPackageComponents[url]
  },
  getHotTabs: state => {
    return state.hotTabs
  },
  getLatestSearchResult: (state, getters) => (hotId) => {
    const result = state.hotTabs[hotId].searchResult
    if (result) {
      return result
    } else {
      return 0
    }
  },
  getHotSelection: (state, getters) => (hotId) => {
    return state.hotTabs[hotId].selected
  },
  getTabIdFromHotId: (state, getters) => (hotId) => {
    return state.hotTabs[hotId].tabId
  },
  getTableProperties: (state, getters) => (hotId) => {
    return state.hotTabs[hotId].tableProperties || {}
  },
  getAllHotColumnPropertiesFromHotId: (state, getters) => (hotId) => {
    return state.hotTabs[hotId].columnProperties || []
  },
  // ensure getter fires each time by passing in function
  getAllHotTablesColumnNames: (state, getters) => () => {
    let hotIdColumnNames = {}
    for (let hotId in state.hotTabs) {
      let columnProps = state.hotTabs[hotId].columnProperties || []
      let columnNames = columnProps.map(column => {
        return column.name
      })
      hotIdColumnNames[hotId] = columnNames
    }
    return hotIdColumnNames
  },
  hasPropertyFromAllTables: (state, getters) => (propertyName) => {
    let tablesWithProperty = []
    for (let hotId in state.hotTabs) {
      let tableProps = state.hotTabs[hotId].tableProperties || {}
      if (_.get(tableProps, propertyName)) {
        tablesWithProperty.push(hotId)
      }
    }
    return tablesWithProperty
  },
  getAllHotTablesColumnProperties: (state, getters) => () => {
    let hotIdColumnNames = {}
    for (let hotId in state.hotTabs) {
      hotIdColumnNames[hotId] = state.hotTabs[hotId].columnProperties || []
    }
    return hotIdColumnNames
  },
  getAllHotColumnNamesFromHotId: (state, getters) => (hotId) => {
    return getters.getAllHotColumnPropertyFromHotId(state, getters)({ hotId: hotId, key: 'name' })
  },
  getAllHotColumnTypesFromHotId: (state, getters) => (hotId) => {
    return getters.getAllHotColumnPropertyFromHotId(state, getters)({ hotId: hotId, key: 'type' })
  },
  getAllHotColumnPropertyFromHotId: (state, getters) => (property) => {
    const hotId = property.hotId
    const propertyKey = property.key
    if (!state.hotTabs[hotId].columnProperties) {
      state.hotTabs[hotId].columnProperties = []
      // return
    }
    let values = state.hotTabs[hotId].columnProperties.map(column => {
      return column[propertyKey]
    })
    return values
  },
  getHotIdFromTabId: (state, getters) => (tabId) => {
    return new Promise((resolve, reject) => {
      let hotId = _.findKey(state.hotTabs, { tabId: tabId })
      if (!hotId) {
        // There is a short render wait in home page, so if hotId not first returned, just wait and try again
        _.delay(function (tabId) {
          resolve(_.findKey(state.hotTabs, { tabId: tabId }))
        }, 10, tabId)
      } else {
        resolve(hotId)
      }
    })
  },
  getSyncHotIdFromTabId: (state, getters) => (tabId) => {
    let hotId = _.findKey(state.hotTabs, { tabId: tabId })
    return hotId
  },
  getProvenance: state => {
    return state.provenanceProperties
  },
  getHotColumnProperty: (state, getters) => (property) => {
    let hotColumnProperties = getHotColumnPropertiesFromPropertyObject(property)
    return hotColumnProperties[property.key]
  },
  getTableProperty: (state, getters) => (property) => {
    let tableProperties = _.get(state, `hotTabs[${property.hotId}].tableProperties`, {})
    return tableProperties[property.key]
  },
  getPackageProperty: (state, getters) => (property) => {
    return state.packageProperties[property.key]
  },
  getPackageProperties: state => {
    return state.packageProperties
  },
  getConstraint: (state, getters) => (property) => {
    let hotColumnProperties = getHotColumnPropertiesFromPropertyObject(property)
    let constraints = hotColumnProperties['constraints']
    if (!constraints) {
      constraints = state.hotTabs[property.hotId].columnProperties[property.columnIndex].constraints = {}
    }
    return constraints[property.key]
  },
  // ensure no caching
  getAllForeignKeys: (state, getters) => () => {
    let allForeignKeys = {}
    for (let hotId in state.hotTabs) {
      let tableProperties = state.hotTabs[hotId].tableProperties || {}
      let foreignKeys = tableProperties.foreignKeys || []
      allForeignKeys[hotId] = foreignKeys
    }
    return allForeignKeys
  }
}

const mutations = {
  pushFkPackageComponents (state, property) {
    _.set(state.fkPackageComponents[property.url], property.tableName, property.fields)
  },
  resetSearchResult (state, hotId) {
    _.set(state.hotTabs, `${hotId}.searchResult`, 0)
  },
  pushProvenance (state, value) {
    _.set(state.provenanceProperties, 'markdown', value)
  },
  pushProvenanceErrors (state, property) {
    // ensure set to new object
    _.set(state.provenanceProperties.hotErrors, property.hotId, property.errors)
  },
  removeProvenanceErrors (state, hotId) {
    // ensure set to new empty object
    let allErrors = _.assign({}, state.provenanceProperties.hotErrors)
    _.unset(allErrors, hotId)
    state.provenanceProperties.hotErrors = allErrors
  },
  removeAllProvenanceErrors (state) {
    // ensure set to new empty object
    state.provenanceProperties.hotErrors = {}
  },
  pushHotTab (state, hotTab) {
    let hotId = hotTab.hotId
    if (!hotId) {
      return
    }
    if (hotTab.tabId) {
      _.set(state.hotTabs, `${hotId}.tabId`, hotTab.tabId)
    }
  },
  pushHotSelection (state, property) {
    _.set(state.hotTabs, `${property.hotId}.selected`, property.selected)
    currentPos$.next(property.selected)
  },
  pushAllColumnsProperty (state, properties) {
    for (const [index, value] of properties.values.entries()) {
      let property = {
        hotId: properties.hotId,
        columnIndex: index,
        key: properties.key,
        value: value
      }
      mutations.pushColumnProperty(state, property)
    }
  },
  pushColumnProperty (state, property) {
    _.set(state.hotTabs, `${property.hotId}.columnProperties[${property.columnIndex}].${property.key}`, property.value)
  },
  // change this to remove column property
  removeColumnProperty (state, property) {
    let currentColumnProperties = _.assign({}, state.hotTabs[property.hotId].columnProperties[property.columnIndex])
    _.unset(currentColumnProperties, property.key)
    state.hotTabs[property.hotId].columnProperties[property.columnIndex] = currentColumnProperties
  },
  pushTableProperty (state, property) {
    _.set(state.hotTabs, `${property.hotId}.tableProperties.${property.key}`, property.value)
  },
  pushForeignKeysLocalFieldsForTable (state, property) {
    let tableProperties = _.assign({}, state.hotTabs[property.hotId].tableProperties) || {}
    let foreignKeys = tableProperties.foreignKeys || []
    if (!foreignKeys[property.index]) {
      foreignKeys[property.index] = {
        fields: [],
        reference: {
          resource: '',
          fields: []
        }
      }
    }
    foreignKeys[property.index].fields = property.fields
    state.hotTabs[property.hotId].tableProperties.foreignKeys = foreignKeys
  },
  pushForeignKeysForeignPackageForTable (state, property) {
    let tableProperties = _.assign({}, state.hotTabs[property.hotId].tableProperties) || {}
    let foreignKeys = tableProperties.foreignKeys || []
    if (!foreignKeys[property.index]) {
      foreignKeys[property.index] = {
        fields: [],
        reference: {
          package: '',
          resource: '',
          fields: []
        }
      }
    }
    const dataPackage = property.package
    foreignKeys[property.index].reference.package = dataPackage
    state.hotTabs[property.hotId].tableProperties.foreignKeys = foreignKeys
    // reset package tables and columns cache
    state.fkPackageComponents[dataPackage] = {}
  },
  removeForeignKeysForeignPackageForTable (state, property) {
    let hotId = state.hotTabs[property.hotId]
    if (typeof hotId !== 'undefined') {
      let tableProperties = _.assign({}, hotId.tableProperties) || {}
      let foreignKeys = tableProperties.foreignKeys || []
      if (!foreignKeys[property.index]) {
        foreignKeys[property.index] = {
          fields: [],
          reference: {
            package: '',
            resource: '',
            fields: []
          }
        }
      }
      _.unset(foreignKeys[property.index].reference, 'package')
      state.hotTabs[property.hotId].tableProperties.foreignKeys = foreignKeys
    }
  },
  resetForeignKeysForeignTableForTable (state, property) {
    let hotId = state.hotTabs[property.hotId]
    if (typeof hotId !== 'undefined') {
      let tableProperties = _.assign({}, hotId.tableProperties) || {}
      let foreignKeys = tableProperties.foreignKeys || []
      if (!foreignKeys[property.index]) {
        foreignKeys[property.index] = {
          fields: [],
          reference: {
            resource: '',
            fields: []
          }
        }
      } else {
        foreignKeys[property.index].reference.resource = ''
      }
      state.hotTabs[property.hotId].tableProperties.foreignKeys = foreignKeys
    }
  },
  pushForeignKeysForeignTableForTable (state, property) {
    let tableProperties = _.assign({}, state.hotTabs[property.hotId].tableProperties) || {}
    let foreignKeys = tableProperties.foreignKeys || []
    if (!foreignKeys[property.index]) {
      foreignKeys[property.index] = {
        fields: [],
        reference: {
          resource: '',
          fields: []
        }
      }
    }
    foreignKeys[property.index].reference.resource = property.resource
    state.hotTabs[property.hotId].tableProperties.foreignKeys = foreignKeys
  },
  resetForeignKeysForeignFieldsForTable (state, property) {
    let hotId = state.hotTabs[property.hotId]
    if (typeof hotId !== 'undefined') {
      let tableProperties = _.assign({}, hotId.tableProperties) || {}
      let foreignKeys = tableProperties.foreignKeys || []
      if (!foreignKeys[property.index]) {
        foreignKeys[property.index] = {
          fields: [],
          reference: {
            resource: '',
            fields: []
          }
        }
      } else {
        foreignKeys[property.index].reference.fields = []
      }
      state.hotTabs[property.hotId].tableProperties.foreignKeys = foreignKeys
    }
  },
  pushForeignKeysForeignFieldsForTable (state, property) {
    let tableProperties = _.assign({}, state.hotTabs[property.hotId].tableProperties) || {}
    let foreignKeys = tableProperties.foreignKeys || []
    if (!foreignKeys[property.index]) {
      foreignKeys[property.index] = {
        fields: [],
        reference: {
          resource: '',
          fields: []
        }
      }
    }
    foreignKeys[property.index].reference.fields = property.fields
    state.hotTabs[property.hotId].tableProperties.foreignKeys = foreignKeys
  },
  pushPackageProperty (state, property) {
    _.set(state.packageProperties, property.key, property.value)
  },
  pushTableSchema (state, hotIdSchema) {
    let hotId = hotIdSchema.hotId
    let hotTab = state.hotTabs[hotId]
    mutations.initColumnProperties(state, hotTab)
    // we cannot mutate the vuex state itself (in lodash call) - we can only assign a new value
    let columnProperties = []
    for (let column of hotTab.columnProperties) {
      let nextObject = {}
      columnProperties.push(nextObject)
      _.assign(nextObject, column)
    }
    _.merge(columnProperties, hotIdSchema.schema.descriptor.fields)
    state.hotTabs[hotId].columnProperties = columnProperties
    return state.hotTabs[hotId].columnProperties
  },
  initColumnProperties (state, hotTab) {
    if (typeof hotTab.columnProperties === 'undefined' || !hotTab.columnProperties) {
      hotTab.columnProperties = []
    }
  },
  initMissingValues (state, hotTab) {
    mutations.initTableProperties(state, hotTab)
    if (typeof hotTab.tableProperties.missingValues === 'undefined' || !hotTab.tableProperties.missingValues) {
      hotTab.tableProperties.missingValues = ['']
    }
  },
  initTableProperties (state, hotTab) {
    if (typeof hotTab.tableProperties === 'undefined' || !hotTab.tableProperties) {
      hotTab.tableProperties = []
    }
  },
  destroyHotTab (state, hotId) {
    _.unset(state.hotTabs, hotId)
  },
  async destroyHotTabFromTabId (state, tabId) {
    let hotId = await getters.getHotIdFromTabId(tabId)
    _.unset(state.hotTabs, hotId)
  },
  resetAllColumnPropertiesForHotId (state, hotId) {
    if (state.hotTabs[hotId].columnProperties) {
      state.hotTabs[hotId].columnProperties.length = 0
    } else {
      state.hotTabs[hotId].columnProperties = []
    }
  },
  resetColumnPropertiesForHotId (state, property) {
    state.hotTabs[property.hotId].columnProperties[property.columnIndex] = {}
  },
  removeColumnIndexForHotId (state, property) {
    let columnProperties = state.hotTabs[property.hotId].columnProperties
    if (typeof columnProperties !== 'undefined' && columnProperties.length > property.columnIndex) {
      state.hotTabs[property.hotId].columnProperties.splice(property.columnIndex, 1)
    }
  },
  pushColumnIndexForHotId (state, property) {
    let columnProperties = state.hotTabs[property.hotId].columnProperties
    if (typeof columnProperties == 'undefined') {
      state.hotTabs[property.hotId].columnProperties = []
    }
    state.hotTabs[property.hotId].columnProperties.splice(property.columnIndex, 0, {})
  },
  resetPackagePropertiesToObject (state, properties) {
    _.set(state, 'packageProperties', properties)
  },
  resetTablePropertiesToObject (state, hotIdTables) {
    for (let hotId in hotIdTables) {
      if (!state.hotTabs[hotId]) {
        throw new Error(`Unable to find tab with hot id: ${hotId}`)
      }
      _.set(state.hotTabs[hotId], 'tableProperties', hotIdTables[hotId])
    }
  },
  resetColumnPropertiesToObject (state, hotIdColumns) {
    for (let hotId in hotIdColumns) {
      if (!state.hotTabs[hotId]) {
        throw new Error(`Unable to find tab with hot id: ${hotId}`)
      }
      _.set(state.hotTabs[hotId], 'columnProperties', hotIdColumns[hotId])
    }
  },
  resetHotState (state) {
    state.hotTabs = {}
    state.packageProperties = {}
    state.provenanceProperties = { markdown: '', hotErrors: {} }
    state.fkPackageComponents = {}
  }
}

export default {
  state,
  getters,
  mutations
}
