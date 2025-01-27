/*
 * <<
 * Davinci
 * ==
 * Copyright (C) 2016 - 2017 EDP
 * ==
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * >>
 */

import * as React from 'react'
import { fromJS } from 'immutable'
import { connect } from 'react-redux'
import Helmet from 'react-helmet'
import { createStructuredSelector } from 'reselect'
import { RouteComponentProps } from 'react-router'

import { compose } from 'redux'
import reducer from './reducer'
import saga from './sagas'
import reducerWidget from '../Widget/reducer'
import sagaWidget from '../Widget/sagas'
import reducerView from '../View/reducer'
import sagaView from '../View/sagas'
import injectReducer from 'utils/injectReducer'
import injectSaga from 'utils/injectSaga'

import {
  makeSelectCurrentDisplay,
  makeSelectCurrentSlide,
  makeSelectDisplays,
  makeSelectCurrentLayers,
  makeSelectCurrentLayersInfo,
  makeSelectCurrentLayersOperationInfo,
  makeSelectCurrentSelectedLayers,
  makeSelectClipboardLayers,
  makeSelectCanUndo,
  makeSelectCanRedo,
  makeSelectCurrentState,
  makeSelectNextState,
  makeSelectEditorBaselines } from './selectors'
import { slideSettings, GraphTypes, computeEditorBaselines } from './components/util'

import { FieldSortTypes } from 'containers/Widget/components/Config/Sort'
import { widgetDimensionMigrationRecorder } from 'utils/migrationRecorders'

import DisplayHeader from './components/DisplayHeader'
import DisplayBody from './components/DisplayBody'
import LayerList from './components/LayerList'
import DisplayContainer, { Keys } from './components/DisplayContainer'
import DisplayBottom from './components/DisplayBottom'
import DisplaySidebar from './components/DisplaySidebar'

import LayerItem, { ILayerParams, IBaseline } from './components/LayerItem'
import SettingForm from './components/SettingForm'
import DisplaySetting from './components/DisplaySetting'
import LayerAlign from './components/LayerAlign'

import { hideNavigator } from '../App/actions'
import { loadWidgets } from '../Widget/actions'
import DisplayActions from './actions'
import { message } from 'antd'
const styles = require('./Display.less')

import { IWidgetConfig, RenderType } from '../Widget/components/Widget'
import { decodeMetricName } from '../Widget/components/util'
import { ViewActions } from '../View/actions'
const { loadViewDataFromVizItem, loadViewExecuteQuery, loadViewGetProgress, loadViewGetResult, loadViewKillExecute, loadViewsDetail } = ViewActions // @TODO global filter in Display
import { makeSelectWidgets } from '../Widget/selectors'
import { makeSelectFormedViews } from '../View/selectors'
import { GRID_ITEM_MARGIN, DEFAULT_BASELINE_COLOR, DEFAULT_SPLITER, MAX_LAYER_COUNT } from 'app/globalConstants'
// import { LayerContextMenu } from './components/LayerContextMenu'

import { ISlideParams } from './types'
import { IQueryConditions, IDataRequestParams } from '../Dashboard/Grid'
import { IFormedViews } from 'containers/View/types'

interface IParams {
  pid: number
  displayId: number
}

interface IEditorProps extends RouteComponentProps<{}, IParams> {
  widgets: any[]
  formedViews: IFormedViews
  currentDisplay: any
  currentSlide: any
  currentLayers: any[]
  currentLayersInfo: {
    [key: string]: {
      datasource: {
        pageNo: number
        pageSize: number
        resultList: any[]
        totalCount: number
      }
      loading: boolean
      queryConditions: IQueryConditions
      interactId: string
      rendered: boolean
      renderType: RenderType
    }
  },
  currentLayersOperationInfo: {
    [key: string]: {
      selected: boolean
      resizing: boolean
      dragging: boolean
    }
  }
  clipboardLayers: any[]
  currentSelectedLayers: any[]
  canUndo: boolean
  canRedo: boolean
  currentState
  nextState
  editorBaselines: IBaseline[]
  onEditCurrentDisplay: (display: any, resolve?: any) => void
  onEditCurrentSlide: (displayId: number, slide: any, resolve?: any) => void
  onUploadCurrentSlideCover: (cover: Blob, resolve: any) => void
  onLoadDisplayDetail: (projectId: number, displayId: number) => void
  onSelectLayer: (obj: { id: any, selected: boolean, exclusive: boolean }) => void
  onClearLayersSelection: () => void
  onDragSelectedLayer: (id: number, deltaX: number, deltaY: number) => void
  onResizeLayers: (layerIds: number[]) => void
  toggleLayersResizingStatus: (layerIds: number[], resizing: boolean) => void
  toggleLayersDraggingStatus: (layerIds: number[], dragging: boolean) => void
  onAddDisplayLayers: (displayId: any, slideId: any, layers: any[]) => void
  onDeleteDisplayLayers: (displayId: any, slideId: any, ids: any[]) => void,
  onEditDisplayLayers: (displayId: any, slideId: any, layers: any[]) => void
  onCopySlideLayers: (slideId, layers) => void
  onPasteSlideLayers: (displayId, slideId, layers) => void
  onLoadDisplayShareLink: (id: number, authName: string) => void
  onUndo: (currentState) => void
  onRedo: (nextState) => void
  onHideNavigator: () => void
  onLoadViewDataFromVizItem: (
    renderType: RenderType,
    layerItemId: number,
    viewId: number,
    requestParams: IDataRequestParams,
    statistic: any
  ) => void
  onViewExecuteQuery: (
    renderType: RenderType,
    dashboardItemId: number,
    viewId: number,
    requestParams: IDataRequestParams,
    statistic: any,
    resolve: (data) => void,
    reject: (data) => void
  ) => void
  onViewGetProgress: (
    execId: string,
    resolve: (data) => void,
    reject: (data) => void
    ) => void
  onViewGetResult: (
    execId: string,
    renderType: RenderType,
    dashboardItemId: number,
    viewId: number,
    requestParams: IDataRequestParams,
    statistic: any,
    resolve: (data) => void,
    reject: (data) => void
    ) => void
  onViewKillExecute: (
    execId: string,
    resolve: (data) => void,
    reject: (data) => void
    ) => void
  onLoadViewsDetail: (viewIds: number[], resolve: () => void) => void

  onShowEditorBaselines: (baselines: IBaseline[]) => void
  onClearEditorBaselines: () => void
  onResetDisplayState: () => void
}

interface IEditorStates {
  slideParams: Partial<ISlideParams>
  currentLocalLayers: any[]
  zoomRatio: number
  sliderValue: number
  scale: number
  settingInfo: {
    key: string
    id: number
    setting: any
    param: ILayerParams | Partial<ISlideParams>
  },
  executeQueryFailed: boolean
}

export class Editor extends React.Component<IEditorProps, IEditorStates> {

  private editor = React.createRef<DisplayContainer>()

  constructor (props) {
    super(props)
    this.state = {
      slideParams: {},
      currentLocalLayers: [],
      zoomRatio: 1,
      sliderValue: 100,
      scale: 1,
      settingInfo: {
        key: '',
        id: 0,
        setting: null,
        param: null
      },
      executeQueryFailed: false
    }
  }

  public componentDidMount () {
    const { params, onLoadDisplayDetail, onHideNavigator } = this.props
    const projectId = +params.pid
    const displayId = +params.displayId
    onLoadDisplayDetail(projectId, displayId)
    onHideNavigator()
  }

  private execIds = []

  private deleteExecId = (execId) => {
    const index = this.execIds.indexOf(execId);
    if (index > -1) this.execIds.splice(index, 1)
  }

  public componentWillUnmount () {
    this.timeout.forEach(item => clearTimeout(item))
    this.execIds.forEach((execId) => {
      this.props.onViewKillExecute(execId, () => {}, () => {})
    })
    this.props.onResetDisplayState()
  }

  public componentWillReceiveProps (nextProps: IEditorProps) {
    const { currentSlide, currentLayers } = nextProps
    if (this.state.slideParams && this.state.slideParams.displayMode) {
      this.setDisplayMode(this.state.slideParams.displayMode)
    }

    let { slideParams, currentLocalLayers } = this.state
    if (currentSlide && currentSlide !== this.props.currentSlide) {
      slideParams = JSON.parse(currentSlide.config).slideParams
    }
    if (currentLayers !== this.props.currentLayers) {
      currentLocalLayers = fromJS(currentLayers).toJS()
    }
    const settingInfo = this.getSettingInfo(nextProps, slideParams, currentLocalLayers)
    this.setState({
      slideParams,
      currentLocalLayers,
      settingInfo
    })
  }

  private getSettingInfo = (nextProps: IEditorProps, slideParams, currentLocalLayers) => {
    const { currentSlide, currentSelectedLayers } = nextProps

    let settingInfo = this.state.settingInfo
    if (currentSelectedLayers.length === 1) {
      const selectedLayer = currentLocalLayers.find((layer) => layer.id === currentSelectedLayers[0].id)
      const type = selectedLayer.subType || selectedLayer.type
      const param = JSON.parse(selectedLayer['params'])
      settingInfo = {
        key: `layer_${selectedLayer.id}`,
        id: selectedLayer.id,
        setting: slideSettings[type],
        param
      }
    } else if (currentSlide) {
      settingInfo = {
        key: 'slide',
        id: currentSlide.id,
        setting: slideSettings[GraphTypes.Slide],
        param: slideParams
      }
    }
    return settingInfo
  }

  private sliderChange = (sliderValue: number) => {
    const zoomRatio = sliderValue / 40 + 0.5
    this.setState({
      sliderValue,
      zoomRatio
    })
  }

  private zoomIn = () => {
    if (this.state.sliderValue) {
      this.sliderChange(Math.max(this.state.sliderValue - 10, 0))
    }
  }

  private zoomOut = () => {
    if (this.state.sliderValue !== 100) {
      this.sliderChange(Math.min(this.state.sliderValue + 10, 100))
    }
  }

  private displaySizeChange = (width, height) => {
    const { slideParams } = this.state
    this.setState({
      slideParams: {
        ...slideParams,
        width,
        height
      }
    }, () => {
      this.sliderChange(this.state.sliderValue)
    })
  }

  private getChartData = (renderType: RenderType, itemId: number, widgetId: number, queryConditions?: Partial<IQueryConditions>) => {
    const {
      currentLayersInfo,
      widgets,
      // onLoadViewDataFromVizItem
      onViewExecuteQuery
    } = this.props

    const widget = widgets.find((w) => w.id === widgetId)
    const widgetConfig: IWidgetConfig = JSON.parse(widget.config)
    const { cols, rows, metrics, secondaryMetrics, filters, color, label, size, xAxis, tip, orders, cache, expired, view, engine } = widgetConfig
    const updatedCols = cols.map((col) => widgetDimensionMigrationRecorder(col))
    const updatedRows = rows.map((row) => widgetDimensionMigrationRecorder(row))
    const customOrders = updatedCols.concat(updatedRows)
      .filter(({ sort }) => sort && sort.sortType === FieldSortTypes.Custom)
      .map(({ name, sort }) => ({ name, list: sort[FieldSortTypes.Custom].sortList }))

    const cachedQueryConditions = currentLayersInfo[itemId].queryConditions

    let tempFilters
    let linkageFilters
    let globalFilters
    let tempOrders
    let variables
    let linkageVariables
    let globalVariables
    let pagination
    let nativeQuery
    if (queryConditions) {
      tempFilters = queryConditions.tempFilters !== void 0 ? queryConditions.tempFilters : cachedQueryConditions.tempFilters
      linkageFilters = queryConditions.linkageFilters !== void 0 ? queryConditions.linkageFilters : cachedQueryConditions.linkageFilters
      globalFilters = queryConditions.globalFilters !== void 0 ? queryConditions.globalFilters : cachedQueryConditions.globalFilters
      tempOrders = queryConditions.orders !== void 0 ? queryConditions.orders : cachedQueryConditions.orders
      variables = queryConditions.variables || cachedQueryConditions.variables
      linkageVariables = queryConditions.linkageVariables || cachedQueryConditions.linkageVariables
      globalVariables = queryConditions.globalVariables || cachedQueryConditions.globalVariables
      pagination = queryConditions.pagination || cachedQueryConditions.pagination
      nativeQuery = queryConditions.nativeQuery || cachedQueryConditions.nativeQuery
    } else {
      tempFilters = cachedQueryConditions.tempFilters
      linkageFilters = cachedQueryConditions.linkageFilters
      globalFilters = cachedQueryConditions.globalFilters
      tempOrders = cachedQueryConditions.orders
      variables = cachedQueryConditions.variables
      linkageVariables = cachedQueryConditions.linkageVariables
      globalVariables = cachedQueryConditions.globalVariables
      pagination = cachedQueryConditions.pagination
      nativeQuery = cachedQueryConditions.nativeQuery
    }

    let groups = cols.concat(rows).filter((g) => g.name !== '指标名称').map((g) => g.name)
    let aggregators =  metrics.map((m) => ({
      column: decodeMetricName(m.name),
      func: m.agg
    }))

    if (secondaryMetrics && secondaryMetrics.length) {
      aggregators = aggregators.concat(secondaryMetrics.map((second) => ({
        column: decodeMetricName(second.name),
        func: second.agg
      })))
    }

    if (color) {
      groups = groups.concat(color.items.map((c) => c.name))
    }
    if (label) {
      groups = groups.concat(label.items
        .filter((l) => l.type === 'category')
        .map((l) => l.name))
      aggregators = aggregators.concat(label.items
        .filter((l) => l.type === 'value')
        .map((l) => ({
          column: decodeMetricName(l.name),
          func: l.agg
        })))
    }
    if (size) {
      aggregators = aggregators.concat(size.items
        .map((s) => ({
          column: decodeMetricName(s.name),
          func: s.agg
        })))
    }
    if (xAxis) {
      aggregators = aggregators.concat(xAxis.items
        .map((l) => ({
          column: decodeMetricName(l.name),
          func: l.agg
        })))
    }
    if (tip) {
      aggregators = aggregators.concat(tip.items
        .map((t) => ({
          column: decodeMetricName(t.name),
          func: t.agg
        })))
    }


    const requestParamsFilters = filters.reduce((a, b) => {
      return a.concat(b.config.sqlModel)
    }, [])

    const requestParams = {
      groups: Array.from(new Set(groups)),
      aggregators,
      filters: requestParamsFilters,
      tempFilters,
      linkageFilters,
      globalFilters,
      variables,
      linkageVariables,
      globalVariables,
      orders,
      cache,
      expired,
      flush: renderType === 'flush',
      pagination,
      nativeQuery,
      customOrders
    }
    if (typeof view === 'object' && Object.keys(view).length > 0) requestParams.view = view

    if (engine) requestParams.engineType = engine

    if (tempOrders) {
      requestParams.orders = requestParams.orders.concat(tempOrders)
    }

    // onLoadViewDataFromVizItem(
    //   renderType,
    //   itemId,
    //   widget.viewId,
    //   requestParams
    // )
    
    // 本身这里源代码就少一个statistic参数，可能没啥用，先随便赋个{}
    const statistic = {}
    this.setState({executeQueryFailed: false})
    onViewExecuteQuery(renderType, itemId, widget.viewId, requestParams, statistic,  (result) => {
      const { execId } = result
      this.execIds.push(execId)
      this.executeQuery(execId, renderType, itemId, widget.viewId, requestParams, statistic, this)
    }, () => {
      this.setState({executeQueryFailed: true})
      return message.error('查询失败！')
    })
  }

  private timeout = []

  private executeQuery(execId, renderType, itemId, viewId, requestParams, statistic, that) {
    const { onViewGetProgress, onViewGetResult } = that.props
    // 空数据的话，会不请求数据，execId为undefined，这时候不需要getProgress
    if (execId) {
      onViewGetProgress(execId, (result) => {
        const { progress, status } = result
        if (status === 'Failed') {
          // 提示 查询失败（显示表格头，就和现在的暂无数据保持一致的交互，只是提示换成“查询失败”）
          that.setState({executeQueryFailed: true})
          that.deleteExecId(execId)
          return message.error('查询失败！')
        } else if (status === 'Succeed' && progress === 1) {
          // 查询成功，调用 结果集接口，status为success时，progress一定为1
          onViewGetResult(execId, renderType, itemId, viewId, requestParams, statistic, (result) => {
            that.deleteExecId(execId)
          }, () => {
            that.setState({executeQueryFailed: true})
            that.deleteExecId(execId)
            return message.error('查询失败！')
          })
        } else {
          // 说明还在运行中
          // 三秒后再请求一次进度查询接口
          const t = setTimeout(that.executeQuery, 3000, execId, renderType, itemId, viewId, requestParams, statistic, that)
          that.timeout.push(t)
        }
      }, () => {
        that.setState({executeQueryFailed: true})
        that.deleteExecId(execId)
        return message.error('查询失败！')
      })
    }
  }

  private updateCurrentLocalLayers = (
    itemId: number,
    { deltaX, deltaY, deltaWidth, deltaHeight }: { deltaX: number, deltaY: number, deltaWidth: number, deltaHeight: number },
    adjustType: IBaseline['adjustType']
  ) => {
    const editLayers = []
    const { currentLayersOperationInfo, onShowEditorBaselines } = this.props
    const { currentLocalLayers, slideParams, zoomRatio } = this.state
    const copyCurrentLocalLayers = fromJS(currentLocalLayers).toJS()

    editLayers.push(copyCurrentLocalLayers.find((localLayer) => localLayer.id === itemId))
    if (currentLayersOperationInfo[editLayers[0].id].selected) {
      editLayers.splice(0, 1, ...copyCurrentLocalLayers.filter((localLayer) => currentLayersOperationInfo[localLayer.id].selected))
    }
    const otherLayers = copyCurrentLocalLayers.filter((localLayer) => editLayers.map((l) => l.id).indexOf(localLayer.id) < 0)

    const baselines = computeEditorBaselines(otherLayers, editLayers, slideParams as ISlideParams,
      GRID_ITEM_MARGIN / 2, zoomRatio, { deltaX, deltaY, deltaWidth, deltaHeight }, adjustType)
    onShowEditorBaselines(baselines)
    const adjustPosition = [0, 0]
    const adjustSize = [0, 0]
    baselines.forEach((bl) => {
      switch (bl.adjustType) {
        case 'position':
          adjustPosition[0] += bl.adjust[0]
          adjustPosition[1] += bl.adjust[1]
          break
        case 'size':
          adjustSize[0] += bl.adjust[0]
          adjustSize[1] += bl.adjust[1]
      }
    })

    editLayers.forEach((localLayer) => {
      const layerParams = JSON.parse(localLayer.params)
      const { positionX, positionY, width, height } = layerParams
      localLayer.params = JSON.stringify({
        ...layerParams,
        positionX: Math.round(positionX + deltaX + adjustPosition[0]),
        positionY: Math.round(positionY + deltaY + adjustPosition[1]),
        width: Math.round(width + deltaWidth + adjustSize[0]),
        height: Math.round(height + deltaHeight + adjustSize[1])
      })
    })

    this.setState({ currentLocalLayers: copyCurrentLocalLayers })
    return editLayers
  }

  private dragLayer = (itemId, delta) => {
    const editLayers = this.updateCurrentLocalLayers(itemId, {
      ...delta,
      deltaWidth: 0,
      deltaHeight: 0
    }, 'position')
    this.props.toggleLayersDraggingStatus(editLayers.map((l) => l.id), true)
  }

  private dragLayerStop = (itemId, delta) => {
    const editLayers = this.updateCurrentLocalLayers(itemId, {
      ...delta,
      deltaWidth: 0,
      deltaHeight: 0
    }, 'position')
    this.onEditLayers(editLayers)
    const { onClearEditorBaselines, toggleLayersDraggingStatus } = this.props
    toggleLayersDraggingStatus(editLayers.map((l) => l.id), false)
    onClearEditorBaselines()
  }

  private resizeLayer = (itemId, delta) => {
    const editLayers = this.updateCurrentLocalLayers(itemId, {
      ...delta,
      deltaX: 0,
      deltaY: 0
    }, 'size')
    this.props.toggleLayersResizingStatus(editLayers.map((l) => l.id), true)
  }

  private resizeLayerStop = (itemId, delta) => {
    const { onResizeLayers } = this.props
    const editLayers = this.updateCurrentLocalLayers(itemId, {
      ...delta,
      deltaX: 0,
      deltaY: 0
    }, 'size')
    this.onEditLayers(editLayers)
    onResizeLayers(editLayers.map((layer) => layer.id))
    this.props.toggleLayersResizingStatus(editLayers.map((l) => l.id), false)
  }

  // 设置展示模式为静态模式或者是动态模式
  private setDisplayMode = (value) => {
    const widgetDOMs = document.getElementsByClassName('widget-class')
    const paginationDOMs = document.getElementsByClassName('ant-pagination')
    const tableHeaderDOMs = document.getElementsByClassName('ant-table-header')
    const tableBodyDOMs = document.getElementsByClassName('ant-table-body')
    const tableWrapperDOMs = document.getElementsByClassName('ant-table-wrapper')
    if (value === 'static') {
      // 静态模式，隐藏掉所有滚动条和分页组件
      for (let i = 0; i < widgetDOMs.length; i++) {
        widgetDOMs[i].style.overflow = 'hidden'
      }
      for (let i = 0; i < tableHeaderDOMs.length; i++) {
        tableHeaderDOMs[i].style.setProperty('overflow', 'hidden', 'important')
      }
      for (let i = 0; i < tableBodyDOMs.length; i++) {
        tableBodyDOMs[i].style.overflow = 'hidden'
      }
      for (let i = 0; i < tableWrapperDOMs.length; i++) {
        tableWrapperDOMs[i].style.overflow = 'hidden'
      }
      for (let i = 0; i < paginationDOMs.length; i++) {
        paginationDOMs[i].style.display = 'none'
      }
    } else {
      // 动态模式 恢复原值
      for (let i = 0; i < widgetDOMs.length; i++) {
        widgetDOMs[i].style.overflow = 'auto hidden'
      }
      for (let i = 0; i < tableHeaderDOMs.length; i++) {
        tableHeaderDOMs[i].style.overflow = ''
        tableHeaderDOMs[i].style.overflowX = 'hidden !important'
        tableHeaderDOMs[i].style.overflowY = 'scroll !important'
      }
      for (let i = 0; i < tableBodyDOMs.length; i++) {
        tableBodyDOMs[i].style.overflow = ''
        tableBodyDOMs[i].style.overflowY = 'auto'
      }
      for (let i = 0; i < tableWrapperDOMs.length; i++) {
        tableWrapperDOMs[i].style.overflowY = 'scroll'
        tableWrapperDOMs[i].style.overflow = ''
      }
      for (let i = 0; i < paginationDOMs.length; i++) {
        paginationDOMs[i].style.display = ''
      }
    }
  }

  private formItemChange = (field, val) => {
    const { slideParams, currentLocalLayers } = this.state

    const {
      currentDisplay,
      currentSlide,
      currentSelectedLayers,
      onEditCurrentSlide } = this.props

    if (currentSelectedLayers.length === 1) {
      const selectedLayer = currentSelectedLayers[0]
      const newParams = JSON.stringify({
        ...JSON.parse(selectedLayer['params']),
        [field]: val
      })
      this.setState({
        currentLocalLayers: currentLocalLayers.map((layer) => (
          layer.id !== selectedLayer.id ? layer
            : {
              ...layer,
              params: newParams
            }
        ))
      }, () => {
        this.onEditLayers([{
          ...selectedLayer,
          params: newParams
        }])
      })
    } else {
      const newSlideParams = {
        ...slideParams,
        [field]: val
      }
      this.setState({
        slideParams: { ...newSlideParams }
      }, () => {
        const newConfig = {
          ...JSON.parse(currentSlide.config),
          slideParams: newSlideParams
        }
        onEditCurrentSlide(currentDisplay.id, {
          ...currentSlide,
          config: JSON.stringify(newConfig)
        })
      })
    }
  }

  private deleteLayers = () => {
    const { currentDisplay, currentSlide, currentLayersOperationInfo } = this.props
    const ids = Object.keys(currentLayersOperationInfo).filter((id) => currentLayersOperationInfo[id].selected)
    if (ids.length <= 0) {
      message.warning('请选择图层')
      return
    }
    this.props.onDeleteDisplayLayers(currentDisplay.id, currentSlide.id, ids)
  }

  private onEditLayers = (layers) => {
    const { currentDisplay, currentSlide, onEditDisplayLayers } = this.props
    onEditDisplayLayers(currentDisplay.id, currentSlide.id, layers)
  }

  private addLayers = (layers: any[], viewIds?: number[]) => {
    if (!Array.isArray(layers)) { return }

    const {
      currentDisplay,
      currentSlide,
      currentLayers,
      formedViews,
      onAddDisplayLayers,
      onLoadViewsDetail
    } = this.props
    const { slideParams } = this.state
    let maxLayerIndex = currentLayers.length === 0 ?
      0 :
      currentLayers.reduce((acc, layer) => Math.max(acc, layer.index), -Infinity)
    layers.forEach((layer) => {
      layer.index = ++maxLayerIndex
      layer.displaySlideId = currentSlide.id
      layer['params'] = JSON.stringify({
        ...JSON.parse(layer['params']),
        width: (slideParams.width - GRID_ITEM_MARGIN * 5) / 4,
        height: (slideParams.height - GRID_ITEM_MARGIN * 5) / 4,
        positionX: GRID_ITEM_MARGIN,
        positionY: GRID_ITEM_MARGIN
      })
    })
    if (viewIds && viewIds.length) {
      const loadViewIds = viewIds.filter((viewId) => typeof viewId === 'number' && viewId > 0 && !formedViews[viewId])

      if (loadViewIds.length) {
        onLoadViewsDetail(loadViewIds, () => {
          onAddDisplayLayers(currentDisplay.id, currentSlide.id, layers)
        })
        return
      }
    }
    onAddDisplayLayers(currentDisplay.id, currentSlide.id, layers)
  }

  private copyLayers = () => {
    const { currentSlide, currentSelectedLayers, onCopySlideLayers } = this.props
    if (!currentSelectedLayers.length) {
      message.warning('请选择图层')
      return
    }
    const { slideParams } = this.state
    const copyLayers = currentSelectedLayers.map((layer) => {
      const layerParams = JSON.parse(layer.params)
      const { positionX, positionY } = layerParams
      return {
        ...layer,
        params: JSON.stringify({
          ...layerParams,
          positionX: positionX + GRID_ITEM_MARGIN,
          positionY: positionY + GRID_ITEM_MARGIN
        }),
        id: null
      }
    })
    onCopySlideLayers(currentSlide.id, copyLayers)
  }

  private pasteLayers = () => {
    if (this.state.currentLocalLayers && this.state.currentLocalLayers.length >= MAX_LAYER_COUNT) return message.warning(`当前最多只支持添加${MAX_LAYER_COUNT}个图层`, 5);
    const { currentDisplay, currentSlide, clipboardLayers, onPasteSlideLayers } = this.props
    if (!clipboardLayers.length) { return }
    onPasteSlideLayers(currentDisplay.id, currentSlide.id, clipboardLayers)
  }

  private scaleChange = (nextScale: number) => {
    this.setState({ scale: nextScale })
  }

  private coverCut = () => {
    this.editor.current.createCoverCut()
  }

  private coverCutCreated = (blob) => {
    const { currentDisplay, currentSlide, onUploadCurrentSlideCover, onEditCurrentDisplay } = this.props
    onUploadCurrentSlideCover(blob, (avatar) => {
      onEditCurrentDisplay({
        ...currentDisplay,
        avatar
      })
    })
  }

  private coverUpdated = (avatar) => {
    const { onEditCurrentDisplay, currentDisplay } = this.props
    onEditCurrentDisplay({
      ...currentDisplay,
      avatar
    })
  }

  private collapseChange = () => {
    this.setState({
      zoomRatio: this.state.zoomRatio - 0.0001
    })
  }

  private keyDown = (key: Keys) => {
    const { slideParams } = this.state
    switch (key) {
      case Keys.Up:
        this.moveSelectedLayersPosition({ positionXD: 0, positionYD: -1 })
        break
      case Keys.Down:
        this.moveSelectedLayersPosition({ positionXD: 0, positionYD: 1 })
        break
      case Keys.Left:
        this.moveSelectedLayersPosition({ positionXD: -1, positionYD: 0 })
        break
      case Keys.Right:
        this.moveSelectedLayersPosition({ positionXD: 1, positionYD: 0 })
        break
      case Keys.Delete:
        this.deleteLayers()
        break
      case Keys.Copy:
        this.copyLayers()
        break
      case Keys.Paste:
        this.pasteLayers()
        break
      case Keys.UnDo:
        this.undo()
        break
      case Keys.Redo:
        this.redo()
        break
    }
  }

  private moveSelectedLayersPosition = (direction: { positionXD: number, positionYD: number }) => {
    const { currentSelectedLayers } = this.props
    if (currentSelectedLayers.length <= 0) { return }
    const { positionXD, positionYD } = direction
    const { currentDisplay, currentSlide, onEditDisplayLayers } = this.props
    const { slideParams } = this.state
    const { width: slideWidth, height: slideHeight } = slideParams
    const layers = currentSelectedLayers.map((layer) => {
      const layerParams: ILayerParams = JSON.parse(layer.params)
      const { positionX, positionY, width, height } = layerParams
      let newPositionX = positionXD === 0 ? positionX : (positionX + positionXD)
      let newPositionY = positionYD === 0 ? positionY : (positionY + positionYD)
      if (newPositionX < 0) {
        newPositionX = 0
      }
      if (newPositionX + width > slideWidth) {
        newPositionX = slideWidth - width
      }
      if (newPositionY < 0) {
        newPositionY = 0
      }
      if (newPositionY + height > slideHeight) {
        newPositionY = slideHeight - height
      }
      return {
        ...layer,
        params: JSON.stringify({
          ...layerParams,
          positionX: newPositionX,
          positionY: newPositionY
        })
      }
    })
    onEditDisplayLayers(currentDisplay.id, currentSlide.id, layers)
  }

  private undo = () => {
    const { onUndo, currentState, canUndo } = this.props
    if (canUndo) {
      onUndo(currentState)
    }
  }

  private redo = () => {
    const { onRedo, nextState, canRedo } = this.props
    if (canRedo) {
      onRedo(nextState)
    }
  }

  private layersSelectionRemove = () => {
    const { onClearLayersSelection } = this.props
    onClearLayersSelection()
  }

  private getEditorBaselines = () => {
    const { editorBaselines } = this.props

    const domBaselines = editorBaselines.map((bl, idx) => {
      const { top, right, bottom, left } = bl
      const style: React.CSSProperties = {
        position: 'absolute',
        zIndex: 999999,
        top: `${top}px`,
        right: `${right}px`,
        bottom: `${bottom}px`,
        left: `${left}px`,
        backgroundColor: DEFAULT_BASELINE_COLOR
      }
      return (<div key={`baseline_${idx}`} className={styles.baseline} style={style} />)
    })

    return domBaselines
  }

  private toWorkbench = (_, widgetId) => {
    const { params } = this.props
    const { pid, displayId } = params
    const editSign = [pid, displayId].join(DEFAULT_SPLITER)
    sessionStorage.setItem('editWidgetFromDisplay', editSign)
    this.props.router.push(`/project/${pid}/widget/${widgetId}`)
  }

  public render () {
    const {
      params,
      currentLayersInfo,
      currentLayersOperationInfo,
      currentSelectedLayers,
      widgets,
      formedViews,
      currentDisplay,
      onSelectLayer,
      onLoadDisplayShareLink,
      canUndo,
      canRedo
    } = this.props

    const {
      slideParams,
      currentLocalLayers,
      zoomRatio,
      sliderValue,
      scale,
      settingInfo,
      executeQueryFailed
    } = this.state

    if (!currentDisplay) { return null }

    const layerItems = !Array.isArray(widgets) ? null : currentLocalLayers.map((layer, idx) => {
      const widget = widgets.find((w) => w.id === layer.widgetId)
      let model = {}
      if (widget) {
        if (widget.viewId) {
          model = widget && formedViews[widget.viewId].model
        } else {
          const config = JSON.parse(widget.config)
          model = config.model
        }
      }
      const layerId = layer.id

      const { polling, frequency } = JSON.parse(layer.params)
      const { datasource, loading, interactId, rendered, renderType } = currentLayersInfo[layerId]
      const { selected, resizing, dragging } = currentLayersOperationInfo[layerId]

      return (
        // <LayerContextMenu key={layer.id}>
        <LayerItem
          key={layer.id}
          pure={false}
          scale={[scale, scale]}
          slideParams={slideParams}
          layer={layer}
          selected={selected}
          resizing={resizing}
          dragging={dragging}
          itemId={layerId}
          widget={widget}
          model={model}
          datasource={datasource}
          loading={loading}
          polling={polling}
          frequency={frequency}
          interactId={interactId}
          rendered={rendered}
          renderType={renderType}
          onSelectLayer={onSelectLayer}
          onGetChartData={this.getChartData}
          onDragLayer={this.dragLayer}
          onResizeLayer={this.resizeLayer}
          onResizeLayerStop={this.resizeLayerStop}
          onDragLayerStop={this.dragLayerStop}
          onEditWidget={this.toWorkbench}
          executeQueryFailed={executeQueryFailed}
        />
        // </LayerContextMenu>
      )
    })

    const baselines = this.getEditorBaselines()

    let settingContent = null
    if (currentSelectedLayers.length > 1) {
      // 如果当前同时选择了两个layer，则显示 LayerAlign，进行图层间的对齐设置
      settingContent = (
        <LayerAlign
          layers={currentSelectedLayers}
          onEditDisplayLayers={this.onEditLayers}
          onCollapseChange={this.collapseChange}
        />
      )
    } else if (settingInfo.id) {
      // 如果当前只选择了一个layer，或者一个都没选时，则显示下面的内容
      settingContent = (
        // 最右侧的 设置栏
        <SettingForm
          currentLocalLayers={currentLocalLayers}
          key={settingInfo.key}
          id={settingInfo.id}
          // 设置项
          settingInfo={settingInfo.setting}
          settingParams={settingInfo.param}
          onDisplaySizeChange={this.displaySizeChange}
          onFormItemChange={this.formItemChange}
          onCollapseChange={this.collapseChange}
        >
          {currentSelectedLayers.length === 0 ? (
            // 最右下角的 封面 部分
            <DisplaySetting
              key="displaySetting"
              display={currentDisplay}
              onCoverCut={this.coverCut}
              onCoverUpdated={this.coverUpdated}
            />
          ) : null}
        </SettingForm>
      )
    }

    return (
      <div className={`${styles.preview} ${styles.edit}`}>
        <Helmet title={currentDisplay.name} />
        {/* 顶栏 */}
        <DisplayHeader
          layers={currentLocalLayers}
          display={currentDisplay}
          widgets={widgets}
          params={params}
          onAddLayers={this.addLayers}
          onDeleteLayers={this.deleteLayers}
          onCopyLayers={this.copyLayers}
          onPasteLayers={this.pasteLayers}
          onLoadDisplayShareLink={onLoadDisplayShareLink}
          onUndo={this.undo}
          onRedo={this.redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <DisplayBody>
          {/* 左侧的大容器 */}
          <DisplayContainer
            key="editor"
            slideParams={slideParams}
            sliderValue={sliderValue}
            zoomRatio={zoomRatio}
            onScaleChange={this.scaleChange}
            onCoverCutCreated={this.coverCutCreated}
            onKeyDown={this.keyDown}
            onLayersSelectionRemove={this.layersSelectionRemove}
            ref={this.editor}
          >
            {[...baselines, ...layerItems]}
          </DisplayContainer>
          {/* 左侧底部的 */}
          <DisplayBottom
            scale={scale}
            sliderValue={sliderValue}
            onZoomIn={this.zoomIn}
            onZoomOut={this.zoomOut}
            onSliderChange={this.sliderChange}
          />
          {/* 右侧的两栏 */}
          <DisplaySidebar>
            {/* 图层列表 */}
            <LayerList
              layers={currentLocalLayers}
              layersStatus={currentLayersOperationInfo}
              selectedLayers={currentSelectedLayers}
              onSelectLayer={onSelectLayer}
              onEditDisplayLayers={this.onEditLayers}
              onCollapseChange={this.collapseChange}
            />
            {/* 最右侧的设置栏 */}
            {settingContent}
          </DisplaySidebar>
        </DisplayBody>
      </div>
    )
  }
}

const mapStateToProps = createStructuredSelector({
  widgets: makeSelectWidgets(),
  formedViews: makeSelectFormedViews(),
  displays: makeSelectDisplays(),
  currentDisplay: makeSelectCurrentDisplay(),
  currentSlide: makeSelectCurrentSlide(),
  currentLayers: makeSelectCurrentLayers(),
  currentLayersInfo: makeSelectCurrentLayersInfo(),
  currentLayersOperationInfo: makeSelectCurrentLayersOperationInfo(),
  clipboardLayers: makeSelectClipboardLayers(),
  currentSelectedLayers: makeSelectCurrentSelectedLayers(),
  canUndo: makeSelectCanUndo(),
  canRedo: makeSelectCanRedo(),
  currentState: makeSelectCurrentState(),
  nextState: makeSelectNextState(),
  editorBaselines: makeSelectEditorBaselines()
})

function mapDispatchToProps (dispatch) {
  return {
    onLoadDisplayDetail: (projectId, displayId) => dispatch(DisplayActions.loadDisplayDetail(projectId, displayId)),
    onEditCurrentDisplay: (display, resolve?) => dispatch(DisplayActions.editCurrentDisplay(display, resolve)),
    onEditCurrentSlide: (displayId, slide, resolve?) => dispatch(DisplayActions.editCurrentSlide(displayId, slide, resolve)),
    onUploadCurrentSlideCover: (cover, resolve) => dispatch(DisplayActions.uploadCurrentSlideCover(cover, resolve)),
    onLoadViewDataFromVizItem: (renderType, itemId, viewId, requestParams, statistic) => dispatch(loadViewDataFromVizItem(renderType, itemId, viewId, requestParams, 'display', statistic)),
    onViewExecuteQuery: (renderType, itemId, viewId, requestParams, statistic, resolve, reject) => dispatch(loadViewExecuteQuery(renderType, itemId, viewId, requestParams, 'display', statistic, resolve, reject)),
    onViewGetProgress: (execId, resolve, reject) => dispatch(loadViewGetProgress(execId, resolve, reject)),
    onViewGetResult: (execId, renderType, itemId, viewId, requestParams, statistic, resolve, reject) => dispatch(loadViewGetResult(execId, renderType, itemId, viewId, requestParams, 'display', statistic, resolve, reject)),
    onViewKillExecute: (execId, resolve, reject) => dispatch(loadViewKillExecute(execId, resolve, reject)),

    onLoadViewsDetail: (viewIds, resolve) => dispatch(loadViewsDetail(viewIds, resolve)),
    onSelectLayer: ({ id, selected, exclusive }) => dispatch(DisplayActions.selectLayer({ id, selected, exclusive })),
    onClearLayersSelection: () => dispatch(DisplayActions.clearLayersSelection()),
    onDragSelectedLayer: (id, deltaX, deltaY) => dispatch(DisplayActions.dragSelectedLayer({ id, deltaX, deltaY })),
    onResizeLayers: (layerIds) => dispatch(DisplayActions.resizeLayers(layerIds)),
    toggleLayersResizingStatus: (layerIds, resizing) => dispatch(DisplayActions.toggleLayersResizingStatus(layerIds, resizing)),
    toggleLayersDraggingStatus: (layerIds, dragging) => dispatch(DisplayActions.toggleLayersDraggingStatus(layerIds, dragging)),
    onAddDisplayLayers: (displayId, slideId, layers) => dispatch(DisplayActions.addDisplayLayers(displayId, slideId, layers)),
    onDeleteDisplayLayers: (displayId, slideId, ids) => dispatch(DisplayActions.deleteDisplayLayers(displayId, slideId, ids)),
    onEditDisplayLayers: (displayId, slideId, layers) => dispatch(DisplayActions.editDisplayLayers(displayId, slideId, layers)),
    onCopySlideLayers: (slideId, layers) => dispatch(DisplayActions.copySlideLayers(slideId, layers)),
    onPasteSlideLayers: (displayId, slideId, layers) => dispatch(DisplayActions.pasteSlideLayers(displayId, slideId, layers)),
    onLoadDisplayShareLink: (id, authName) => dispatch(DisplayActions.loadDisplayShareLink(id, authName)),
    onUndo: (currentState) => dispatch(DisplayActions.undoOperation(currentState)),
    onRedo: (nextState) => dispatch(DisplayActions.redoOperation(nextState)),
    onHideNavigator: () => dispatch(hideNavigator()),

    onShowEditorBaselines: (baselines) => dispatch(DisplayActions.showEditorBaselines(baselines)),
    onClearEditorBaselines: () => dispatch(DisplayActions.clearEditorBaselines()),
    onResetDisplayState: () => dispatch(DisplayActions.resetDisplayState())
  }
}

const withConnect = connect<{}, {}, IEditorProps>(mapStateToProps, mapDispatchToProps)

const withReducer = injectReducer({ key: 'display', reducer })
const withSaga = injectSaga({ key: 'display', saga })

const withReducerWidget = injectReducer({ key: 'widget', reducer: reducerWidget })
const withSagaWidget = injectSaga({ key: 'widget', saga: sagaWidget })

const withReducerView = injectReducer({ key: 'view', reducer: reducerView })
const withSagaView = injectSaga({ key: 'view', saga: sagaView })

export default compose(
  withReducer,
  withReducerWidget,
  withReducerView,
  withSaga,
  withSagaWidget,
  withSagaView,
  withConnect)(Editor)
