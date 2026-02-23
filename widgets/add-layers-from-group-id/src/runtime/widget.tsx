import { DataSourceManager, dataSourceUtils, type IMDataSourceJson, React, ServiceManager, type AllWidgetProps, type FeatureLayerDataSource } from 'jimu-core'
import type { IMConfig } from '../config'
import PortalGroup from 'esri/portal/PortalGroup'
import Portal from 'esri/portal/Portal'
import { type JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [group, setGroup] = React.useState<__esri.PortalGroup>()
  const [jimuMapView, setJimuMapView] = React.useState<JimuMapView>()


  const handleButtonClick = () => {
    console.log('handleButtonClick')

    const portalUrl = 'https://prof-services.maps.arcgis.com'

    const group = new PortalGroup({
      id: '5ef8e289c7794375ade879288218707b',
      // title: props.user?.groups.find((group) => group.id === id)?.title,
      portal: new Portal({ url: portalUrl })
    })
    setGroup(group)
  }



  // This function from
  // https://github.com/Esri/arcgis-experience-builder-sdk-resources/blob/2555bab6f298ce198164095c80b333dac133144c/widgets/data-source-widgets/runtime-data-source-without-saving-to-config/src/runtime/widget.tsx#L77C1-L96C2
  const fetchDataSourceJson = async (
    dsId: string,
    item: __esri.PortalItem,
  ): Promise<IMDataSourceJson> => {
    if (!item.url) {
      return Promise.reject(new Error('Need URL.'))
    }

    console.log('creating from url', item.url)

    let normalizedUrl = item.url
    normalizedUrl = normalizedUrl.split('?')[0]
    normalizedUrl = normalizedUrl
      .replace(/^http:/, 'https:')
      .replace(/\/+$/, '')

    // if (!/\d+$/.test(normalizedUrl)) {
    //   return Promise.reject(new Error('The URL should end up with the layer ID.'))
    // }

    const layerDefinition = await ServiceManager.getInstance()
      .fetchServiceInfo(item.url)
      .then((res) => res.definition)
    // You can create data source json by a Maps SDK layer.
    // const dsJson = dataSourceUtils.dataSourceJsonCreator.createDataSourceJsonByJSAPILayer(dsId, mapsSDKLayer)
    const dsJson =
      dataSourceUtils.dataSourceJsonCreator.createDataSourceJsonByLayerDefinition(
        dsId,
        layerDefinition,
        normalizedUrl,
      )

    return dsJson
  }

  const onGroupChange = async (
    group: __esri.PortalGroup,
    mapView: JimuMapView,
  ): Promise<void> => {
    try {
      // query group items for layers
      const query = `(type: "Feature Service" OR type: "Map Service")`
      const { results: items } = (await group.queryItems({
        query,
        num: 100,
        sortField: 'title',
        sortOrder: 'asc',
      })) as { results: __esri.PortalItem[] }

      // hydrate read / write layers
      const { read, write } = props.config
      for (const [key, { urlRegex, layers }] of Object.entries({
        read,
        write
      })) {
        const item = items.find(({ url }) => new RegExp(urlRegex).test(url))
        if (!item) {
          console.log('could not find regex ', urlRegex, 'in ', items)
        }

        // create layers from item
        const dataSourceManager = DataSourceManager.getInstance()
        const dataSourceId = `${props.widgetId}-${item.id}`
        console.log('dataSourceId', dataSourceId)
        console.log('item', item)
        const dataSource = (await dataSourceManager.createDataSource({
          id: dataSourceId,
          dataSourceJson: await fetchDataSourceJson(dataSourceId, item),
          // dataSourceJson: dataSourceUtils.dataSourceJsonCreator
          //   .createDataSourceJsonByItemInfo(
          //     dataSourceId,
          //     { ...item } as IItem,
          //     props.portalUrl,
          //   )
          //   ?.asMutable({ deep: true }),
        }))

        const entries: Array<[string, __esri.FeatureLayer]> = []
        for (const [layerKey, { layerId, map, visible }] of Object.entries(
          layers,
        )) {
          // build layers
          const childDataSource = (await dataSource.createDataSourceById(
            `${dataSourceId}-${layerId}`,
          )) as FeatureLayerDataSource
          console.log('childDataSource.id', childDataSource.id)
          const layer = (await childDataSource.createJSAPILayerByDataSource(
            childDataSource,
          )) as __esri.FeatureLayer
          layer.visible = visible ?? true
          console.log('layer', layer)

          if (!layer.isTable) {
            // await mapView?.addLayerAndCreateJimuLayerView(layer, childDataSource);
            await mapView?.addLayerToMap(childDataSource.id, layerId)
          }
          entries.push([layerKey, layer])
        }

        console.log('entries', entries)
        // const hydrated = Object.fromEntries(entries)

        // update state with hydrated layers
        // setLayers((layers) => ({
        //   ...layers,
        //   [key]: {
        //     ...layers[key],
        //     ...hydrated,
        //   },
        // }))
      }
    } catch (error) {
      // reset(true)
      // openAlert({
      //   title: translate('groups_error_title', { name: group.title }),
      //   message: error.message,
      //   kind: 'danger',
      //   autoCloseDuration: 'medium',
      // })
      console.error(error, group.title)
    }
  }

  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (jmv) {
      setJimuMapView(jmv)
    }
  }

  React.useEffect(() => {
    if (group && jimuMapView) {
      onGroupChange(group, jimuMapView)
    }
  }, [jimuMapView, group])

  return (
    <div className="widget-demo jimu-widget m-2">
      {props.useMapWidgetIds && props.useMapWidgetIds.length === 1 && (
        <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds?.[0]} onActiveViewChange={activeViewChangeHandler} />
      )}
      <button type="button" className="btn btn-primary" onClick={handleButtonClick}>
        Add layers
      </button>
    </div>
  )
}

export default Widget
