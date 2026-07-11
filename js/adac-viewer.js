(function () {
  const root = document.getElementById("adac-viewer");
  if (!root) return;
  const viewerScriptUrl = document.currentScript?.src || new URL("js/adac-viewer.js", document.baseURI).href;

  const reportPage = {
    width: 841.8898,
    height: 595.2756,
    marginX: 26,
    headerY: 16,
    headerHeight: 28,
    contentTop: 58,
    footerHeight: 28,
    contentBottom: 595.2756 - 42,
    assetColumnsPerTable: 5,
  };

  const reportBusinessName = "ADACT SOLUTIONS PTY LTD";
  const reportRegistrationLine = "ABN 62 700 080 155 | ACN 700 080 155";
  const reportContactEmail = "projects@adact.com.au";
  const reportLogoPath = "img/LOGO-Black-Transparent.png";
  let reportLogoImagePromise = null;
  let xmlValidatorPromise = null;
  const schemaBundleCache = new Map();
  const schemaValueLookupCache = new Map();

  const adacSchemaConfigs = {
    v5: {
      key: "v5",
      label: "ADAC 5.0.1",
      version: "5.0.1",
      basePath: "schemas/adac/5.0.1/",
      rootFile: "ADAC_V501.xsd",
      files: [
        "ADAC_V501.xsd",
        "ADACStringTypes.xsd",
        "ADACEnhancements.xsd",
        "ADACEnumeratedTypes_Generic.xsd",
        "ADACGlobalTypes.xsd",
        "ADACTransport.xsd",
        "ADACSewerage.xsd",
        "ADACOpenSpace.xsd",
        "ADACWaterSupply.xsd",
        "ADACStormWater.xsd",
        "ADACSurface.xsd",
        "ADACSupplementary.xsd",
        "ADACCadastre.xsd",
        "ADACGeometry.xsd",
        "ADACEnumeratedTypes.xsd",
      ],
    },
    v6: {
      key: "v6",
      label: "ADAC 6.0.0",
      version: "6.0.0",
      basePath: "schemas/adac/6.0.0/",
      rootFile: "ADAC_V600.xsd",
      files: [
        "ADAC_V600.xsd",
        "ADACCommunication.xsd",
        "ADACStringTypes.xsd",
        "ADACEnhancements.xsd",
        "ADACGlobalTypes.xsd",
        "ADACTransport.xsd",
        "ADACSewerage.xsd",
        "ADACElectrical.xsd",
        "ADACOpenSpace.xsd",
        "ADACWaterSupply.xsd",
        "ADACStormWater.xsd",
        "ADACSurface.xsd",
        "ADACSupplementary.xsd",
        "ADACCadastre.xsd",
        "ADACGeometry.xsd",
        "ADACEnumeratedTypes.xsd",
      ],
    },
  };

  const layerPalette = {
    Water: "#1268c4",
    Sewer: "#6f42c1",
    Stormwater: "#13a66b",
    Transport: "#e08b24",
    Surface: "#8a9a3b",
    Cadastre: "#5d6f84",
    OpenSpace: "#5f785f",
    Telecommunications: "#c53b74",
    Electrical: "#d0a400",
    Enhancements: "#7f8da3",
    Supplementary: "#2b8c9f",
    Other: "#122033",
  };

  const planPreviewStyleDefinitions = {
    cadastre_lot: planStyle("cadastre_lot", "#ff00ff", 10, 0.13, 1.2),
    cadastre_road_reserve: planStyle("cadastre_road_reserve", "#000000", 10, 0.13, 1.2),
    cadastre_easement: planStyle("cadastre_easement", "#ffff00", 11, 0.13, 1.2),
    survey_mark: planStyle("survey_mark", "#282828", 12, 0.18, 0.85),
    surface_contour: planStyle("surface_contour", "#5a5a5a", 0, 0.13, 1.2),
    water_pipe: planStyle("water_pipe", "#0000ff", 20, 0.35, 1.2),
    water_fitting: planStyle("water_fitting", "#0000ff", 25, 0.25, 1),
    water_valve: planStyle("water_valve", "#0000ff", 26, 0.25, 1),
    water_hydrant: planStyle("water_hydrant", "#0000ff", 27, 0.25, 1),
    water_meter: planStyle("water_meter", "#0000ff", 28, 0.25, 0.9),
    water_service: planStyle("water_service", "#0000ff", 29, 0.25, 1.2),
    sewer_pipe: planStyle("sewer_pipe", "#6f42c1", 30, 0.35, 1.2),
    sewer_connection: planStyle("sewer_connection", "#6f42c1", 31, 0.25, 1.2),
    sewer_node: planStyle("sewer_node", "#6f42c1", 35, 0.25, 1.1),
    sewer_fitting: planStyle("sewer_fitting", "#6f42c1", 34, 0.25, 0.95),
    stormwater_pipe: planStyle("stormwater_pipe", "#00ff00", 36, 0.3, 1.2),
    stormwater_pit: planStyle("stormwater_pit", "#00ff00", 37, 0.25, 1),
    stormwater_end_structure: planStyle("stormwater_end_structure", "#00ff00", 37, 0.25, 1),
    stormwater_wsud: planStyle("stormwater_wsud", "#00ff00", 38, 0.2, 1.2, "rgba(223, 244, 215, 0.72)"),
    stormwater_surface_drain: planStyle("stormwater_surface_drain", "#00ff00", 39, 0.25, 1.2),
    transport_roadedge: planStyle("transport_roadedge", "#000000", 46, 0.25, 1.2),
    transport_pathway: planStyle("transport_pathway", "#787878", 41, 0.25, 1.2),
    transport_pavement: planStyle("transport_pavement", "#a5a5a5", 42, 0.18, 1.2),
    transport_parking: planStyle("transport_parking", "#919191", 43, 0.18, 1.2),
    transport_roadisland: planStyle("transport_roadisland", "#878787", 44, 0.18, 1.2),
    transport_pramramp: planStyle("transport_pramramp", "#5f5f5f", 45, 0.2, 0.95),
    open_space_area: planStyle("open_space_area", "#6f8a6f", 40, 0.13, 1.2, "rgba(111, 138, 111, 0.16)"),
    open_space_sign: planStyle("open_space_sign", "#555555", 47, 0.2, 0.95),
    open_space_electrical_conduit: planStyle("open_space_electrical_conduit", "#505050", 47, 0.2, 1.2),
    open_space_electrical_pit: planStyle("open_space_electrical_pit", "#4b4b4b", 48, 0.18, 0.95),
    open_space_electrical_light: planStyle("open_space_electrical_light", "#967d37", 48, 0.18, 0.95),
    open_space_communication_conduit: planStyle("open_space_communication_conduit", "#5f5f5f", 47, 0.2, 1.2),
    open_space_communication_pit: planStyle("open_space_communication_pit", "#555555", 48, 0.18, 0.95),
    open_space_irrigation_pipe: planStyle("open_space_irrigation_pipe", "#466946", 47, 0.2, 1.2),
    open_space_irrigation_fitting: planStyle("open_space_irrigation_fitting", "#465f46", 48, 0.18, 0.95),
    open_space_landscape_area: planStyle("open_space_landscape_area", "#5f785f", 40, 0.14, 1.2, "rgba(95, 120, 95, 0.18)"),
    open_space_edging: planStyle("open_space_edging", "#5f785f", 46, 0.16, 1.05),
    open_space_tree: planStyle("open_space_tree", "#466946", 49, 0.18, 1.15),
    open_space_activity_area: planStyle("open_space_activity_area", "#78785f", 40, 0.14, 1.2, "rgba(120, 120, 95, 0.18)"),
    open_space_activity_point: planStyle("open_space_activity_point", "#69694b", 49, 0.18, 0.95),
    open_space_barbeque: planStyle("open_space_barbeque", "#5f5546", 49, 0.18, 0.95),
    open_space_table: planStyle("open_space_table", "#5f5546", 49, 0.18, 0.95),
    open_space_seat: planStyle("open_space_seat", "#555555", 49, 0.18, 0.85),
    open_space_bicycle_fitting: planStyle("open_space_bicycle_fitting", "#555555", 49, 0.18, 0.9),
    open_space_barrier_point: planStyle("open_space_barrier_point", "#464646", 49, 0.18, 0.85),
    open_space_barrier_continuous: planStyle("open_space_barrier_continuous", "#464646", 46, 0.18, 1.2),
    open_space_waste_collection: planStyle("open_space_waste_collection", "#555546", 49, 0.18, 0.95),
    open_space_shelter: planStyle("open_space_shelter", "#5f5f5f", 49, 0.18, 1.1),
    open_space_shelter_polygon: planStyle("open_space_shelter_polygon", "#5f5f5f", 41, 0.14, 1.2, "rgba(95, 95, 95, 0.16)"),
    open_space_artwork: planStyle("open_space_artwork", "#6a5f78", 49, 0.18, 0.95),
    open_space_boating_facility: planStyle("open_space_boating_facility", "#4f7780", 40, 0.16, 1.2, "rgba(79, 119, 128, 0.16)"),
    open_space_retaining_wall: planStyle("open_space_retaining_wall", "#505050", 46, 0.22, 1.2),
    open_space_building: planStyle("open_space_building", "#646464", 41, 0.16, 1.2, "rgba(100, 100, 100, 0.14)"),
    open_space_platform: planStyle("open_space_platform", "#6b6b5a", 41, 0.14, 1.2, "rgba(107, 107, 90, 0.16)"),
    open_space_fauna_point: planStyle("open_space_fauna_point", "#55705a", 49, 0.18, 0.95),
    open_space_fauna_polyline: planStyle("open_space_fauna_polyline", "#55705a", 46, 0.16, 1.1),
    open_space_land_stabilisation: planStyle("open_space_land_stabilisation", "#73785f", 40, 0.13, 1.2, "rgba(115, 120, 95, 0.16)"),
    open_space_prepared_surface: planStyle("open_space_prepared_surface", "#7a7464", 40, 0.13, 1.2, "rgba(122, 116, 100, 0.16)"),
    open_space_fixture: planStyle("open_space_fixture", "#555555", 49, 0.18, 0.9),
    generic: planStyle("generic", "#5a5a5a", 50, 0.18, 1.2),
  };
  const existingAssetPlanColor = "#8b96a3";
  const existingAssetPlanFill = "rgba(139, 150, 163, 0.18)";

  const planStyleRoots = [
    "Cadastre",
    "Surface",
    "WaterSupply",
    "Sewerage",
    "StormWater",
    "Stormwater",
    "Transport",
    "OpenSpace",
    "Electrical",
    "Communication",
    "Communications",
    "Telecommunications",
    "Supplementary",
  ];

  const abandonedPreviewDash = [14, 3, 2, 3];
  const stormwaterPipePreviewDash = [16, 8];
  const stormwaterSurfaceDrainPreviewDash = [10, 2.4, 2.4, 2.4, 2.4, 2.4];
  const cadastreEasementPreviewDash = [10, 6];
  const conduitParallelOffsetPx = 4;
  const mapMinZoom = 0.35;
  const mapMaxZoom = 64;
  const mapMaxTileZoom = 20;
  const mapOverlayReferenceStyle = {
    strokeAlpha: 0.36,
    pointStrokeAlpha: 0.48,
    pointFillAlpha: 0.16,
    polygonFillAlpha: 0.06,
    labelAlpha: 0.82,
    parcelColor: "#7f8c9d",
  };

  const councilBoundaryServiceUrl = "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Boundaries/AdministrativeBoundaries/MapServer/1";
  const unitywaterWaterServiceUrl = "https://services2.arcgis.com/tQg86iShPXJPWQWw/ArcGIS/rest/services/UWPublicAccessWaterInfrastructureLayers/FeatureServer";
  const unitywaterSewerServiceUrl = "https://services2.arcgis.com/tQg86iShPXJPWQWw/ArcGIS/rest/services/UWPublicAccessSewerInfrastructureLayers/FeatureServer";
  const unitywaterRecycledServiceUrl = "https://services2.arcgis.com/tQg86iShPXJPWQWw/ArcGIS/rest/services/UWPublicAccessRecycledWaterInfrastructureLayers/FeatureServer";
  const urbanUtilitiesWaterServiceUrl = "https://services3.arcgis.com/ocUCNI2h4moKOpKX/arcgis/rest/services/UU_Water_OpenData/FeatureServer";
  const urbanUtilitiesSewerServiceUrl = "https://services3.arcgis.com/ocUCNI2h4moKOpKX/arcgis/rest/services/UU_Sewer_OpenData/FeatureServer";
  const urbanUtilitiesRecycledServiceUrl = "https://services3.arcgis.com/ocUCNI2h4moKOpKX/arcgis/rest/services/UU_Recycled_Water_OpenData/FeatureServer";
  const loganWaterServiceUrl = "https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services/Water%20Information/FeatureServer";
  const loganSewerServiceUrl = "https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services/Sewerage%20Information/FeatureServer";
  const loganStormwaterServiceUrl = "https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services/LCC_Stormwater_Infrastructure/FeatureServer";
  const brisbaneOpenDataServiceUrl = "https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services";
  const bundabergRoadsServiceUrl = "https://services5.arcgis.com/objBWL318bEaIkm9/arcgis/rest/services/Road_Network_Analysis/FeatureServer";
  const gympiePipesServiceUrl = "https://services-ap1.arcgis.com/PbFwUyTW33IkFJsu/arcgis/rest/services/Gympie_Regional_Council_Pipes/FeatureServer";
  const moretonBayCouncilAssetsServiceUrl = "https://services-ap1.arcgis.com/152ojN3Ts9H3cdtl/arcgis/rest/services/CMB_Council_Assets/FeatureServer";
  const redlandAssetsServiceUrl = "https://gis.redland.qld.gov.au/arcgis/rest/services/assets/a_asset_mapping/MapServer";
  const redlandParksTransportServiceUrl = "https://gis.redland.qld.gov.au/arcgis/rest/services/assets/a_parks_transport/MapServer";
  const sunshineCoastUtilitiesServiceUrl = "https://geopublic.scc.qld.gov.au/arcgis/rest/services/UtilitiesCommunication/Utilities_SCRC/MapServer";
  const sservicesHostedAssetsServiceUrl = "https://services1.arcgis.com/bLsSwu2wpv4JvxHE/ArcGIS/rest/services";
  const noosaHostedAssetsServiceUrl = "https://services1.arcgis.com/bLsSwu2wpv4JvxHE/ArcGIS/rest/services";
  const toowoombaTrMapsServiceUrl = "https://maps.tr.qld.gov.au/arcgis/rest/services/External/External_TRMaps/MapServer";
  const toowoombaRoadRegisterServiceUrl = "https://maps.tr.qld.gov.au/arcgis/rest/services/External/RoadRegister/MapServer";
  const toowoombaBicycleFootpathsServiceUrl = "https://maps.tr.qld.gov.au/arcgis/rest/services/External/BicycleFootpaths/MapServer";
  const tweedOpenDataServiceUrl = "https://services1.arcgis.com/KURAxOhGWn5RdCPg/arcgis/rest/services";

  const overlayPresets = [
    {
      id: "qld-cadastre-parcels",
      name: "Cadastre parcels",
      source: "Queensland DCDB",
      serviceUrl: "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/LandParcelPropertyFramework/MapServer/4",
      outFields: "lotplan,lot,plan,locality,shire_name,cover_typ,parcel_typ",
      enabled: true,
      minTileZoom: 15,
      mode: "parcel",
      stroke: "rgba(76, 88, 103, 0.44)",
      fill: "rgba(255, 255, 255, 0)",
      labelColor: "#4c5867",
    },
    {
      id: "uw-water-main",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Water mains",
      source: "Unitywater public water infrastructure",
      serviceUrl: `${unitywaterWaterServiceUrl}/10`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "water",
      stroke: "rgba(0, 102, 204, 0.72)",
      fill: "rgba(0, 102, 204, 0)",
      labelColor: "#0066cc",
    },
    {
      id: "uw-water-fitting",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Water fittings",
      source: "Unitywater public water infrastructure",
      serviceUrl: `${unitywaterWaterServiceUrl}/8`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(0, 102, 204, 0.8)",
      fill: "rgba(0, 102, 204, 0.78)",
      labelColor: "#0066cc",
    },
    {
      id: "uw-water-hydrant",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Hydrants",
      source: "Unitywater public water infrastructure",
      serviceUrl: `${unitywaterWaterServiceUrl}/7`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(12, 129, 211, 0.86)",
      fill: "rgba(12, 129, 211, 0.82)",
      labelColor: "#0c81d3",
    },
    {
      id: "uw-sewer-gravity-main",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Sewer gravity mains",
      source: "Unitywater public sewer infrastructure",
      serviceUrl: `${unitywaterSewerServiceUrl}/11`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(118, 74, 188, 0.72)",
      fill: "rgba(118, 74, 188, 0)",
      labelColor: "#764abc",
    },
    {
      id: "uw-sewer-pressure-main",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Sewer pressure mains",
      source: "Unitywater public sewer infrastructure",
      serviceUrl: `${unitywaterSewerServiceUrl}/12`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(157, 86, 184, 0.72)",
      fill: "rgba(157, 86, 184, 0)",
      labelColor: "#9d56b8",
    },
    {
      id: "uw-sewer-maintenance-hole",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Sewer maintenance holes",
      source: "Unitywater public sewer infrastructure",
      serviceUrl: `${unitywaterSewerServiceUrl}/5`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "sewer",
      stroke: "rgba(118, 74, 188, 0.86)",
      fill: "rgba(118, 74, 188, 0.8)",
      labelColor: "#764abc",
    },
    {
      id: "uw-recycled-water-main",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Recycled water mains",
      source: "Unitywater public recycled water infrastructure",
      serviceUrl: `${unitywaterRecycledServiceUrl}/9`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "water",
      stroke: "rgba(30, 147, 172, 0.72)",
      fill: "rgba(30, 147, 172, 0)",
      labelColor: "#1e93ac",
    },
    {
      id: "uw-recycled-water-fitting",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Recycled water fittings",
      source: "Unitywater public recycled water infrastructure",
      serviceUrl: `${unitywaterRecycledServiceUrl}/7`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(30, 147, 172, 0.84)",
      fill: "rgba(30, 147, 172, 0.8)",
      labelColor: "#1e93ac",
    },
    {
      id: "uw-recycled-water-hydrant",
      group: "Unitywater reference",
      provider: "Unitywater",
      name: "Recycled water hydrants",
      source: "Unitywater public recycled water infrastructure",
      serviceUrl: `${unitywaterRecycledServiceUrl}/6`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(36, 158, 189, 0.86)",
      fill: "rgba(36, 158, 189, 0.82)",
      labelColor: "#249ebd",
    },
    {
      id: "uu-water-main",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Water mains",
      source: "Urban Utilities open water data",
      serviceUrl: `${urbanUtilitiesWaterServiceUrl}/21`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "water",
      stroke: "rgba(0, 121, 168, 0.72)",
      fill: "rgba(0, 121, 168, 0)",
      labelColor: "#0079a8",
    },
    {
      id: "uu-water-fitting",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Water fittings",
      source: "Urban Utilities open water data",
      serviceUrl: `${urbanUtilitiesWaterServiceUrl}/14`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(0, 121, 168, 0.84)",
      fill: "rgba(0, 121, 168, 0.8)",
      labelColor: "#0079a8",
    },
    {
      id: "uu-water-hydrant",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Hydrants",
      source: "Urban Utilities open water data",
      serviceUrl: `${urbanUtilitiesWaterServiceUrl}/15`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(18, 144, 193, 0.86)",
      fill: "rgba(18, 144, 193, 0.82)",
      labelColor: "#1290c1",
    },
    {
      id: "uu-sewer-gravity-main",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Sewer gravity mains",
      source: "Urban Utilities open sewer data",
      serviceUrl: `${urbanUtilitiesSewerServiceUrl}/18`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(104, 82, 171, 0.72)",
      fill: "rgba(104, 82, 171, 0)",
      labelColor: "#6852ab",
    },
    {
      id: "uu-sewer-pressure-main",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Sewer pressure mains",
      source: "Urban Utilities open sewer data",
      serviceUrl: `${urbanUtilitiesSewerServiceUrl}/25`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(136, 79, 170, 0.72)",
      fill: "rgba(136, 79, 170, 0)",
      labelColor: "#884faa",
    },
    {
      id: "uu-sewer-maintenance-hole",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Sewer manholes",
      source: "Urban Utilities open sewer data",
      serviceUrl: `${urbanUtilitiesSewerServiceUrl}/20`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "sewer",
      stroke: "rgba(104, 82, 171, 0.86)",
      fill: "rgba(104, 82, 171, 0.8)",
      labelColor: "#6852ab",
    },
    {
      id: "uu-recycled-water-main",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Recycled water mains",
      source: "Urban Utilities recycled water open data",
      serviceUrl: `${urbanUtilitiesRecycledServiceUrl}/21`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "water",
      stroke: "rgba(30, 147, 172, 0.72)",
      fill: "rgba(30, 147, 172, 0)",
      labelColor: "#1e93ac",
    },
    {
      id: "uu-recycled-water-fitting",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Recycled water fittings",
      source: "Urban Utilities recycled water open data",
      serviceUrl: `${urbanUtilitiesRecycledServiceUrl}/14`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(30, 147, 172, 0.84)",
      fill: "rgba(30, 147, 172, 0.8)",
      labelColor: "#1e93ac",
    },
    {
      id: "uu-recycled-water-hydrant",
      group: "Urban Utilities reference",
      provider: "Urban Utilities",
      name: "Recycled water hydrants",
      source: "Urban Utilities recycled water open data",
      serviceUrl: `${urbanUtilitiesRecycledServiceUrl}/15`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(36, 158, 189, 0.86)",
      fill: "rgba(36, 158, 189, 0.82)",
      labelColor: "#249ebd",
    },
    {
      id: "logan-water-main",
      group: "Logan Water reference",
      provider: "Logan Water",
      name: "Water mains",
      source: "Logan Water information",
      serviceUrl: `${loganWaterServiceUrl}/8`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "water",
      stroke: "rgba(43, 134, 101, 0.72)",
      fill: "rgba(43, 134, 101, 0)",
      labelColor: "#2b8665",
    },
    {
      id: "logan-water-fitting",
      group: "Logan Water reference",
      provider: "Logan Water",
      name: "Water fittings",
      source: "Logan Water information",
      serviceUrl: `${loganWaterServiceUrl}/2`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(43, 134, 101, 0.84)",
      fill: "rgba(43, 134, 101, 0.8)",
      labelColor: "#2b8665",
    },
    {
      id: "logan-water-hydrant",
      group: "Logan Water reference",
      provider: "Logan Water",
      name: "Hydrants",
      source: "Logan Water information",
      serviceUrl: `${loganWaterServiceUrl}/3`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(58, 158, 116, 0.86)",
      fill: "rgba(58, 158, 116, 0.82)",
      labelColor: "#3a9e74",
    },
    {
      id: "logan-sewer-gravity-main",
      group: "Logan Water reference",
      provider: "Logan Water",
      name: "Sewer gravity mains",
      source: "Logan sewerage information",
      serviceUrl: `${loganSewerServiceUrl}/1`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(113, 95, 56, 0.74)",
      fill: "rgba(113, 95, 56, 0)",
      labelColor: "#715f38",
    },
    {
      id: "logan-sewer-pressure-main",
      group: "Logan Water reference",
      provider: "Logan Water",
      name: "Sewer pressure mains",
      source: "Logan sewerage information",
      serviceUrl: `${loganSewerServiceUrl}/4`,
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(143, 112, 58, 0.74)",
      fill: "rgba(143, 112, 58, 0)",
      labelColor: "#8f703a",
    },
    {
      id: "logan-sewer-maintenance-hole",
      group: "Logan Water reference",
      provider: "Logan Water",
      name: "Sewer maintenance holes",
      source: "Logan sewerage information",
      serviceUrl: `${loganSewerServiceUrl}/2`,
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "sewer",
      stroke: "rgba(113, 95, 56, 0.86)",
      fill: "rgba(113, 95, 56, 0.8)",
      labelColor: "#715f38",
    },
    {
      id: "cogc-water-main",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Potable water mains",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Potable_Water_Pipe/FeatureServer/0",
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "water",
      stroke: "rgba(0, 119, 154, 0.72)",
      fill: "rgba(0, 119, 154, 0)",
      labelColor: "#00779a",
    },
    {
      id: "cogc-recycled-water-main",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Recycled water mains",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Recycled_Water_Pipe/FeatureServer/1",
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "water",
      stroke: "rgba(30, 147, 172, 0.72)",
      fill: "rgba(30, 147, 172, 0)",
      labelColor: "#1e93ac",
    },
    {
      id: "cogc-water-fitting",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Water fittings",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Water_Fitting/FeatureServer/0",
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(0, 119, 154, 0.84)",
      fill: "rgba(0, 119, 154, 0.8)",
      labelColor: "#00779a",
    },
    {
      id: "cogc-water-hydrant",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Hydrants",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Water_Hydrant/FeatureServer/0",
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "water",
      stroke: "rgba(36, 158, 189, 0.86)",
      fill: "rgba(36, 158, 189, 0.82)",
      labelColor: "#249ebd",
    },
    {
      id: "cogc-sewer-gravity-main",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Sewer gravity mains",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Sewer_Pipe_Non_Pressure/FeatureServer/1",
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(126, 82, 144, 0.74)",
      fill: "rgba(126, 82, 144, 0)",
      labelColor: "#7e5290",
    },
    {
      id: "cogc-sewer-pressure-main",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Sewer pressure mains",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Sewer_Pipe_Pressure/FeatureServer/1",
      outFields: "*",
      enabled: false,
      minTileZoom: 14,
      resultRecordCount: 700,
      mode: "service-line",
      serviceKind: "sewer",
      stroke: "rgba(152, 96, 132, 0.74)",
      fill: "rgba(152, 96, 132, 0)",
      labelColor: "#986084",
    },
    {
      id: "cogc-sewer-fitting",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Sewer fittings",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Sewer_Fitting/FeatureServer/0",
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "sewer",
      stroke: "rgba(126, 82, 144, 0.86)",
      fill: "rgba(126, 82, 144, 0.8)",
      labelColor: "#7e5290",
    },
    {
      id: "cogc-sewer-maintenance-hole",
      group: "Gold Coast reference",
      provider: "City of Gold Coast Water",
      name: "Sewer maintenance holes",
      source: "City of Gold Coast open data",
      serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Sewer_Maintenance_Hole/FeatureServer/0",
      outFields: "*",
      enabled: false,
      minTileZoom: 16,
      resultRecordCount: 700,
      mode: "service-point",
      serviceKind: "sewer",
      stroke: "rgba(126, 82, 144, 0.86)",
      fill: "rgba(126, 82, 144, 0.8)",
      labelColor: "#7e5290",
    },
    ...buildCouncilAssetOverlays(),
  ];

  const waterProviderByCouncil = {
    brisbane: "Urban Utilities",
    ipswich: "Urban Utilities",
    "lockyer valley": "Urban Utilities",
    "scenic rim": "Urban Utilities",
    somerset: "Urban Utilities",
    "moreton bay": "Unitywater",
    "sunshine coast": "Unitywater",
    noosa: "Unitywater",
    logan: "Logan Water",
    redland: "Redland Water",
    "gold coast": "City of Gold Coast Water",
    toowoomba: "Toowoomba Regional Council",
  };

  function buildCouncilAssetOverlays() {
    const brisbaneAssets = [
      councilOverlay({ id: "bcc-sqid-existing", group: "Brisbane council assets", council: "Brisbane", name: "Stormwater SQIDs", source: "Brisbane City Council open data", serviceUrl: `${brisbaneOpenDataServiceUrl}/Stormwater_Quality_Improvement_Device_Existing/FeatureServer/0`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "bcc-waterbody-existing", group: "Brisbane council assets", council: "Brisbane", name: "Stormwater waterbodies", source: "Brisbane City Council open data", serviceUrl: `${brisbaneOpenDataServiceUrl}/Stormwater_Waterbody_Existing/FeatureServer/0`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "bcc-road-hierarchy", group: "Brisbane council assets", council: "Brisbane", name: "Road hierarchy", source: "Brisbane City Council open data", serviceUrl: `${brisbaneOpenDataServiceUrl}/Roads_hierarchy_overlay_Road_hierarchy/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
    ];

    const bundabergAssets = [
      councilOverlay({ id: "bundaberg-road-centrelines", group: "Bundaberg council assets", council: "Bundaberg", name: "Road centrelines", source: "Bundaberg Regional Council public road service", serviceUrl: `${bundabergRoadsServiceUrl}/1`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "bundaberg-road-types", group: "Bundaberg council assets", council: "Bundaberg", name: "Road types", source: "Bundaberg Regional Council public road service", serviceUrl: `${bundabergRoadsServiceUrl}/0`, mode: "service-line", serviceKind: "transport" }),
    ];

    const goldCoastStormwater = [
      councilOverlay({
        id: "cogc-drainage-pipe",
        group: "Gold Coast council assets",
        council: "Gold Coast",
        name: "Stormwater pipes",
        serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Drainage_Pipe/FeatureServer/1",
        mode: "service-line",
        serviceKind: "stormwater",
      }),
      councilOverlay({
        id: "cogc-drainage-pit",
        group: "Gold Coast council assets",
        council: "Gold Coast",
        name: "Stormwater pits",
        serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Drainage_Pit/FeatureServer/0",
        mode: "service-point",
        serviceKind: "stormwater",
      }),
      councilOverlay({
        id: "cogc-stormwater-end-structure",
        group: "Gold Coast council assets",
        council: "Gold Coast",
        name: "Stormwater end structures",
        serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Stormwater_End_Structure/FeatureServer/0",
        mode: "service-point",
        serviceKind: "stormwater",
      }),
      councilOverlay({
        id: "cogc-inlet-trench",
        group: "Gold Coast council assets",
        council: "Gold Coast",
        name: "Inlet trenches",
        serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Stormwater_Inlet_Trench/FeatureServer/0",
        mode: "service-line",
        serviceKind: "stormwater",
      }),
      councilOverlay({
        id: "cogc-detention-basin",
        group: "Gold Coast council assets",
        council: "Gold Coast",
        name: "Detention basins",
        serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Detention_Basin/FeatureServer/0",
        mode: "service-polygon",
        serviceKind: "stormwater",
      }),
      councilOverlay({
        id: "cogc-road-segment",
        group: "Gold Coast council assets",
        council: "Gold Coast",
        name: "Road segments",
        serviceUrl: "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Road_Segment/FeatureServer/0",
        mode: "service-line",
        serviceKind: "transport",
        stroke: "rgba(226, 132, 48, 0.7)",
        fill: "rgba(226, 132, 48, 0)",
        labelColor: "#b65f12",
      }),
    ];

    const loganStormwater = [
      councilOverlay({ id: "logan-stormwater-drain", group: "Logan council assets", council: "Logan", name: "Stormwater drains", serviceUrl: `${loganStormwaterServiceUrl}/15`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "logan-stormwater-surface-drain", group: "Logan council assets", council: "Logan", name: "Surface drains", serviceUrl: `${loganStormwaterServiceUrl}/14`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "logan-stormwater-pit", group: "Logan council assets", council: "Logan", name: "Stormwater pits", serviceUrl: `${loganStormwaterServiceUrl}/12`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "logan-stormwater-headwall", group: "Logan council assets", council: "Logan", name: "Headwalls", serviceUrl: `${loganStormwaterServiceUrl}/11`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "logan-stormwater-gpt", group: "Logan council assets", council: "Logan", name: "GPTs", serviceUrl: `${loganStormwaterServiceUrl}/13`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "logan-wsud", group: "Logan council assets", council: "Logan", name: "WSUD areas", serviceUrl: `${loganStormwaterServiceUrl}/17`, mode: "service-polygon", serviceKind: "stormwater" }),
    ];

    const moretonBayAssets = [
      councilOverlay({ id: "cmb-stormwater-line", group: "Moreton Bay council assets", council: "Moreton Bay", name: "Stormwater lines", serviceUrl: `${moretonBayCouncilAssetsServiceUrl}/25`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "cmb-stormwater-point", group: "Moreton Bay council assets", council: "Moreton Bay", name: "Stormwater points", serviceUrl: `${moretonBayCouncilAssetsServiceUrl}/24`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "cmb-culvert-system", group: "Moreton Bay council assets", council: "Moreton Bay", name: "Culvert systems", serviceUrl: `${moretonBayCouncilAssetsServiceUrl}/23`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "cmb-stormwater-basin", group: "Moreton Bay council assets", council: "Moreton Bay", name: "Stormwater basins", serviceUrl: `${moretonBayCouncilAssetsServiceUrl}/26`, mode: "service-polygon", serviceKind: "stormwater" }),
      councilOverlay({ id: "cmb-road-centre-line", group: "Moreton Bay council assets", council: "Moreton Bay", name: "Road centre lines", serviceUrl: `${moretonBayCouncilAssetsServiceUrl}/27`, mode: "service-line", serviceKind: "transport", stroke: "rgba(226, 132, 48, 0.7)", fill: "rgba(226, 132, 48, 0)", labelColor: "#b65f12" }),
      councilOverlay({ id: "cmb-pathway", group: "Moreton Bay council assets", council: "Moreton Bay", name: "Pathways", serviceUrl: `${moretonBayCouncilAssetsServiceUrl}/3`, mode: "service-line", serviceKind: "transport", stroke: "rgba(205, 144, 62, 0.7)", fill: "rgba(205, 144, 62, 0)", labelColor: "#a36916" }),
    ];

    const northBurnettAssets = [
      councilOverlay({ id: "north-burnett-roads", group: "North Burnett council assets", council: "North Burnett", name: "Road lines", source: "SServices public road layer", serviceUrl: `${sservicesHostedAssetsServiceUrl}/Road_Line_Recover_App/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
    ];

    const gympieAssets = [
      councilOverlay({ id: "gympie-pipe-network", group: "Gympie council assets", council: "Gympie", name: "Pipe network", source: "Gympie public pipe layer", serviceUrl: `${gympiePipesServiceUrl}/0`, mode: "service-line", serviceKind: "stormwater" }),
    ];

    const redlandAssets = [
      councilOverlay({ id: "redland-water-pressure-pipes", group: "Redland council assets", council: "Redland", name: "Water pressure pipes", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/7`, mode: "service-line", serviceKind: "water" }),
      councilOverlay({ id: "redland-water-valves", group: "Redland council assets", council: "Redland", name: "Water valves", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/4`, mode: "service-point", serviceKind: "water" }),
      councilOverlay({ id: "redland-water-hydrants", group: "Redland council assets", council: "Redland", name: "Hydrants", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/5`, mode: "service-point", serviceKind: "water" }),
      councilOverlay({ id: "redland-water-fittings", group: "Redland council assets", council: "Redland", name: "Water fittings", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/6`, mode: "service-point", serviceKind: "water" }),
      councilOverlay({ id: "redland-sewer-mains", group: "Redland council assets", council: "Redland", name: "Sewer mains", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/16`, mode: "service-line", serviceKind: "sewer" }),
      councilOverlay({ id: "redland-sewer-pressure-pipes", group: "Redland council assets", council: "Redland", name: "Sewer pressure pipes", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/17`, mode: "service-line", serviceKind: "sewer" }),
      councilOverlay({ id: "redland-sewer-services", group: "Redland council assets", council: "Redland", name: "Sewer services", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/21`, mode: "service-line", serviceKind: "sewer", minTileZoom: 15 }),
      councilOverlay({ id: "redland-sewer-pits-wells", group: "Redland council assets", council: "Redland", name: "Sewer pits and wells", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/13`, mode: "service-point", serviceKind: "sewer" }),
      councilOverlay({ id: "redland-stormwater-drains", group: "Redland council assets", council: "Redland", name: "Stormwater drains", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/27`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "redland-stormwater-pits", group: "Redland council assets", council: "Redland", name: "Stormwater pits", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/25`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "redland-stormwater-end-structures", group: "Redland council assets", council: "Redland", name: "Stormwater end structures", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/26`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "redland-stormwater-gpts", group: "Redland council assets", council: "Redland", name: "Stormwater GPTs", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/24`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "redland-open-drains", group: "Redland council assets", council: "Redland", name: "Open drains", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/33`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "redland-rain-gardens", group: "Redland council assets", council: "Redland", name: "Rain gardens", source: "Redland City Council public asset service", serviceUrl: `${redlandAssetsServiceUrl}/34`, mode: "service-polygon", serviceKind: "stormwater" }),
      councilOverlay({ id: "redland-road-centrelines", group: "Redland council assets", council: "Redland", name: "Road centrelines", source: "Redland City Council public transport service", serviceUrl: `${redlandParksTransportServiceUrl}/31`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "redland-pathways", group: "Redland council assets", council: "Redland", name: "Pathways", source: "Redland City Council public transport service", serviceUrl: `${redlandParksTransportServiceUrl}/27`, mode: "service-line", serviceKind: "transport" }),
    ];

    const southBurnettAssets = [
      councilOverlay({ id: "south-burnett-roads", group: "South Burnett council assets", council: "South Burnett", name: "Roads", source: "SServices public road layer", serviceUrl: `${sservicesHostedAssetsServiceUrl}/sbrc_roads/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
    ];

    const sunshineCoastStormwater = [
      councilOverlay({ id: "scc-stormwater-pipe", group: "Sunshine Coast council assets", council: "Sunshine Coast", name: "Stormwater pipes", serviceUrl: `${sunshineCoastUtilitiesServiceUrl}/8`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "scc-stormwater-pit", group: "Sunshine Coast council assets", council: "Sunshine Coast", name: "Stormwater pits", serviceUrl: `${sunshineCoastUtilitiesServiceUrl}/4`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "scc-stormwater-end-structure", group: "Sunshine Coast council assets", council: "Sunshine Coast", name: "Stormwater end structures", serviceUrl: `${sunshineCoastUtilitiesServiceUrl}/5`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "scc-stormwater-open-drain", group: "Sunshine Coast council assets", council: "Sunshine Coast", name: "Open drains", serviceUrl: `${sunshineCoastUtilitiesServiceUrl}/6`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "scc-stormwater-culvert", group: "Sunshine Coast council assets", council: "Sunshine Coast", name: "Culverts", serviceUrl: `${sunshineCoastUtilitiesServiceUrl}/9`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "scc-water-quality-area", group: "Sunshine Coast council assets", council: "Sunshine Coast", name: "Water quality areas", serviceUrl: `${sunshineCoastUtilitiesServiceUrl}/10`, mode: "service-polygon", serviceKind: "stormwater" }),
    ];

    const portMacquarieAssets = [
      councilOverlay({ id: "pmhc-roads", group: "Port Macquarie-Hastings council assets", council: "Port Macquarie-Hastings", name: "Roads", source: "SServices PMHC public road layer", serviceUrl: `${sservicesHostedAssetsServiceUrl}/PMHC_Client_Roads/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "pmhc-footpaths", group: "Port Macquarie-Hastings council assets", council: "Port Macquarie-Hastings", name: "Footpaths", source: "SServices PMHC public footpath layer", serviceUrl: `${sservicesHostedAssetsServiceUrl}/PMHC_Footpaths/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
    ];

    const noosaAssets = [
      councilOverlay({ id: "noosa-road-centrelines", group: "Noosa council assets", council: "Noosa", name: "Road centrelines", serviceUrl: `${noosaHostedAssetsServiceUrl}/Noosa_CL/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "noosa-road-segments", group: "Noosa council assets", council: "Noosa", name: "Road segments", serviceUrl: `${noosaHostedAssetsServiceUrl}/Noosa_Segments/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "noosa-sign-line-marking", group: "Noosa council assets", council: "Noosa", name: "Signs and line marking", serviceUrl: `${noosaHostedAssetsServiceUrl}/Noosa_Signs_Line_Marking/FeatureServer/0`, mode: "service-point", serviceKind: "transport", minTileZoom: 17, resultRecordCount: 900 }),
      councilOverlay({ id: "noosa-carparks", group: "Noosa council assets", council: "Noosa", name: "Carparks", serviceUrl: `${noosaHostedAssetsServiceUrl}/Noosa_Carparks_March_2026/FeatureServer/7`, mode: "service-polygon", serviceKind: "transport" }),
    ];

    const toowoombaAssets = [
      councilOverlay({ id: "trc-water-main", group: "Toowoomba council assets", council: "Toowoomba", name: "Water mains", serviceUrl: `${toowoombaTrMapsServiceUrl}/29`, mode: "service-line", serviceKind: "water" }),
      councilOverlay({ id: "trc-water-service", group: "Toowoomba council assets", council: "Toowoomba", name: "Water services", serviceUrl: `${toowoombaTrMapsServiceUrl}/30`, mode: "service-line", serviceKind: "water", minTileZoom: 15 }),
      councilOverlay({ id: "trc-water-valve", group: "Toowoomba council assets", council: "Toowoomba", name: "Water valves", serviceUrl: `${toowoombaTrMapsServiceUrl}/26`, mode: "service-point", serviceKind: "water" }),
      councilOverlay({ id: "trc-water-hydrant", group: "Toowoomba council assets", council: "Toowoomba", name: "Hydrants", serviceUrl: `${toowoombaTrMapsServiceUrl}/28`, mode: "service-point", serviceKind: "water" }),
      councilOverlay({ id: "trc-stormwater-pipe", group: "Toowoomba council assets", council: "Toowoomba", name: "Stormwater pipes", serviceUrl: `${toowoombaTrMapsServiceUrl}/36`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "trc-stormwater-subsoil-drain", group: "Toowoomba council assets", council: "Toowoomba", name: "Sub-soil drains", serviceUrl: `${toowoombaTrMapsServiceUrl}/35`, mode: "service-line", serviceKind: "stormwater" }),
      councilOverlay({ id: "trc-stormwater-pit", group: "Toowoomba council assets", council: "Toowoomba", name: "Stormwater pits", serviceUrl: `${toowoombaTrMapsServiceUrl}/33`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "trc-stormwater-end-structure", group: "Toowoomba council assets", council: "Toowoomba", name: "Stormwater end structures", serviceUrl: `${toowoombaTrMapsServiceUrl}/34`, mode: "service-point", serviceKind: "stormwater" }),
      councilOverlay({ id: "trc-sewer-gravity-main", group: "Toowoomba council assets", council: "Toowoomba", name: "Sewer gravity mains", serviceUrl: `${toowoombaTrMapsServiceUrl}/43`, mode: "service-line", serviceKind: "sewer" }),
      councilOverlay({ id: "trc-sewer-pressure-main", group: "Toowoomba council assets", council: "Toowoomba", name: "Sewer pressure mains", serviceUrl: `${toowoombaTrMapsServiceUrl}/44`, mode: "service-line", serviceKind: "sewer" }),
      councilOverlay({ id: "trc-sewer-service", group: "Toowoomba council assets", council: "Toowoomba", name: "Sewer services", serviceUrl: `${toowoombaTrMapsServiceUrl}/45`, mode: "service-line", serviceKind: "sewer", minTileZoom: 15 }),
      councilOverlay({ id: "trc-sewer-manhole", group: "Toowoomba council assets", council: "Toowoomba", name: "Sewer manholes", serviceUrl: `${toowoombaTrMapsServiceUrl}/42`, mode: "service-point", serviceKind: "sewer" }),
      councilOverlay({ id: "trc-road-register", group: "Toowoomba council assets", council: "Toowoomba", name: "Road register", serviceUrl: `${toowoombaRoadRegisterServiceUrl}/5`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "trc-paths", group: "Toowoomba council assets", council: "Toowoomba", name: "Paths", serviceUrl: `${toowoombaBicycleFootpathsServiceUrl}/6`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "trc-parks", group: "Toowoomba council assets", council: "Toowoomba", name: "Parks", serviceUrl: `${toowoombaTrMapsServiceUrl}/57`, mode: "service-polygon", serviceKind: "surface", minTileZoom: 13 }),
    ];

    const tweedAssets = [
      councilOverlay({ id: "tweed-road-centrelines", group: "Tweed council assets", council: "Tweed", name: "Road centrelines", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Road_centrelineTSC/FeatureServer/0`, mode: "service-line", serviceKind: "transport" }),
      councilOverlay({ id: "tweed-road-reserves", group: "Tweed council assets", council: "Tweed", name: "Road reserves", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Road_ReservesTSC/FeatureServer/0`, mode: "service-polygon", serviceKind: "transport" }),
      councilOverlay({ id: "tweed-parks", group: "Tweed council assets", council: "Tweed", name: "Parks", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Council_Parks_OD/FeatureServer/0`, mode: "service-polygon", serviceKind: "surface", minTileZoom: 13 }),
      councilOverlay({ id: "tweed-water-valves", group: "Tweed council assets", council: "Tweed", name: "Water valves", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/WATER_VALVE/FeatureServer/2`, mode: "service-point", serviceKind: "water" }),
      councilOverlay({ id: "tweed-water-meters", group: "Tweed council assets", council: "Tweed", name: "Water meters", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/EAM_Water_Meters/FeatureServer/0`, mode: "service-point", serviceKind: "water", minTileZoom: 17 }),
      councilOverlay({ id: "tweed-sewer-gravity-main", group: "Tweed council assets", council: "Tweed", name: "Sewer gravity mains", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Sewer_ReticulationNetwork/FeatureServer/5`, mode: "service-line", serviceKind: "sewer" }),
      councilOverlay({ id: "tweed-sewer-rising-main", group: "Tweed council assets", council: "Tweed", name: "Sewer rising mains", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Sewer_ReticulationNetwork/FeatureServer/8`, mode: "service-line", serviceKind: "sewer" }),
      councilOverlay({ id: "tweed-sewer-service-connection", group: "Tweed council assets", council: "Tweed", name: "Sewer service connections", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Sewer_ReticulationNetwork/FeatureServer/11`, mode: "service-line", serviceKind: "sewer", minTileZoom: 15 }),
      councilOverlay({ id: "tweed-sewer-manhole", group: "Tweed council assets", council: "Tweed", name: "Sewer manholes", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Sewer_ReticulationNetwork/FeatureServer/1`, mode: "service-point", serviceKind: "sewer" }),
      councilOverlay({ id: "tweed-sewer-fitting", group: "Tweed council assets", council: "Tweed", name: "Sewer fittings", source: "Tweed Shire Council open data", serviceUrl: `${tweedOpenDataServiceUrl}/Sewer_ReticulationNetwork/FeatureServer/0`, mode: "service-point", serviceKind: "sewer" }),
    ];

    return [
      ...brisbaneAssets,
      ...bundabergAssets,
      ...goldCoastStormwater,
      ...gympieAssets,
      ...loganStormwater,
      ...moretonBayAssets,
      ...northBurnettAssets,
      ...redlandAssets,
      ...southBurnettAssets,
      ...sunshineCoastStormwater,
      ...portMacquarieAssets,
      ...noosaAssets,
      ...toowoombaAssets,
      ...tweedAssets,
    ];
  }

  function councilOverlay(options) {
    const kindStyles = {
      water: ["rgba(0, 102, 204, 0.72)", "rgba(0, 102, 204, 0.1)", "#0066cc"],
      sewer: ["rgba(118, 74, 188, 0.72)", "rgba(118, 74, 188, 0.1)", "#764abc"],
      stormwater: ["rgba(19, 166, 107, 0.72)", "rgba(19, 166, 107, 0.1)", "#138a5f"],
      transport: ["rgba(226, 132, 48, 0.7)", "rgba(226, 132, 48, 0.1)", "#b65f12"],
      surface: ["rgba(119, 139, 59, 0.66)", "rgba(119, 139, 59, 0.1)", "#67782f"],
    };
    const style = kindStyles[options.serviceKind] || kindStyles.stormwater;
    return {
      source: `${options.council} council open data`,
      outFields: "*",
      enabled: false,
      minTileZoom: options.mode === "service-point" ? 16 : 14,
      resultRecordCount: 700,
      stroke: style[0],
      fill: options.mode === "service-polygon"
        ? style[1]
        : (options.mode === "service-point" ? style[0] : "rgba(19, 166, 107, 0)"),
      labelColor: style[2],
      ...options,
    };
  }

  const state = {
    features: [],
    filteredFeatures: [],
    layers: new Map(),
    selectedId: null,
    selectedOverlayFeature: null,
    mapMode: "grid",
    coordinateZone: 56,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isPanning: false,
    isPointerDown: false,
    hasDraggedMap: false,
    panStart: { x: 0, y: 0 },
    pointerStart: { x: 0, y: 0 },
    labelMode: "off",
    labelHitBoxes: [],
    labelHitBoxesByGroup: new Map(),
    labelObstacleCache: null,
    projectedFeatureCache: null,
    drawOrderCache: null,
    labelPanelOpen: false,
    measurement: {
      mode: "off",
      resultMode: "off",
      points: [],
      preview: null,
      completed: [],
    },
    bounds: null,
    tileCache: new Map(),
    fileMeta: {
      receiver: "",
      receiverField: "",
    },
    fileMetas: [],
    loadedFiles: [],
    reportBundles: [],
    schemaValidationResults: [],
    validationErrorResults: [],
    repairPreview: null,
    assetKinds: new Set(),
    locationCheck: {
      status: "idle",
      message: "",
      receiver: "",
      councils: [],
      providers: [],
    },
    locationCheckAbort: null,
    overlays: overlayPresets.map((overlay) => ({
      ...overlay,
      defaultEnabled: Boolean(overlay.enabled),
      userToggled: false,
      features: [],
      status: overlay.enabled ? "Ready" : "Off",
      lastExtentKey: "",
      requestKey: "",
      abortController: null,
    })),
    overlayTimer: null,
    overlayOpenSections: new Set(),
    overlayClosedSections: new Set(),
    suggestedOverlaysApplied: false,
    fileName: "",
    showAllDetails: false,
    filters: {
      layer: "all",
      type: "all",
      geometry: "all",
      sort: "layer",
    },
  };

  const els = {
    fileInput: document.getElementById("adac-file-input"),
    canvas: document.getElementById("adac-map-canvas"),
    mapModeButtons: root.querySelectorAll("[data-map-mode]"),
    statusText: root.querySelector("[data-role='status-text']"),
    fileName: root.querySelector("[data-role='file-name']"),
    exportReportButton: root.querySelector("[data-role='export-report-pdf']"),
    reportExportMenu: root.querySelector("[data-role='report-export-menu']"),
    labelButton: root.querySelector("[data-role='label-button']"),
    labelMenu: root.querySelector("[data-role='label-menu']"),
    labelLayerPanel: root.querySelector("[data-role='label-layer-panel']"),
    visibleLabelCount: root.querySelector("[data-role='visible-label-count']"),
    labelLayerList: root.querySelector("[data-role='label-layer-list']"),
    measurementButton: root.querySelector("[data-role='measurement-button']"),
    measurementMenu: root.querySelector("[data-role='measurement-menu']"),
    measurementReadout: root.querySelector("[data-role='measurement-readout']"),
    measurementMode: root.querySelector("[data-role='measurement-mode']"),
    measurementValue: root.querySelector("[data-role='measurement-value']"),
    termsButton: root.querySelector("[data-role='terms-button']"),
    termsModal: document.querySelector("[data-role='terms-modal']"),
    visibleLayerCount: root.querySelector("[data-role='visible-layer-count']"),
    layerList: root.querySelector("[data-role='layer-list']"),
    overlayList: root.querySelector("[data-role='overlay-list']"),
    overlayStatus: root.querySelector("[data-role='overlay-status']"),
    checkCount: root.querySelector("[data-role='check-count']"),
    checkList: root.querySelector("[data-role='check-list']"),
    repairedXmlDownloadButton: root.querySelector("[data-role='download-repaired-xml']"),
    shell: root.querySelector(".viewer-shell"),
    search: root.querySelector("[data-role='asset-search']"),
    layerFilter: root.querySelector("[data-role='layer-filter']"),
    typeFilter: root.querySelector("[data-role='type-filter']"),
    geometryFilter: root.querySelector("[data-role='geometry-filter']"),
    sortSelect: root.querySelector("[data-role='asset-sort']"),
    details: root.querySelector("[data-role='feature-details']"),
    empty: root.querySelector("[data-role='empty-state']"),
    schemaValidationPanel: root.querySelector("[data-role='schema-validation-panel']"),
    repairPreviewBanner: root.querySelector("[data-role='repair-preview-banner']"),
    dropzone: root.querySelector("[data-role='dropzone']"),
    suggestionWidget: document.querySelector("[data-role='suggestion-widget']"),
    suggestionPanel: document.querySelector("[data-role='suggestion-panel']"),
    suggestionForm: document.getElementById("suggestion-form"),
    suggestionStatus: document.querySelector("[data-role='suggestion-status']"),
  };

  const ctx = els.canvas.getContext("2d");

  function init() {
    els.fileInput.addEventListener("change", handleFileInput);
    els.search.addEventListener("input", updateFilteredFeatures);
    if (els.layerFilter) els.layerFilter.addEventListener("change", () => {
      state.filters.layer = els.layerFilter.value;
      updateFilteredFeatures();
    });
    if (els.typeFilter) els.typeFilter.addEventListener("change", () => {
      state.filters.type = els.typeFilter.value;
      updateFilteredFeatures();
    });
    if (els.geometryFilter) els.geometryFilter.addEventListener("change", () => {
      state.filters.geometry = els.geometryFilter.value;
      updateFilteredFeatures();
    });
    if (els.sortSelect) els.sortSelect.addEventListener("change", () => {
      state.filters.sort = els.sortSelect.value;
      updateFilteredFeatures();
    });
    if (els.layerList) {
      els.layerList.addEventListener("toggle", handleLayerDetailsToggle, true);
    }
    if (els.labelLayerList) {
      els.labelLayerList.addEventListener("toggle", handleLabelDetailsToggle, true);
    }
    root.addEventListener("click", handleClick);
    root.addEventListener("change", handleChange);
    if (els.termsButton) {
      els.termsButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openTermsModal();
      });
    }
    if (els.termsModal) {
      els.termsModal.addEventListener("click", handleClick);
    }
    if (els.dropzone) {
      ["dragenter", "dragover"].forEach((eventName) => {
        els.dropzone.addEventListener(eventName, (event) => {
          event.preventDefault();
          els.dropzone.classList.add("is-dragging");
        });
      });

      ["dragleave", "drop"].forEach((eventName) => {
        els.dropzone.addEventListener(eventName, (event) => {
          event.preventDefault();
          els.dropzone.classList.remove("is-dragging");
        });
      });

      els.dropzone.addEventListener("drop", (event) => {
        const files = Array.from(event.dataTransfer.files || []).filter((file) => {
          const name = String(file.name || "").toLowerCase();
          return name.endsWith(".xml") || /xml/.test(file.type || "");
        });
        if (files.length) readXmlFiles(files);
      });
    }

    els.canvas.addEventListener("wheel", handleMapWheel, { passive: false });
    els.canvas.addEventListener("pointerdown", handleMapPointerDown);
    els.canvas.addEventListener("pointermove", handleMapPointerMove);
    els.canvas.addEventListener("pointerup", handleMapPointerUp);
    els.canvas.addEventListener("pointercancel", handleMapPointerUp);
    els.canvas.addEventListener("pointerleave", handleMapPointerUp);
    els.canvas.addEventListener("dblclick", handleMapDoubleClick);

    window.addEventListener("resize", drawMap);
    window.addEventListener("keydown", handleWindowKeydown);
    if (els.suggestionForm) {
      els.suggestionForm.addEventListener("submit", handleSuggestionSubmit);
    }
    renderAll();
  }

  function handleClick(event) {
    const mapModeButton = event.target.closest("[data-map-mode]");
    if (mapModeButton) {
      setMapMode(mapModeButton.dataset.mapMode);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      runAction(actionButton.dataset.action);
      return;
    }

    if (isReportExportMenuOpen() && !event.target.closest("[data-role='report-export-menu']") && !event.target.closest("[data-role='export-report-pdf']")) {
      closeReportExportMenu();
    }
    if (isLabelMenuOpen() && !event.target.closest("[data-role='label-menu']") && !event.target.closest("[data-role='label-button']")) {
      closeLabelMenu();
    }
    if (isMeasurementMenuOpen() && !event.target.closest("[data-role='measurement-menu']") && !event.target.closest("[data-role='measurement-button']")) {
      closeMeasurementMenu();
    }

    const assetButton = event.target.closest("[data-feature-id]");
    if (assetButton) {
      selectFeature(assetButton.dataset.featureId);
      return;
    }

    const layerTypeToggle = event.target.closest("[data-layer-type-toggle]");
    if (layerTypeToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleLayerType(layerTypeToggle.dataset.layer, layerTypeToggle.dataset.layerType);
      return;
    }

    const layerToggle = event.target.closest("[data-layer-toggle]");
    if (layerToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleLayer(layerToggle.dataset.layerToggle);
      return;
    }

    const labelLayerTypeToggle = event.target.closest("[data-label-layer-type-toggle]");
    if (labelLayerTypeToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleLabelLayerType(labelLayerTypeToggle.dataset.labelLayer, labelLayerTypeToggle.dataset.labelLayerType);
      return;
    }

    const labelLayerToggle = event.target.closest("[data-label-layer-toggle]");
    if (labelLayerToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleLabelLayer(labelLayerToggle.dataset.labelLayerToggle);
      return;
    }

    const overlayToggle = event.target.closest("[data-overlay-toggle]");
    if (overlayToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleOverlay(overlayToggle.dataset.overlayToggle);
      return;
    }

    const overlaySectionToggle = event.target.closest("[data-overlay-section-toggle]");
    if (overlaySectionToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleOverlaySection(overlaySectionToggle.dataset.overlaySectionToggle);
    }
  }

  function handleChange(event) {
    const allDetailsToggle = event.target.closest("[data-role='all-details-toggle']");
    if (allDetailsToggle) {
      state.showAllDetails = allDetailsToggle.checked;
      renderDetails();
    }
  }

  function runAction(action) {
    if (action === "fit") {
      fitMap();
    } else if (action === "export-report-pdf") {
      handleReportExportRequest();
    } else if (action === "export-combined-report-pdf") {
      closeReportExportMenu();
      exportAdacReportPdf();
    } else if (action === "export-separate-report-pdfs") {
      closeReportExportMenu();
      exportSeparateAdacReportPdfs();
    } else if (action === "close-report-export-menu") {
      closeReportExportMenu();
    } else if (action === "toggle-label-menu") {
      toggleLabelMenu();
    } else if (action === "set-label-simple") {
      setLabelMode("simple");
    } else if (action === "set-label-detailed") {
      setLabelMode("detailed");
    } else if (action === "set-label-off") {
      setLabelMode("off");
    } else if (action === "toggle-measure-menu") {
      toggleMeasurementMenu();
    } else if (action === "set-measure-distance") {
      setMeasurementMode("distance");
    } else if (action === "set-measure-area") {
      setMeasurementMode("area");
    } else if (action === "clear-measurement") {
      setMeasurementMode("off");
    } else if (action === "open-terms") {
      openTermsModal();
    } else if (action === "close-terms") {
      closeTermsModal();
    } else if (action === "accept-terms") {
      acceptTerms();
    } else if (action === "clear-asset-filters") {
      clearAssetFilters();
    } else if (action === "clear-files") {
      clearLoadedFiles();
    } else if (action === "preview-repaired-xml") {
      previewSuggestedXmlRepairs();
    } else if (action === "download-repaired-xml") {
      downloadSuggestedRepairedXml();
    } else if (action === "preview-selected-validation-fixes") {
      previewSelectedValidationFixes();
    } else if (action === "continue-repaired-preview") {
      continueRepairedPreview();
    } else if (action === "toggle-suggestions") {
      toggleSuggestions();
    } else if (action === "close-suggestions") {
      closeSuggestions();
    }
  }

  function handleWindowKeydown(event) {
    if (event.key === "Escape") {
      closeTransientUi();
      if (isMeasurementActive()) finishMeasurement();
    }
  }

  function closeTransientUi(except = "") {
    if (except !== "report") closeReportExportMenu();
    if (except !== "label") closeLabelMenu();
    if (except !== "measurement") closeMeasurementMenu();
    if (except !== "terms") closeTermsModal();
    if (except !== "suggestions") closeSuggestions();
  }

  function setMapMode(mode) {
    if (!["grid", "map", "satellite"].includes(mode)) return;
    if (state.mapMode === mode) {
      updateMapModeButtons();
      return;
    }
    state.mapMode = mode;
    updateMapModeButtons();
    drawMap();
  }

  function updateMapModeButtons() {
    els.mapModeButtons.forEach((button) => {
      const isActive = button.dataset.mapMode === state.mapMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  async function exportAdacReportPdf() {
    if (!state.reportBundles.length) {
      setStatus("Load at least one ADAC XML file before exporting a report PDF.", true);
      return;
    }

    try {
      const logoImage = await getReportLogoImage();
      const reportBundle = buildCombinedReportBundle();
      const pdfBlob = buildAdacReportPdf(reportBundle, { logoImage });
      downloadBlob(pdfBlob, reportPdfFilename());
      setStatus(`Exported ADAC report PDF for ${reportBundle.assets.length} asset${reportBundle.assets.length === 1 ? "" : "s"}.`, false);
    } catch (error) {
      setStatus(`The report PDF could not be exported: ${error.message || error}`, true);
    }
  }

  function handleReportExportRequest() {
    if (state.reportBundles.length > 1) {
      toggleReportExportMenu();
      return;
    }
    closeTransientUi();
    exportAdacReportPdf();
  }

  function toggleReportExportMenu() {
    if (isReportExportMenuOpen()) {
      closeReportExportMenu();
    } else {
      openReportExportMenu();
    }
  }

  function openReportExportMenu() {
    if (!els.reportExportMenu) return;
    closeTransientUi("report");
    els.reportExportMenu.hidden = false;
    if (els.exportReportButton) els.exportReportButton.setAttribute("aria-expanded", "true");
  }

  function closeReportExportMenu() {
    if (!els.reportExportMenu) return;
    els.reportExportMenu.hidden = true;
    if (els.exportReportButton) els.exportReportButton.setAttribute("aria-expanded", "false");
  }

  function isReportExportMenuOpen() {
    return Boolean(els.reportExportMenu && !els.reportExportMenu.hidden);
  }

  async function exportSeparateAdacReportPdfs() {
    if (state.reportBundles.length < 2) {
      setStatus("Load at least two ADAC XML files before exporting separate report PDFs.", true);
      return;
    }

    try {
      const logoImage = await getReportLogoImage();
      state.reportBundles.forEach((reportBundle, index) => {
        const pdfBlob = buildAdacReportPdf(reportBundle, { logoImage });
        downloadBlob(pdfBlob, separateReportPdfFilename(reportBundle, index));
      });
      setStatus(`Exported ${state.reportBundles.length} separate ADAC report PDFs.`, false);
    } catch (error) {
      setStatus(`The separate report PDFs could not be exported: ${error.message || error}`, true);
    }
  }

  function buildCombinedReportBundle() {
    if (state.reportBundles.length === 1) return state.reportBundles[0];

    const first = state.reportBundles[0];
    const schemaVersions = uniqueValues(state.reportBundles.map((bundle) => schemaLabel(bundle.schemaVersion)).filter(Boolean));
    return {
      metadata: {
        ...first.metadata,
        name: state.fileName || "ADAC XML Report",
        receiver: state.fileMeta.receiver || first.metadata.receiver,
        description: `Combined report for ${state.loadedFiles.map((file) => file.name).join(", ")}`,
      },
      assets: state.reportBundles.flatMap((bundle) => bundle.assets),
      schemaVersion: schemaVersions.join(", "),
      fileName: state.fileName || "ADAC XML Report",
    };
  }

  function buildAdacReportPdf(bundle, options = {}) {
    const writer = createReportPdfWriter(bundle, options);
    writer.newPage();
    writer.drawCover();
    writer.drawAssetSummary();
    getReportAssetSections(bundle.assets).forEach(({ sectionTitle, assets }) => {
      writer.drawAssetSection(sectionTitle, assets);
    });
    return buildPdfBlob(writer.pages, options);
  }

  function createReportPdfWriter(bundle, options = {}) {
    const writer = {
      bundle,
      logoImage: options.logoImage || null,
      pages: [],
      page: null,
      y: reportPage.contentTop,
      pageNumber: 0,

      newPage() {
        this.pageNumber += 1;
        this.page = { content: [] };
        this.pages.push(this.page);
        this.y = reportPage.contentTop;
        this.drawHeaderFooter();
      },

      drawHeaderFooter() {
        const page = this.page;
        pdfText(page, "ADAC XML REPORT", reportPage.marginX, reportPage.headerY + 14, 11, "F2", [0.32, 0.36, 0.4]);
        pdfFittedText(
          page,
          this.bundle.metadata.name || "ADAC XML Report",
          reportPage.width * 0.45,
          reportPage.width - reportPage.marginX,
          reportPage.headerY + 14,
          (reportPage.width - reportPage.marginX) - (reportPage.width * 0.45),
          12,
          "F2",
          [0.12, 0.15, 0.18],
          "right"
        );
        pdfLine(page, reportPage.marginX, reportPage.headerY + reportPage.headerHeight, reportPage.width - reportPage.marginX, reportPage.headerY + reportPage.headerHeight, [0.6, 0.64, 0.68], 0.5);

        const footerY = reportPage.height - reportPage.footerHeight;
        pdfLine(page, reportPage.marginX, footerY - 6, reportPage.width - reportPage.marginX, footerY - 6, [0.84, 0.86, 0.89], 0.35);
        pdfText(page, `Page ${this.pageNumber}`, reportPage.marginX, footerY + 12, 7.5, "F1", [0.43, 0.47, 0.52]);
        if (this.logoImage) {
          const logoHeight = 16;
          const logoWidth = logoHeight * (this.logoImage.width / this.logoImage.height);
          pdfImage(page, "Logo1", reportPage.width - reportPage.marginX - 118, footerY + 1, logoWidth, logoHeight);
        } else {
          pdfAdactLogoMark(page, reportPage.width - reportPage.marginX - 118, footerY, 14, [0.43, 0.47, 0.52]);
        }
        pdfText(page, reportBusinessName, reportPage.width - reportPage.marginX - 98, footerY + 5, 6.7, "F2", [0.43, 0.47, 0.52]);
        pdfText(page, reportRegistrationLine, reportPage.width - reportPage.marginX - 98, footerY + 13, 6.4, "F1", [0.43, 0.47, 0.52]);
        pdfText(page, reportContactEmail, reportPage.width - reportPage.marginX - 98, footerY + 21, 6.4, "F1", [0.43, 0.47, 0.52]);
      },

      drawCover() {
        this.drawHeading("ADAC XML Report", 1);
        if (this.bundle.metadata.name) {
          this.drawText(this.bundle.metadata.name, 12, [0.29, 0.33, 0.38], 8);
        }
        this.drawKeyValueTable(reportCoverRows(this.bundle));
      },

      drawAssetSummary() {
        const sections = getReportAssetSections(this.bundle.assets);
        const rows = sections.length
          ? sections.map(({ sectionTitle, assets }) => [sectionTitle, String(assets.length)])
          : [["No assets found in the XML.", ""]];
        if (this.y + 90 > reportPage.contentBottom) this.newPage();
        this.drawHeading("Asset Summary", 2, 8);
        this.drawTable(["Asset class", "Count"], rows, [0.78, 0.22], { numericColumns: new Set([1]) });
      },

      drawAssetSection(sectionTitle, assets) {
        this.pageBreak();
        this.drawHeading(reportSectionAssetLabel(sectionTitle), 2);
        const chunks = chunkArray(assets, reportPage.assetColumnsPerTable);
        const sectionLabel = reportSectionAssetLabel(sectionTitle);
        chunks.forEach((chunk, index) => {
          if (chunks.length > 1) {
            const start = index * reportPage.assetColumnsPerTable + 1;
            const end = start + chunk.length - 1;
            const heading = `${sectionLabel} Assets ${start}-${end}`;
            this.keepHeadingWithAssetTable(heading, chunk, 8);
            this.drawHeading(heading, 3, 8);
          }
          this.drawAssetTable(chunk);
        });
      },

      drawAssetTable(assets) {
        const rowMaps = assets.map(reportAssetRows);
        const labels = [];
        const seen = new Set();
        rowMaps.forEach((rows) => {
          Object.keys(rows).forEach((label) => {
            if (seen.has(label)) return;
            labels.push(label);
            seen.add(label);
          });
        });
        const headers = ["Field", ...assets.map((asset, index) => reportAssetColumnHeading(asset, index + 1))];
        const rows = labels.map((label) => [label, ...rowMaps.map((row) => row[label] || "")]);
        const widthParts = [0.22, ...Array(assets.length).fill(0.78 / Math.max(1, assets.length))];
        this.keepTableTogetherIfPossible(rows, reportColumnWidths(widthParts));
        this.drawTable(headers, rows, widthParts, { repeatHeader: true });
      },

      keepHeadingWithAssetTable(heading, assets, spacingBefore) {
        const rowMaps = assets.map(reportAssetRows);
        const labels = [];
        const seen = new Set();
        rowMaps.forEach((rows) => {
          Object.keys(rows).forEach((label) => {
            if (seen.has(label)) return;
            labels.push(label);
            seen.add(label);
          });
        });
        const rows = labels.map((label) => [label, ...rowMaps.map((row) => row[label] || "")]);
        const widthParts = [0.22, ...Array(assets.length).fill(0.78 / Math.max(1, assets.length))];
        const needed = spacingBefore + reportHeadingHeight(heading, 3) + reportTableHeight(rows, reportColumnWidths(widthParts));
        if (needed <= reportPage.contentBottom - reportPage.contentTop && this.y + needed > reportPage.contentBottom) {
          this.newPage();
        }
      },

      keepTableTogetherIfPossible(rows, columnWidths) {
        const needed = reportTableHeight(rows, columnWidths);
        if (needed <= reportPage.contentBottom - reportPage.contentTop && this.y + needed > reportPage.contentBottom) {
          this.newPage();
        }
      },

      drawKeyValueTable(rows) {
        const formatted = rows
          .map(([label, value]) => [label, formatReportValue(value)])
          .filter(([, value]) => value);
        this.drawTable(["Field", "Value"], formatted, [0.28, 0.72]);
      },

      drawHeading(text, level, spacingBefore = 0) {
        if (spacingBefore) this.y += spacingBefore;
        const size = reportHeadingFontSize(level);
        const lineHeight = size + 2.5;
        const lines = wrapReportText(text, reportPage.width - reportPage.marginX * 2, size);
        const height = Math.max(size + 8, lines.length * lineHeight + 8);
        this.ensureSpace(height);
        lines.forEach((line, index) => {
          pdfText(this.page, line, reportPage.marginX, this.y + size + index * lineHeight, size, "F2", level < 3 ? [0.12, 0.15, 0.18] : [0.29, 0.33, 0.38]);
        });
        this.y += height;
      },

      drawText(text, size = 9, color = [0.12, 0.15, 0.18], spacingAfter = 4) {
        const lineHeight = size + 2;
        const lines = wrapReportText(text, reportPage.width - reportPage.marginX * 2, size);
        const height = Math.max(lineHeight, lines.length * lineHeight) + spacingAfter;
        this.ensureSpace(height);
        lines.forEach((line, index) => {
          pdfText(this.page, line, reportPage.marginX, this.y + size + index * lineHeight, size, "F1", color);
        });
        this.y += height;
      },

      drawTable(headers, rows, options, settings = {}) {
        const numericColumns = settings.numericColumns || new Set();
        const columnWidths = reportColumnWidths(options);
        const header = [...headers];
        this.drawTableRow(header, columnWidths, true, numericColumns);
        rows.forEach((row) => {
          const height = reportRowHeight(row, columnWidths, 7.2);
          if (this.y + height > reportPage.contentBottom) {
            this.newPage();
            if (settings.repeatHeader) this.drawTableRow(header, columnWidths, true, numericColumns);
          }
          this.drawTableRow(row, columnWidths, false, numericColumns);
        });
        this.y += 8;
      },

      drawTableRow(row, columnWidths, isHeader, numericColumns) {
        const size = isHeader ? 7.8 : 7.2;
        const height = isHeader ? 16 : reportRowHeight(row, columnWidths, size);
        this.ensureSpace(height);
        let x = reportPage.marginX;
        const fill = isHeader ? [0.9, 0.92, 0.94] : [1, 1, 1];
        row.forEach((value, columnIndex) => {
          const width = columnWidths[columnIndex] || 0;
          pdfRect(this.page, x, this.y, width, height, [0.72, 0.76, 0.8], fill, 0.35);
          const text = formatReportValue(value);
          const lines = wrapReportText(text, Math.max(1, width - 6), size);
          const align = numericColumns.has(columnIndex) ? "right" : "left";
          lines.forEach((line, lineIndex) => {
            const baseline = this.y + 2.2 + size + lineIndex * (size + 2.2);
            if (baseline > this.y + height - 1.5) return;
            const textX = align === "right" ? x + width - 3 : x + 3;
            pdfText(this.page, line, textX, baseline, size, isHeader || columnIndex === 0 ? "F2" : "F1", [0.13, 0.17, 0.22], align);
          });
          x += width;
        });
        this.y += height;
      },

      ensureSpace(height) {
        if (this.y + height > reportPage.contentBottom) this.newPage();
      },

      pageBreak() {
        if (this.y > reportPage.contentTop + 4) this.newPage();
      },
    };
    return writer;
  }

  function reportCoverRows(bundle) {
    const metadata = bundle.metadata;
    const coordinateSystem = metadata.coordinateSystem || {};
    const software = metadata.software || {};
    const surveyor = metadata.surveyor || {};
    const engineer = metadata.engineer || {};
    const rows = [
      ["Project name", metadata.name],
      ["Work Approval ID", metadata.worksApprovalId],
      ["ADAC version", schemaLabel(bundle.schemaVersion)],
      ["Drawing Number", metadata.drawingNumber],
      ["Description", metadata.description],
      ["Drawing Revision", metadata.drawingRevision],
      ["Status", metadata.projectStatus],
      ["Construction date", metadata.constructionDate],
      ["Export date time", metadata.exportDateTime],
      ["Owner", metadata.owner],
      ["Receiver", metadata.receiver],
      ["Software product", software.Product],
      ["Software version", software.Version],
      ["Surveyor", surveyor.Name],
      ["Surveyor date approved", surveyor.DateApproved],
      ["Surveyor date final survey", surveyor.DateFinalSurvey],
      ["Engineer", engineer.Name],
      ["Engineer date approved", engineer.DateApproved],
      ["Horizontal coordinate", coordinateSystem.horizontalCoordinateSystem],
      ["Horizontal datum", coordinateSystem.horizontalDatum],
      ["Vertical datum", coordinateSystem.verticalDatum],
      ["Is approximate", coordinateSystem.isApproximate],
      ["Origin mark", coordinateSystem.originMark],
      ["Coordinate notes", coordinateSystem.notes],
    ];
    if (metadata.drawingExtents) {
      rows.push(
        ["South West X", metadata.drawingExtents.southWest.X],
        ["South West Y", metadata.drawingExtents.southWest.Y],
        ["South West Z", metadata.drawingExtents.southWest.Z],
        ["North East X", metadata.drawingExtents.northEast.X],
        ["North East Y", metadata.drawingExtents.northEast.Y],
        ["North East Z", metadata.drawingExtents.northEast.Z]
      );
    }
    return rows;
  }

  function getReportAssetSections(assets) {
    const grouped = new Map();
    assets.forEach((asset) => {
      const title = reportAssetSectionTitle(asset.assetPath);
      if (!grouped.has(title)) grouped.set(title, []);
      grouped.get(title).push(asset);
    });
    return Array.from(grouped.entries()).map(([sectionTitle, sectionAssets]) => ({ sectionTitle, assets: sectionAssets }));
  }

  function reportAssetRows(asset) {
    const rows = {};
    const values = asset.values || {};
    const name = formatReportValue(values.Name);
    const assetId = reportAssetId(asset);
    if (name) rows.Name = name;
    if (assetId) rows["ADAC ID"] = assetId;
    reportGeometryRows(values.Geometry || asset.geometry, !omitReportGeometryZ(asset.assetPath)).forEach(([label, value]) => {
      const formatted = formatReportValue(value);
      if (formatted) rows[label] = formatted;
    });
    flattenReportValueRows(values).forEach(([label, value]) => {
      if (["Geometry", "Name", "ADACId", "ADAC ID"].includes(label) || label.startsWith("Geometry ")) return;
      if (label.startsWith("Component Info Surveyor") || label.startsWith("Component Info Engineer")) return;
      const formatted = formatReportValue(value);
      if (formatted) rows[label] = formatted;
    });
    return reorderReportAssetRows(rows);
  }

  function reorderReportAssetRows(rows) {
    const entries = Object.entries(rows);
    const chamberLidEntries = entries
      .map(([label, value], index) => ({ label, value, index }))
      .filter((entry) => isChamberLidReportRow(entry.label));
    if (chamberLidEntries.length < 2) return rows;

    const firstChamberLidIndex = Math.min(...chamberLidEntries.map((entry) => entry.index));
    const sortedChamberLidEntries = chamberLidEntries
      .slice()
      .sort((a, b) => reportChamberLidRowOrder(a.label) - reportChamberLidRowOrder(b.label) || a.index - b.index);

    const resultEntries = [];
    entries.forEach(([label, value], index) => {
      if (index === firstChamberLidIndex) {
        sortedChamberLidEntries.forEach((entry) => resultEntries.push([entry.label, entry.value]));
      }
      if (!isChamberLidReportRow(label)) resultEntries.push([label, value]);
    });
    return Object.fromEntries(resultEntries);
  }

  function isChamberLidReportRow(label) {
    const normalized = normalizeDetailKey(label);
    return normalized.includes("chamberconstruction")
      || normalized.includes("chambersize")
      || normalized.includes("lidsize")
      || normalized.endsWith("lidtype");
  }

  function reportChamberLidRowOrder(label) {
    const normalized = normalizeDetailKey(label);
    let order = 99;
    if (normalized.includes("chamberconstruction")) order = 10;
    else if (normalized.includes("chambersizerectangular")) order = 20;
    else if (normalized.includes("chambersizecircular")) order = 30;
    else if (normalized.includes("chambersize")) order = 25;
    else if (normalized.includes("lidsizerectangular")) order = 40;
    else if (normalized.includes("lidsizecircular")) order = 50;
    else if (normalized.includes("lidsize")) order = 45;
    else if (normalized.endsWith("lidtype")) order = 60;
    return order + reportDimensionRowOrder(normalized) / 100;
  }

  function reportDimensionRowOrder(normalizedLabel) {
    if (normalizedLabel.includes("length")) return 1;
    if (normalizedLabel.includes("width")) return 2;
    if (normalizedLabel.includes("height")) return 3;
    if (normalizedLabel.includes("diameter")) return 4;
    return 9;
  }

  function reportGeometryRows(value, includeZ) {
    const points = reportGeometryPoints(value);
    if (!points.length) return [];
    if (points.length === 1) {
      const point = points[0];
      const rows = [["X", point.X], ["Y", point.Y]];
      if (includeZ && formatReportValue(point.Z)) rows.push(["Z", point.Z]);
      return rows;
    }
    const first = points[0];
    const last = lastDistinctReportGeometryPoint(points);
    const rows = [["Start X", first.X], ["Start Y", first.Y]];
    if (includeZ && formatReportValue(first.Z)) rows.push(["Start Z", first.Z]);
    rows.push(["End X", last.X], ["End Y", last.Y]);
    if (includeZ && formatReportValue(last.Z)) rows.push(["End Z", last.Z]);
    return rows;
  }

  function reportGeometryPoints(value) {
    if (Array.isArray(value)) return value.flatMap(reportGeometryPoints);
    if (value && typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, "X") && Object.prototype.hasOwnProperty.call(value, "Y")) return [value];
      return Object.values(value).flatMap(reportGeometryPoints);
    }
    return [];
  }

  function lastDistinctReportGeometryPoint(points) {
    if (points.length < 2) return points[0];
    const first = points[0];
    for (let index = points.length - 1; index > 0; index -= 1) {
      if (!sameReportGeometryPoint(first, points[index])) return points[index];
    }
    return points[points.length - 1];
  }

  function sameReportGeometryPoint(first, second) {
    return formatReportValue(first.X) === formatReportValue(second.X)
      && formatReportValue(first.Y) === formatReportValue(second.Y)
      && formatReportValue(first.Z) === formatReportValue(second.Z);
  }

  function flattenReportValueRows(value, prefix = "") {
    if (Array.isArray(value)) {
      if (value.every((item) => !item || typeof item !== "object")) {
        return [[prefix, value.map(formatReportValue).filter(Boolean).join(", ")]];
      }
      return value.flatMap((item, index) => flattenReportValueRows(item, `${prefix} ${index + 1}`.trim()));
    }
    if (value && typeof value === "object") {
      const dimensionRow = reportDimensionContainerRow(value, prefix);
      if (dimensionRow) return [dimensionRow];
      return Object.entries(value).flatMap(([key, child]) => {
        const childPrefix = `${prefix} ${friendlyReportLabel(key)}`.trim();
        return flattenReportValueRows(child, childPrefix);
      });
    }
    return prefix ? [[prefix, value]] : [];
  }

  function reportDimensionContainerRow(value, prefix) {
    const normalizedPrefix = normalizeDetailKey(prefix);
    const baseLabel = reportDimensionContainerBaseLabel(normalizedPrefix);
    if (!baseLabel) return null;

    const dimensions = reportObjectDimensionValues(value);
    if (dimensions.diameter) {
      return [`${baseLabel} Circular`, dimensions.diameter];
    }
    return null;
  }

  function reportDimensionContainerBaseLabel(normalizedPrefix) {
    if (normalizedPrefix === "chambersize" || normalizedPrefix === "chambersizerectangular" || normalizedPrefix === "chambersizecircular") return "Chamber Size";
    if (normalizedPrefix === "lidsize" || normalizedPrefix === "lidsizerectangular" || normalizedPrefix === "lidsizecircular") return "Lid Size";
    return "";
  }

  function reportObjectDimensionValues(value) {
    const dimensions = {};
    Object.entries(value || {}).forEach(([key, item]) => {
      if (item && typeof item === "object") return;
      const normalized = normalizeDetailKey(key);
      const formatted = formatReportValue(item);
      if (!formatted) return;
      if (normalized.includes("diameter")) dimensions.diameter = formatted;
      else if (normalized.includes("length")) dimensions.length = formatted;
      else if (normalized.includes("width")) dimensions.width = formatted;
      else if (normalized.includes("height") || normalized.includes("depth")) dimensions.height = formatted;
    });
    return dimensions;
  }

  function reportAssetSectionTitle(assetPath) {
    const parts = String(assetPath || "").split("/").filter(Boolean);
    if (!parts.length) return "Assets";
    return `${parts[0]}:${parts[parts.length - 1]}`;
  }

  function reportSectionAssetLabel(sectionTitle) {
    return String(sectionTitle || "Assets").replace(/:/g, " ").split(/\s+/).filter(Boolean).join(" ") || "Assets";
  }

  function reportAssetColumnHeading(asset, index) {
    return reportAssetId(asset) || formatReportValue((asset.values || {}).Name) || `Asset ${index}`;
  }

  function reportAssetId(asset) {
    const values = asset.values || {};
    for (const key of ["ADACId", "ADACID", "AssetID", "AssetId"]) {
      const value = formatReportValue(values[key]);
      if (value) return value;
    }
    return "";
  }

  function omitReportGeometryZ(assetPath) {
    return /^(Cadastre|OpenSpace|Transport|WaterSupply)\//.test(String(assetPath || ""));
  }

  function friendlyReportLabel(value) {
    let text = String(value || "").trim().replace(/_/g, " ");
    if (!text) return "";
    text = text.replace(/(?<=[a-z0-9])(?=[A-Z])/g, " ");
    return text.replace(/ mm/g, "(mm)").replace(/ m/g, "(m)");
  }

  function reportColumnWidths(widthParts) {
    const tableWidth = reportPage.width - reportPage.marginX * 2;
    return widthParts.map((part) => tableWidth * part);
  }

  function reportRowHeight(row, columnWidths, size) {
    const lineHeight = size + 2.2;
    const lineCount = row.reduce((count, value, index) => {
      return Math.max(count, wrapReportText(formatReportValue(value), Math.max(1, (columnWidths[index] || 0) - 6), size).length);
    }, 1);
    return Math.max(14, lineCount * lineHeight + 5);
  }

  function reportTableHeight(rows, columnWidths) {
    return 16 + rows.reduce((total, row) => total + reportRowHeight(row, columnWidths, 7.2), 0) + 8;
  }

  function reportHeadingFontSize(level) {
    return level === 1 ? 20 : level === 2 ? 14 : 10.5;
  }

  function reportHeadingHeight(text, level) {
    const size = reportHeadingFontSize(level);
    const lineHeight = size + 2.5;
    const lines = wrapReportText(text, reportPage.width - reportPage.marginX * 2, size);
    return Math.max(size + 8, lines.length * lineHeight + 8);
  }

  function wrapReportText(text, width, size) {
    const cleaned = formatReportValue(text).replace(/\s+/g, " ").trim();
    if (!cleaned) return [""];
    const lines = [];
    let current = "";

    const fits = (value) => estimatePdfTextWidth(pdfEscapeText(value), size) <= width;
    const pushLongWord = (word) => {
      let chunk = "";
      Array.from(word).forEach((char) => {
        const candidate = `${chunk}${char}`;
        if (!chunk || fits(candidate)) {
          chunk = candidate;
          return;
        }
        lines.push(chunk);
        chunk = char;
      });
      if (chunk) lines.push(chunk);
    };

    cleaned.split(" ").forEach((word) => {
      if (!fits(word)) {
        if (current) {
          lines.push(current);
          current = "";
        }
        pushLongWord(word);
        return;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (fits(candidate)) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  function formatReportValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    if (Array.isArray(value)) return value.map(formatReportValue).filter(Boolean).join(", ");
    if (typeof value === "object") return "";
    return String(value).trim();
  }

  function schemaLabel(schemaVersion) {
    if (schemaVersion === "v5") return "5.0.1";
    if (schemaVersion === "v6") return "6.0.0";
    return schemaVersion || "";
  }

  function reportPdfFilename() {
    const baseName = state.loadedFiles.length === 1
      ? stripFileExtension(state.loadedFiles[0].name)
      : "ADAC_XML_Report";
    return `${sanitizeFilename(baseName || "ADAC_XML_Report")}.pdf`;
  }

  function separateReportPdfFilename(reportBundle, index) {
    const sourceName = stripFileExtension(reportBundle.fileName || state.loadedFiles[index]?.name || `ADAC_XML_Report_${index + 1}`);
    return `${sanitizeFilename(sourceName || `ADAC_XML_Report_${index + 1}`)}.pdf`;
  }

  function getReportLogoImage() {
    if (!reportLogoImagePromise) {
      reportLogoImagePromise = loadReportLogoImage().catch((error) => {
        reportLogoImagePromise = null;
        throw error;
      });
    }
    return reportLogoImagePromise;
  }

  async function loadReportLogoImage() {
    const image = await loadImageElement(reportLogoPath);
    const maxSize = 96;
    const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const logoContext = canvas.getContext("2d");
    logoContext.clearRect(0, 0, width, height);
    logoContext.drawImage(image, 0, 0, width, height);
    const imageData = logoContext.getImageData(0, 0, width, height).data;
    const rgb = new Uint8Array(width * height * 3);
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < imageData.length; sourceIndex += 4, targetIndex += 3) {
      const alpha = imageData[sourceIndex + 3] / 255;
      rgb[targetIndex] = Math.round(imageData[sourceIndex] * alpha + 255 * (1 - alpha));
      rgb[targetIndex + 1] = Math.round(imageData[sourceIndex + 1] * alpha + 255 * (1 - alpha));
      rgb[targetIndex + 2] = Math.round(imageData[sourceIndex + 2] * alpha + 255 * (1 - alpha));
    }
    return { width, height, rgb };
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`The ADACT logo could not be loaded from ${src}.`));
      image.src = src;
    });
  }

  function buildPdfBlob(pages, options = {}) {
    const logoImage = options.logoImage || null;
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ];
    let logoObjectNumber = null;
    if (logoImage) {
      logoObjectNumber = objects.length + 1;
      objects.push({
        dictionary: `<< /Type /XObject /Subtype /Image /Width ${logoImage.width} /Height ${logoImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${logoImage.rgb.length} >>`,
        data: logoImage.rgb,
      });
    }
    const kids = [];
    pages.forEach((page) => {
      const pageObjectNumber = objects.length + 1;
      const streamObjectNumber = objects.length + 2;
      const imageResources = logoObjectNumber ? ` /XObject << /Logo1 ${logoObjectNumber} 0 R >>` : "";
      kids.push(`${pageObjectNumber} 0 R`);
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(reportPage.width)} ${pdfNumber(reportPage.height)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${imageResources} >> /Contents ${streamObjectNumber} 0 R >>`
      );
      const stream = page.content.join("\n");
      const length = new TextEncoder().encode(stream).length;
      objects.push(`<< /Length ${length} >>\nstream\n${stream}\nendstream`);
    });
    objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;

    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let length = 0;
    const append = (text) => {
      const bytes = encoder.encode(text);
      chunks.push(bytes);
      length += bytes.length;
    };
    const appendBytes = (bytes) => {
      chunks.push(bytes);
      length += bytes.length;
    };

    append("%PDF-1.4\n");
    objects.forEach((object, index) => {
      offsets[index + 1] = length;
      append(`${index + 1} 0 obj\n`);
      if (typeof object === "string") {
        append(`${object}\n`);
      } else {
        append(`${object.dictionary}\nstream\n`);
        appendBytes(object.data);
        append("\nendstream\n");
      }
      append("endobj\n");
    });
    const xrefOffset = length;
    append(`xref\n0 ${objects.length + 1}\n`);
    append("0000000000 65535 f \n");
    for (let index = 1; index <= objects.length; index += 1) {
      append(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
    }
    append(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
    return new Blob(chunks, { type: "application/pdf" });
  }

  function pdfText(page, text, x, y, size, font, color, align = "left") {
    const safeText = pdfEscapeText(text);
    const textWidth = estimatePdfTextWidth(safeText, size);
    const textX = align === "right" ? x - textWidth : x;
    page.content.push(`BT /${font} ${pdfNumber(size)} Tf ${pdfColor(color, "rg")} ${pdfNumber(textX)} ${pdfNumber(reportPage.height - y)} Td (${safeText}) Tj ET`);
  }

  function pdfFittedText(page, text, leftX, rightX, y, maxWidth, size, font, color, align = "left") {
    let fitted = formatReportValue(text);
    let fittedSize = size;
    while (fittedSize > 8.5 && estimatePdfTextWidth(pdfEscapeText(fitted), fittedSize) > maxWidth) {
      fittedSize -= 0.5;
    }
    if (estimatePdfTextWidth(pdfEscapeText(fitted), fittedSize) > maxWidth) {
      while (fitted.length > 4 && estimatePdfTextWidth(pdfEscapeText(`${fitted}...`), fittedSize) > maxWidth) {
        fitted = fitted.slice(0, -1);
      }
      fitted = `${fitted.trim()}...`;
    }
    pdfText(page, fitted, align === "right" ? rightX : leftX, y, fittedSize, font, color, align);
  }

  function pdfLine(page, x1, y1, x2, y2, color, width) {
    page.content.push(`${pdfNumber(width)} w ${pdfColor(color, "RG")} ${pdfNumber(x1)} ${pdfNumber(reportPage.height - y1)} m ${pdfNumber(x2)} ${pdfNumber(reportPage.height - y2)} l S`);
  }

  function pdfRect(page, x, y, width, height, stroke, fill, lineWidth) {
    page.content.push(`${pdfNumber(lineWidth)} w ${pdfColor(stroke, "RG")} ${pdfColor(fill, "rg")} ${pdfNumber(x)} ${pdfNumber(reportPage.height - y - height)} ${pdfNumber(width)} ${pdfNumber(height)} re B`);
  }

  function pdfImage(page, name, x, y, width, height) {
    page.content.push(`q ${pdfNumber(width)} 0 0 ${pdfNumber(height)} ${pdfNumber(x)} ${pdfNumber(reportPage.height - y - height)} cm /${name} Do Q`);
  }

  function pdfAdactLogoMark(page, x, y, size, color) {
    const scale = size / 14;
    const px = (value) => x + value * scale;
    const py = (value) => y + value * scale;
    pdfPolyline(page, [[1, 6], [7, 1], [13, 6]], color, 0.85, false, px, py);
    pdfPolyline(page, [[2.3, 5.8], [2.3, 13], [11.7, 13], [11.7, 5.8]], color, 0.85, false, px, py);
    pdfPolyline(page, [[3.5, 12.3], [5.5, 5.6], [7.2, 12.3], [5.0, 12.3]], color, 0.75, false, px, py);
    pdfCircle(page, px(9.5), py(7.6), 2.55 * scale, color, 0.75);
  }

  function pdfPolyline(page, points, color, width, closePath, mapX = (value) => value, mapY = (value) => value) {
    if (!points.length) return;
    const [firstX, firstY] = points[0];
    const commands = [`${pdfNumber(mapX(firstX))} ${pdfNumber(reportPage.height - mapY(firstY))} m`];
    points.slice(1).forEach(([pointX, pointY]) => {
      commands.push(`${pdfNumber(mapX(pointX))} ${pdfNumber(reportPage.height - mapY(pointY))} l`);
    });
    if (closePath) commands.push("h");
    page.content.push(`${pdfNumber(width)} w ${pdfColor(color, "RG")} ${commands.join(" ")} S`);
  }

  function pdfCircle(page, centerX, centerY, radius, color, width) {
    const k = 0.5522847498;
    const c = radius * k;
    const y = (value) => reportPage.height - value;
    page.content.push([
      `${pdfNumber(width)} w ${pdfColor(color, "RG")}`,
      `${pdfNumber(centerX + radius)} ${pdfNumber(y(centerY))} m`,
      `${pdfNumber(centerX + radius)} ${pdfNumber(y(centerY - c))} ${pdfNumber(centerX + c)} ${pdfNumber(y(centerY - radius))} ${pdfNumber(centerX)} ${pdfNumber(y(centerY - radius))} c`,
      `${pdfNumber(centerX - c)} ${pdfNumber(y(centerY - radius))} ${pdfNumber(centerX - radius)} ${pdfNumber(y(centerY - c))} ${pdfNumber(centerX - radius)} ${pdfNumber(y(centerY))} c`,
      `${pdfNumber(centerX - radius)} ${pdfNumber(y(centerY + c))} ${pdfNumber(centerX - c)} ${pdfNumber(y(centerY + radius))} ${pdfNumber(centerX)} ${pdfNumber(y(centerY + radius))} c`,
      `${pdfNumber(centerX + c)} ${pdfNumber(y(centerY + radius))} ${pdfNumber(centerX + radius)} ${pdfNumber(y(centerY + c))} ${pdfNumber(centerX + radius)} ${pdfNumber(y(centerY))} c S`,
    ].join(" "));
  }

  function pdfColor(color, operator) {
    return `${pdfNumber(color[0])} ${pdfNumber(color[1])} ${pdfNumber(color[2])} ${operator}`;
  }

  function pdfNumber(value) {
    const text = Number(value || 0).toFixed(3).replace(/\.?0+$/, "");
    return text || "0";
  }

  function pdfEscapeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function estimatePdfTextWidth(value, size) {
    return String(value || "").length * size * 0.52;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  function stripFileExtension(filename) {
    return String(filename || "").replace(/\.[^.]+$/, "");
  }

  function sanitizeFilename(value) {
    return String(value || "ADAC_XML_Report").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").replace(/^_+|_+$/g, "") || "ADAC_XML_Report";
  }

  function fitMap() {
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    drawMap();
  }

  function toggleLabelMenu() {
    if (isLabelMenuOpen()) {
      closeLabelMenu();
    } else {
      openLabelMenu();
    }
  }

  function openLabelMenu() {
    if (!els.labelMenu) return;
    closeTransientUi("label");
    els.labelMenu.hidden = false;
    if (els.labelButton) els.labelButton.setAttribute("aria-expanded", "true");
  }

  function closeLabelMenu() {
    if (!els.labelMenu) return;
    els.labelMenu.hidden = true;
    if (els.labelButton) els.labelButton.setAttribute("aria-expanded", "false");
  }

  function isLabelMenuOpen() {
    return Boolean(els.labelMenu && !els.labelMenu.hidden);
  }

  function setLabelMode(mode) {
    state.labelMode = ["simple", "detailed", "off"].includes(mode) ? mode : "simple";
    closeLabelMenu();
    renderLabelLayers();
    updateLabelPanelState();
    drawMap();
  }

  function updateLabelModeUi() {
    const enabled = state.labelMode !== "off";
    if (els.labelButton) {
      els.labelButton.classList.toggle("is-active", enabled);
      els.labelButton.setAttribute("aria-pressed", String(enabled));
      els.labelButton.setAttribute("title", `Labels: ${titleCase(state.labelMode)}`);
      els.labelButton.setAttribute("aria-label", `Labels: ${titleCase(state.labelMode)}`);
    }
    if (els.labelMenu) {
      els.labelMenu.querySelectorAll("[data-action^='set-label-']").forEach((button) => {
        const mode = button.dataset.action.replace("set-label-", "");
        button.classList.toggle("is-active", mode === state.labelMode);
      });
    }
  }

  function toggleMeasurementMenu() {
    if (isMeasurementMenuOpen()) {
      closeMeasurementMenu();
    } else {
      openMeasurementMenu();
    }
  }

  function openMeasurementMenu() {
    if (!els.measurementMenu) return;
    closeTransientUi("measurement");
    els.measurementMenu.hidden = false;
    if (els.measurementButton) els.measurementButton.setAttribute("aria-expanded", "true");
  }

  function closeMeasurementMenu() {
    if (!els.measurementMenu) return;
    els.measurementMenu.hidden = true;
    if (els.measurementButton) els.measurementButton.setAttribute("aria-expanded", "false");
  }

  function isMeasurementMenuOpen() {
    return Boolean(els.measurementMenu && !els.measurementMenu.hidden);
  }

  function setMeasurementMode(mode) {
    const nextMode = ["distance", "area"].includes(mode) ? mode : "off";
    closeMeasurementMenu();
    if (nextMode === "off") {
      state.measurement.mode = "off";
      clearMeasurement(false);
      drawMap();
      return;
    }
    state.measurement.points = [];
    state.measurement.preview = null;
    state.measurement.mode = nextMode;
    state.measurement.resultMode = nextMode;
    drawMap();
  }

  function clearMeasurement(shouldRender = true) {
    state.measurement.mode = "off";
    state.measurement.resultMode = "off";
    state.measurement.points = [];
    state.measurement.preview = null;
    state.measurement.completed = [];
    if (shouldRender) drawMap();
  }

  function isMeasurementActive() {
    return state.measurement.mode === "distance" || state.measurement.mode === "area";
  }

  function getMeasurementDisplayMode() {
    const lastMeasurement = getLastCompletedMeasurement();
    return isMeasurementActive() ? state.measurement.mode : (lastMeasurement ? lastMeasurement.mode : state.measurement.resultMode);
  }

  function hasMeasurementResult() {
    return state.measurement.completed.length > 0;
  }

  function openTermsModal() {
    if (!els.termsModal) return;
    closeTransientUi("terms");
    els.termsModal.hidden = false;
    if (els.termsButton) els.termsButton.setAttribute("aria-expanded", "true");
  }

  function closeTermsModal() {
    if (!els.termsModal) return;
    els.termsModal.hidden = true;
    if (els.termsButton) els.termsButton.setAttribute("aria-expanded", "false");
  }

  function acceptTerms() {
    closeTermsModal();
  }

  function toggleSuggestions() {
    if (!els.suggestionWidget || !els.suggestionPanel) return;
    const isOpen = !els.suggestionWidget.classList.contains("is-open");
    if (isOpen) {
      closeTransientUi("suggestions");
      els.suggestionWidget.classList.add("is-open");
    } else {
      els.suggestionWidget.classList.remove("is-open");
    }
    const toggle = els.suggestionWidget.querySelector("[data-action='toggle-suggestions']");
    if (toggle) toggle.setAttribute("aria-expanded", String(isOpen));
    els.suggestionPanel.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen) {
      const textarea = els.suggestionForm.querySelector("textarea[name='message']");
      if (textarea) textarea.focus();
    }
  }

  function closeSuggestions() {
    if (!els.suggestionWidget || !els.suggestionPanel) return;
    els.suggestionWidget.classList.remove("is-open");
    const toggle = els.suggestionWidget.querySelector("[data-action='toggle-suggestions']");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    els.suggestionPanel.setAttribute("aria-hidden", "true");
  }

  async function handleSuggestionSubmit(event) {
    event.preventDefault();

    const submitButton = els.suggestionForm.querySelector("button[type='submit']");
    const message = els.suggestionForm.querySelector("textarea[name='message']").value.trim();

    if (message.length < 4) {
      setSuggestionStatus("Add a little more detail before sending.", true);
      return;
    }

    const formData = new FormData(els.suggestionForm);
    formData.append("page_url", window.location.href);
    formData.append("viewer_file", state.fileName || "No ADAC file loaded");

    submitButton.disabled = true;
    setSuggestionStatus("Sending suggestion...", false);

    try {
      const response = await fetch(els.suggestionForm.action, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Submission failed");
      }
      els.suggestionForm.reset();
      setSuggestionStatus("Thanks - your suggestion has been sent.", false);
    } catch (error) {
      setSuggestionStatus("Something went wrong. Please try again or email projects@adact.com.au.", true);
    } finally {
      submitButton.disabled = false;
    }
  }

  function setSuggestionStatus(message, isError) {
    els.suggestionStatus.textContent = message;
    els.suggestionStatus.classList.toggle("is-error", Boolean(isError));
  }

  function handleMapWheel(event) {
    if (!state.filteredFeatures.length) return;
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
    zoomAtCanvasPoint(zoomFactor, getCanvasPoint(event));
  }

  function handleMapPointerDown(event) {
    if (!state.filteredFeatures.length || event.button !== 0) return;
    event.preventDefault();
    state.isPointerDown = true;
    state.hasDraggedMap = false;
    state.panStart = {
      x: event.clientX,
      y: event.clientY,
    };
    state.pointerStart = {
      x: event.clientX,
      y: event.clientY,
    };
    els.canvas.setPointerCapture(event.pointerId);
  }

  function handleMapPointerMove(event) {
    if (!state.isPointerDown) {
      if (isMeasurementActive() && state.measurement.points.length) {
        state.measurement.preview = getMeasurementPointFromCanvas(getCanvasPoint(event));
        drawMap();
      }
      return;
    }
    event.preventDefault();
    const dx = event.clientX - state.panStart.x;
    const dy = event.clientY - state.panStart.y;
    const totalDx = event.clientX - state.pointerStart.x;
    const totalDy = event.clientY - state.pointerStart.y;

    if (!state.isPanning && Math.hypot(totalDx, totalDy) < 5) return;

    if (!state.isPanning) {
      state.isPanning = true;
      state.hasDraggedMap = true;
      els.canvas.classList.add("is-panning");
    }

    state.pan.x += dx;
    state.pan.y += dy;
    state.panStart = {
      x: event.clientX,
      y: event.clientY,
    };
    drawMap();
  }

  function handleMapPointerUp(event) {
    if (!state.isPointerDown) return;
    const wasDragging = state.hasDraggedMap;
    state.isPointerDown = false;
    state.isPanning = false;
    state.hasDraggedMap = false;
    els.canvas.classList.remove("is-panning");
    if (els.canvas.hasPointerCapture && els.canvas.hasPointerCapture(event.pointerId)) {
      els.canvas.releasePointerCapture(event.pointerId);
    }
    if (!wasDragging) {
      const canvasPoint = getCanvasPoint(event);
      if (isMeasurementActive()) {
        if (event.detail > 1) {
          finishMeasurement();
        } else {
          addMeasurementPoint(canvasPoint);
        }
        return;
      }
      const labelHit = findLabelAtCanvasPoint(canvasPoint);
      if (labelHit) {
        selectFeature(labelHit.featureUid);
        return;
      }
      const feature = findFeatureAtCanvasPoint(canvasPoint);
      if (feature) {
        selectFeature(feature.uid);
        return;
      }
      const overlayHit = findOverlayFeatureAtCanvasPoint(canvasPoint);
      if (overlayHit) selectOverlayFeature(overlayHit);
    }
  }

  function handleMapDoubleClick(event) {
    if (!isMeasurementActive()) return;
    event.preventDefault();
    finishMeasurement();
  }

  function addMeasurementPoint(canvasPoint) {
    const point = getMeasurementPointFromCanvas(canvasPoint);
    if (!point) return;
    state.measurement.points.push(point);
    state.measurement.preview = null;
    drawMap();
  }

  function finishMeasurement() {
    const points = state.measurement.points;
    if (points.length >= 2 && measurementDistanceBetween(points[points.length - 2], points[points.length - 1]) < 0.05) {
      points.pop();
    }
    const completedMode = state.measurement.mode;
    const minimumPoints = completedMode === "area" ? 3 : 2;
    if (points.length >= minimumPoints) {
      state.measurement.completed.push({
        mode: completedMode,
        points: points.map((point) => ({ ...point })),
      });
      state.measurement.resultMode = completedMode;
    }
    state.measurement.mode = "off";
    state.measurement.points = [];
    state.measurement.preview = null;
    drawMap();
  }

  function getMeasurementPointFromCanvas(canvasPoint) {
    const transform = getCurrentMapTransform();
    if (!transform) return null;
    if (transform.type === "geo") {
      const mercator = unprojectCanvasPoint(canvasPoint, transform);
      const latLng = mercatorPointToLatLng(mercator.x, mercator.y);
      if (!latLng) return null;
      return {
        type: "geo",
        lat: latLng.lat,
        lng: latLng.lng,
      };
    }
    return {
      type: "raw",
      ...unproject(canvasPoint, transform),
    };
  }

  function getCurrentMapTransform() {
    const features = state.filteredFeatures;
    if (!features.length) return null;
    const width = els.canvas.clientWidth || els.canvas.width;
    const height = els.canvas.clientHeight || els.canvas.height;
    return getActiveMapTransform(features, width, height);
  }

  function zoomAtCanvasPoint(factor, point) {
    const features = state.filteredFeatures;
    if (!features.length) return;

    const width = els.canvas.clientWidth || els.canvas.width;
    const height = els.canvas.clientHeight || els.canvas.height;
    const oldTransform = getActiveMapTransform(features, width, height);
    const worldPoint = unprojectCanvasPoint(point, oldTransform);
    const nextZoom = clamp(state.zoom * factor, mapMinZoom, mapMaxZoom);

    if (nextZoom === state.zoom) return;

    state.zoom = nextZoom;
    const newTransform = getActiveMapTransform(features, width, height);
    const projected = projectWorldPoint(worldPoint, newTransform);
    state.pan.x += point.x - projected.x;
    state.pan.y += point.y - projected.y;
    drawMap();
  }

  function getCanvasCenter() {
    return {
      x: (els.canvas.clientWidth || els.canvas.width) / 2,
      y: (els.canvas.clientHeight || els.canvas.height) / 2,
    };
  }

  function getCanvasPoint(event) {
    const rect = els.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleFileInput(event) {
    const files = Array.from(event.target.files || []);
    if (files.length) readXmlFiles(files);
    event.target.value = "";
  }

  function readXmlFiles(files) {
    Promise.all(files.map(readFileAsText))
      .then((items) => loadXmlFiles(items, { replace: false }))
      .catch(() => setStatus("Could not read one of those files.", true));
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ xmlText: String(reader.result || ""), fileName: file.name });
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function readXmlFile(file) {
    const reader = new FileReader();
    reader.onload = () => loadXml(String(reader.result || ""), file.name);
    reader.onerror = () => setStatus("Could not read that file.", true);
    reader.readAsText(file);
  }

  function loadXml(xmlText, fileName, options = { replace: true }) {
    return loadXmlFiles([{ xmlText, fileName }], options);
  }

  async function loadXmlFiles(files, options = { replace: false }) {
    const replace = Boolean(options.replace);
    const parsedFiles = [];
    const parseErrors = [];
    const validationErrors = [];

    state.repairPreview = null;
    state.validationErrorResults = [];
    renderRepairPreviewBanner();
    renderValidationPanel();
    setStatus(`Validating ${files.length} XML file${files.length === 1 ? "" : "s"} against the ADAC schema...`, false);

    for (const { xmlText, fileName } of files) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "application/xml");
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        parseErrors.push({ fileName, xmlText, ...getParseErrorDetails(parseError, xmlText) });
        continue;
      }
      const schemaValidation = await validateAdacSchema(xmlText, fileName, doc);
      if (!schemaValidation.valid) {
        validationErrors.push({ ...schemaValidation, xmlText });
        continue;
      }
      const features = extractFeatures(doc);
      parsedFiles.push({
        fileName,
        doc,
        features,
        fileMeta: extractFileMeta(doc),
        reportBundle: extractReportBundle(doc, fileName),
        schemaValidation,
      });
    }

    const failedValidationResults = [
      ...parseErrors.map((error) => ({
        fileName: error.fileName,
        xmlText: error.xmlText,
        schemaLabel: "XML",
        status: "parse-error",
        errors: [{ ...error, loc: error.loc || null }],
      })),
      ...validationErrors,
    ];
    state.validationErrorResults = failedValidationResults;

    if (!parsedFiles.length) {
      if (replace || !state.features.length) {
        clearLoadedFiles(false);
      }
      state.validationErrorResults = failedValidationResults;
      const message = state.validationErrorResults.length
        ? getValidationFailureStatusMessage(state.validationErrorResults)
        : "No XML files were loaded.";
      setStatus(message, true);
      renderAll();
      return;
    }

    applyParsedFilesToState(parsedFiles, {
      replace,
      validationErrorResults: failedValidationResults,
    });

    const loadedAssetCount = parsedFiles.reduce((total, item) => total + item.features.length, 0);
    const loadedReportAssetCount = parsedFiles.reduce((total, item) => total + item.reportBundle.assets.length, 0);
    const loadedFileCount = parsedFiles.length;
    const skippedCount = state.validationErrorResults.length;
    const skippedText = skippedCount ? ` ${skippedCount} file${skippedCount === 1 ? "" : "s"} failed validation and were not loaded.` : "";
    if (state.features.length) {
      setStatus(`Loaded ${loadedAssetCount} mapped assets from ${loadedFileCount} XML file${loadedFileCount === 1 ? "" : "s"}.${skippedText}`, Boolean(skippedCount));
    } else if (loadedReportAssetCount) {
      setStatus(`Loaded ${loadedReportAssetCount} report assets from ${loadedFileCount} XML file${loadedFileCount === 1 ? "" : "s"}, but no mapped asset geometry was found.${skippedText}`, Boolean(skippedCount));
    } else {
      setStatus("The XML loaded, but no mapped asset geometry was found.", true);
    }
    centerViewerInViewport();
  }

  function applyParsedFilesToState(parsedFiles, options = {}) {
    const replace = Boolean(options.replace);
    if (replace) {
      clearLoadedFiles(false);
    }
    state.validationErrorResults = options.validationErrorResults || [];
    if (options.repairPreview) state.repairPreview = options.repairPreview;

    const startingFileCount = state.loadedFiles.length;
    parsedFiles.forEach((item, fileIndex) => {
      const fileId = `file-${startingFileCount + fileIndex + 1}`;
      const sourceIndex = startingFileCount + fileIndex + 1;
      const fileFeatures = item.features.map((feature, featureIndex) => ({
        ...feature,
        uid: `${fileId}:${featureIndex}:${feature.id}`,
        sourceFileId: fileId,
        sourceFile: item.fileName,
        sourceIndex,
      }));

      state.loadedFiles.push({
        id: fileId,
        name: item.fileName,
        assetCount: fileFeatures.length,
      });
      state.fileMetas.push({
        ...item.fileMeta,
        fileName: item.fileName,
        fileId,
      });
      state.reportBundles.push({
        ...item.reportBundle,
        fileName: item.fileName,
        fileId,
      });
      state.schemaValidationResults.push({
        ...item.schemaValidation,
        fileName: item.fileName,
        fileId,
      });
      state.features.push(...fileFeatures);
    });

    state.fileMeta = getCombinedFileMeta();
    state.fileName = getLoadedFileLabel();
    state.assetKinds = getAssetKindsForFeatures(state.features);
    state.selectedId = state.features[0] ? state.features[0].uid : null;
    state.coordinateZone = inferCoordinateZoneFromDoc(parsedFiles[0].doc) || inferCoordinateZoneFromFeatures(state.features) || 56;
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    state.mapMode = "grid";
    clearMeasurement(false);
    resetLocationCheck();
    resetOverlayQueries();
    clearAssetFilters(false);
    buildLayers();
    renderFilterOptions();
    updateFilteredFeatures();
    runReceiverLocationCheck();
  }

  async function previewSuggestedXmlRepairs() {
    const repairPlan = getSuggestedXmlRepairPlan(state.validationErrorResults);
    if (!repairPlan || !repairPlan.patches.length) {
      setStatus("No high-confidence XML repairs are available for this upload.", true);
      renderValidationPanel();
      return;
    }

    setStatus(`Building repaired preview for ${repairPlan.fileName || "uploaded XML"}...`, false);
    const repairedXmlText = applyXmlRepairPatches(repairPlan.xmlText, repairPlan.patches);
    const repairedFileName = buildRepairedXmlFileName(repairPlan.fileName);
    const parser = new DOMParser();
    const doc = parser.parseFromString(repairedXmlText, "application/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      const details = getParseErrorDetails(parseError, repairedXmlText);
      state.repairPreview = {
        status: "failed",
        message: `The suggested patch did not produce well-formed XML: ${details.message || "XML parse error."}`,
        patches: repairPlan.patches,
        repairedXmlText,
        repairedFileName,
      };
      setStatus(state.repairPreview.message, true);
      renderAll();
      return;
    }

    const schemaValidation = await validateAdacSchema(repairedXmlText, repairedFileName, doc);
    const features = extractFeatures(doc);
    const reportBundle = extractReportBundle(doc, repairedFileName);
    if (!features.length && !reportBundle.assets.length) {
      state.repairPreview = {
        status: "failed",
        message: "The suggested patch produced XML, but no ADAC assets were found to preview.",
        patches: repairPlan.patches,
        repairedXmlText,
        repairedFileName,
      };
      setStatus(state.repairPreview.message, true);
      renderAll();
      return;
    }

    const remainingErrorCount = normalizeValidationErrors(schemaValidation.errors).length;
    const repairPreview = {
      active: true,
      status: "active",
      originalFileName: repairPlan.fileName,
      repairedFileName,
      repairedXmlText,
      patches: repairPlan.patches,
      validationPassed: Boolean(schemaValidation.valid),
      remainingErrorCount: schemaValidation.valid ? 0 : remainingErrorCount,
      remainingErrors: schemaValidation.valid ? [] : normalizeValidationErrors(schemaValidation.errors).slice(0, 12),
      dismissed: Boolean(schemaValidation.valid),
    };

    applyParsedFilesToState([{
      fileName: repairedFileName,
      doc,
      features,
      fileMeta: extractFileMeta(doc),
      reportBundle,
      schemaValidation: {
        ...schemaValidation,
        fileName: repairedFileName,
        repairedPreview: true,
      },
    }], {
      replace: true,
      validationErrorResults: [],
      repairPreview,
    });

    const warning = repairPreview.validationPassed
      ? "The repaired XML now passes ADAC schema validation and is open in the viewer."
      : `Step 1 is previewed. Step 2 still has ${repairPreview.remainingErrorCount} schema issue${repairPreview.remainingErrorCount === 1 ? "" : "s"} to fix.`;
    setStatus(`Previewing viewer-repaired XML. Original file still failed validation. ${warning}`, true);
    centerViewerInViewport();
  }

  function getSuggestedXmlRepairPlan(results = []) {
    for (const result of results) {
      const patches = getSuggestedXmlRepairPatches(result);
      if (patches.length) {
        return {
          fileName: result.fileName || "uploaded.xml",
          xmlText: result.xmlText || "",
          schemaLabel: result.schemaLabel || "ADAC schema",
          patches,
        };
      }
    }
    return null;
  }

  function getSuggestedXmlRepairPatches(result) {
    if (!result?.xmlText) return [];
    const patches = [];
    normalizeValidationErrors(result.errors).forEach((error) => {
      if (error?.repair?.confidence === "high") {
        patches.push(error.repair);
        return;
      }
      const schemaPatch = getSchemaRenameRepairPatch(error);
      if (schemaPatch) patches.push(schemaPatch);
    });
    const seen = new Set();
    return patches.filter((patch) => {
      const key = patch.key || `${patch.type}:${patch.lineNumber || ""}:${patch.from || ""}:${patch.to || ""}:${patch.text || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      patch.key = key;
      return true;
    });
  }

  function getSchemaRenameRepairPatch(error) {
    const message = cleanValidationErrorMessage(error?.message || error?.rawMessage || "");
    const unexpectedMatch = message.match(/^Element '([^']+)': This element is not expected\.(?: Expected is(?: one of)? \( ([^)]+) \)\.)?/i);
    if (!unexpectedMatch || !unexpectedMatch[2]) return null;
    const from = formatXmlToken(unexpectedMatch[1]);
    const expectedElements = parseExpectedXmlElements(unexpectedMatch[2]);
    if (expectedElements.length !== 1) return null;
    const to = expectedElements[0];
    if (!isHighConfidenceElementRename(from, to)) return null;
    const lineText = error?.xmlContext?.lineText || "";
    if (lineText && !new RegExp(`<${escapeRegExp(from)}(?:\\s|>)`, "i").test(lineText)) return null;
    return {
      type: "rename-element",
      confidence: "high",
      from,
      to,
      lineNumber: error?.loc?.lineNumber || error?.xmlContext?.lineNumber || null,
      label: `Rename <${from}> to <${to}> because the schema expects that exact element here.`,
    };
  }

  function parseExpectedXmlElements(text) {
    return String(text || "")
      .split(",")
      .map((item) => formatXmlToken(item.replace(/[{}]/g, "").trim()))
      .filter(Boolean);
  }

  function isHighConfidenceElementRename(from, to) {
    if (!from || !to || from === to) return false;
    const lowerFrom = from.toLowerCase();
    const lowerTo = to.toLowerCase();
    if (lowerFrom.replace(/_m$/, "_mm") === lowerTo) return true;
    if (lowerFrom.replace(/m$/, "mm") === lowerTo && /depth|diameter|height|width|length|size|chainage/.test(lowerFrom)) return true;
    return false;
  }

  function applyXmlRepairPatches(xmlText, patches = []) {
    let repairedXmlText = String(xmlText || "");
    const lineInsertions = patches
      .filter((patch) => patch.type === "insert-before-line" && patch.lineNumber && patch.text)
      .sort((a, b) => Number(b.lineNumber) - Number(a.lineNumber));
    lineInsertions.forEach((patch) => {
      const lines = repairedXmlText.split(/\r?\n/);
      const index = Math.max(0, Math.min(lines.length, Number(patch.lineNumber) - 1));
      lines.splice(index, 0, patch.text);
      repairedXmlText = lines.join("\n");
    });
    patches
      .filter((patch) => patch.type === "rename-element" && patch.from && patch.to)
      .forEach((patch) => {
        const from = escapeRegExp(patch.from);
        repairedXmlText = repairedXmlText
          .replace(new RegExp(`<${from}(\\s|>)`, "g"), `<${patch.to}$1`)
          .replace(new RegExp(`</${from}>`, "g"), `</${patch.to}>`);
      });
    return repairedXmlText;
  }

  function buildRepairedXmlFileName(fileName = "uploaded.xml") {
    const cleanName = String(fileName || "uploaded.xml").replace(/\.xml$/i, "");
    return `${cleanName}_viewer-repaired.xml`;
  }

  function downloadSuggestedRepairedXml() {
    const preview = state.repairPreview;
    if (!preview?.repairedXmlText) {
      setStatus("No repaired XML is available to download yet.", true);
      return;
    }
    const blob = new Blob([preview.repairedXmlText], { type: "application/xml;charset=utf-8" });
    downloadBlob(blob, preview.repairedFileName || buildRepairedXmlFileName(preview.originalFileName));
    setStatus("Downloaded the viewer-repaired XML copy. The original upload was not changed.", false);
  }

  async function previewSelectedValidationFixes() {
    const selections = getSelectedValidationFixes();
    if (!selections.length) {
      setStatus("Choose or enter at least one validation fix before previewing.", true);
      return;
    }
    if (selections[0].resultKey === "preview") {
      const preview = state.repairPreview;
      if (!preview?.repairedXmlText) {
        setStatus("The repaired XML preview is not available for the selected fixes.", true);
        return;
      }
      const selectedForPreview = selections.filter((selection) => selection.resultKey === "preview");
      const repairedXmlText = applySelectedValidationFixes(
        preview.repairedXmlText,
        { errors: preview.remainingErrors || [] },
        selectedForPreview
      );
      await previewPatchedXmlText({
        originalFileName: preview.originalFileName || "uploaded.xml",
        repairedXmlText,
        patches: [
          ...(preview.patches || []),
          ...selectedForPreview.map((selection) => ({
            label: `Set <${selection.element}> to '${selection.value}'.`,
          })),
        ],
        statusPrefix: "Previewing viewer-repaired XML. Original file still failed validation.",
      });
      return;
    }
    const result = state.validationErrorResults[selections[0].resultIndex];
    if (!result?.xmlText) {
      setStatus("The original XML text is not available for this validation result.", true);
      return;
    }
    const selectedForResult = selections.filter((selection) => selection.resultKey === selections[0].resultKey);
    const repairedXmlText = applySelectedValidationFixes(result.xmlText, result, selectedForResult);
    await previewPatchedXmlText({
      originalFileName: result.fileName || "uploaded.xml",
      repairedXmlText,
      patches: selectedForResult.map((selection) => ({
        label: `Set <${selection.element}> to '${selection.value}'.`,
      })),
      statusPrefix: "Previewing viewer-repaired XML. Original file still failed validation.",
    });
  }

  function getSelectedValidationFixes() {
    const containers = [els.schemaValidationPanel, els.repairPreviewBanner].filter(Boolean);
    return containers.flatMap((container) => Array.from(container.querySelectorAll("[data-repair-index]")))
      .map((control) => ({
        resultKey: String(control.dataset.repairResult || "0"),
        resultIndex: Number(control.dataset.repairResult || 0),
        errorIndex: Number(control.dataset.repairIndex || 0),
        element: control.dataset.repairElement || "",
        value: String(control.value || "").trim(),
      }))
      .filter((selection) => selection.element && selection.value);
  }

  function applySelectedValidationFixes(xmlText, result, selections = []) {
    let repairedXmlText = String(xmlText || "");
    selections.forEach((selection) => {
      const error = normalizeValidationErrors(result.errors)[selection.errorIndex];
      repairedXmlText = replaceXmlElementValueForError(repairedXmlText, error, selection.element, selection.value);
    });
    return repairedXmlText;
  }

  function replaceXmlElementValueForError(xmlText, error, element, value) {
    const escapedElement = escapeRegExp(element);
    const replaceValue = (match, openTag, currentValue, closeTag) => `${openTag}${escapeXmlText(value)}${closeTag}`;
    const lineNumber = error?.loc?.lineNumber || error?.xmlContext?.lineNumber || null;
    if (lineNumber) {
      const lines = String(xmlText || "").split(/\r?\n/);
      const index = Number(lineNumber) - 1;
      if (lines[index]) {
        const linePattern = new RegExp(`(<${escapedElement}(?:\\s[^>]*)?>)([^<]*)(<\\/${escapedElement}>)`, "i");
        if (linePattern.test(lines[index])) {
          lines[index] = lines[index].replace(linePattern, replaceValue);
          return lines.join("\n");
        }
      }
    }
    return String(xmlText || "").replace(new RegExp(`(<${escapedElement}(?:\\s[^>]*)?>)([^<]*)(<\\/${escapedElement}>)`, "i"), replaceValue);
  }

  function escapeXmlText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function previewPatchedXmlText({ originalFileName, repairedXmlText, patches = [], statusPrefix = "Previewing viewer-repaired XML." }) {
    const repairedFileName = buildRepairedXmlFileName(originalFileName);
    const parser = new DOMParser();
    const doc = parser.parseFromString(repairedXmlText, "application/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      const details = getParseErrorDetails(parseError, repairedXmlText);
      setStatus(`The selected fixes did not produce well-formed XML: ${details.message || "XML parse error."}`, true);
      return;
    }

    const schemaValidation = await validateAdacSchema(repairedXmlText, repairedFileName, doc);
    const features = extractFeatures(doc);
    const reportBundle = extractReportBundle(doc, repairedFileName);
    if (!features.length && !reportBundle.assets.length) {
      setStatus("The selected fixes produced XML, but no ADAC assets were found to preview.", true);
      return;
    }

    const remainingErrorCount = normalizeValidationErrors(schemaValidation.errors).length;
    const repairPreview = {
      active: true,
      status: "active",
      originalFileName,
      repairedFileName,
      repairedXmlText,
      patches,
      validationPassed: Boolean(schemaValidation.valid),
      remainingErrorCount: schemaValidation.valid ? 0 : remainingErrorCount,
      remainingErrors: schemaValidation.valid ? [] : normalizeValidationErrors(schemaValidation.errors).slice(0, 12),
      dismissed: Boolean(schemaValidation.valid),
    };

    applyParsedFilesToState([{
      fileName: repairedFileName,
      doc,
      features,
      fileMeta: extractFileMeta(doc),
      reportBundle,
      schemaValidation: {
        ...schemaValidation,
        fileName: repairedFileName,
        repairedPreview: true,
      },
    }], {
      replace: true,
      validationErrorResults: [],
      repairPreview,
    });

    const warning = repairPreview.validationPassed
      ? "The repaired XML now passes ADAC schema validation and is open in the viewer."
      : `The repaired preview still has ${repairPreview.remainingErrorCount} schema issue${repairPreview.remainingErrorCount === 1 ? "" : "s"} to fix.`;
    setStatus(`${statusPrefix} ${warning}`, true);
    centerViewerInViewport();
  }

  async function validateAdacSchema(xmlText, fileName, doc) {
    const schemaConfig = getAdacSchemaConfig(doc);
    if (!schemaConfig) {
      return {
        fileName,
        valid: false,
        status: "unsupported",
        schemaLabel: "Unsupported ADAC schema",
        errors: [],
        message: getUnsupportedSchemaMessage(doc),
      };
    }

    try {
      const [xmllint, schemaBundle] = await Promise.all([
        loadXmlValidator(),
        loadAdacSchemaBundle(schemaConfig),
      ]);
      const validation = await xmllint.validateXML({
        xml: {
          fileName: sanitizeValidationFileName(fileName || "uploaded.xml", "xml"),
          contents: xmlText,
        },
        schema: [schemaBundle.root],
        preload: schemaBundle.preload,
        initialMemoryPages: 32 * xmllint.memoryPages.MiB,
        maxMemoryPages: 256 * xmllint.memoryPages.MiB,
      });
      return {
        fileName,
        valid: Boolean(validation.valid),
        status: validation.valid ? "valid" : "invalid",
        schemaKey: schemaConfig.key,
        schemaVersion: schemaConfig.version,
        schemaLabel: schemaConfig.label,
	        errors: (validation.errors || []).map((error) => ({
	          ...error,
	          schemaKey: schemaConfig.key,
	          xmlContext: getValidationXmlContext(xmlText, error),
	        })),
	        rawOutput: validation.rawOutput || "",
	      };
    } catch (error) {
      return {
        fileName,
        valid: false,
        status: "validator-error",
        schemaKey: schemaConfig.key,
        schemaVersion: schemaConfig.version,
        schemaLabel: schemaConfig.label,
        errors: [{ message: error.message || String(error), loc: null }],
        message: `The ${schemaConfig.label} validator could not complete.`,
      };
    }
  }

  function loadXmlValidator() {
    if (!xmlValidatorPromise) {
      const validatorUrl = new URL("vendor/xmllint-wasm/index-browser.mjs", viewerScriptUrl).href;
      xmlValidatorPromise = import(validatorUrl);
    }
    return xmlValidatorPromise;
  }

  async function loadAdacSchemaBundle(schemaConfig) {
    if (schemaBundleCache.has(schemaConfig.key)) return schemaBundleCache.get(schemaConfig.key);
    const bundlePromise = Promise.all(schemaConfig.files.map(async (fileName) => ({
      fileName,
      contents: prepareAdacSchemaForValidation(schemaConfig, fileName, await fetchTextFile(`${schemaConfig.basePath}${fileName}`)),
    }))).then((files) => {
      const rootSchema = files.find((file) => file.fileName === schemaConfig.rootFile);
      if (!rootSchema) throw new Error(`Missing root schema ${schemaConfig.rootFile}.`);
      schemaValueLookupCache.set(schemaConfig.key, buildSchemaValueLookup(files));
      return {
        root: rootSchema,
        preload: files.filter((file) => file.fileName !== schemaConfig.rootFile),
      };
    });
    schemaBundleCache.set(schemaConfig.key, bundlePromise);
    return bundlePromise;
  }

  function prepareAdacSchemaForValidation(schemaConfig, fileName, contents) {
    if (fileName === schemaConfig.rootFile || fileName === "ADACGlobalTypes.xsd") return contents;
    return contents.replace(
      /<xs:include\s+schemaLocation\s*=\s*["']\.?\/?(ADACGeometry|ADACGlobalTypes|ADACEnumeratedTypes|ADACStringTypes)\.xsd["']\s*(?:\/>|>[\s\S]*?<\/xs:include>)/gi,
      ""
    );
  }

  function buildSchemaValueLookup(files) {
    const parser = new DOMParser();
    const typeValues = new Map();
    const elementTypes = new Map();
    const contextElementTypes = new Map();
    const complexTypeAssetNames = new Map();

    files.forEach((file) => {
      const doc = parser.parseFromString(file.contents, "application/xml");
      Array.from(doc.getElementsByTagNameNS("*", "element")).forEach((element) => {
        const elementName = element.getAttribute("name");
        const typeName = element.getAttribute("type");
        if (!elementName || !typeName) return;
        addSchemaContextType(complexTypeAssetNames, typeName, elementName);
      });

      Array.from(doc.getElementsByTagNameNS("*", "simpleType")).forEach((simpleType) => {
        const typeName = simpleType.getAttribute("name");
        if (!typeName) return;
        const values = Array.from(simpleType.getElementsByTagNameNS("*", "enumeration"))
          .map((item) => item.getAttribute("value"))
          .filter(Boolean);
        if (values.length) typeValues.set(normalizeSchemaTypeKey(typeName), values);
      });

      Array.from(doc.getElementsByTagNameNS("*", "element")).forEach((element) => {
        const elementName = element.getAttribute("name");
        const typeName = element.getAttribute("type");
        if (!elementName || !typeName) return;
        const key = normalizeDetailKey(elementName);
        if (!elementTypes.has(key)) elementTypes.set(key, new Set());
        elementTypes.get(key).add(formatXmlToken(typeName));
      });

      Array.from(doc.getElementsByTagNameNS("*", "complexType")).forEach((complexType) => {
        const complexTypeName = complexType.getAttribute("name");
        if (!complexTypeName) return;
        const contextNames = uniqueValues([
          complexTypeName,
          ...(complexTypeAssetNames.get(normalizeSchemaTypeKey(complexTypeName)) || []),
        ]);
        if (!contextNames.length) return;
        Array.from(complexType.getElementsByTagNameNS("*", "element")).forEach((element) => {
          const elementName = element.getAttribute("name");
          const typeName = element.getAttribute("type");
          if (!elementName || !typeName) return;
          contextNames.forEach((contextName) => {
            addSchemaContextType(contextElementTypes, `${contextName}/${elementName}`, typeName);
            getSchemaDomainNamesForComplexType(complexTypeName).forEach((domainName) => {
              addSchemaContextType(contextElementTypes, `${domainName}/${contextName}/${elementName}`, typeName);
            });
          });
        });
      });
    });

    return {
      typeValues,
      elementTypes,
      contextElementTypes,
    };
  }

  function addSchemaContextType(map, key, typeName) {
    const normalizedKey = normalizeSchemaPathKey(key);
    if (!normalizedKey || !typeName) return;
    if (!map.has(normalizedKey)) map.set(normalizedKey, new Set());
    map.get(normalizedKey).add(formatXmlToken(typeName));
  }

  function getSchemaDomainNamesForComplexType(complexTypeName) {
    const normalizedType = normalizeSchemaTypeKey(complexTypeName);
    const domainMatchers = [
      [/cadastre/, "Cadastre"],
      [/communication/, "Communication"],
      [/electrical/, "Electrical"],
      [/enhancements?/, "Enhancements"],
      [/openspace/, "OpenSpace"],
      [/sewerage/, "Sewerage"],
      [/stormwater/, "StormWater"],
      [/supplementary/, "Supplementary"],
      [/surface/, "Surface"],
      [/transport/, "Transport"],
      [/(^|feature|objectmodel)water(supply)?/, "WaterSupply"],
    ];
    return uniqueValues(domainMatchers
      .filter(([pattern]) => pattern.test(normalizedType))
      .map(([, name]) => name));
  }

  async function fetchTextFile(path) {
    const response = await fetch(path, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Could not load ${path}.`);
    return response.text();
  }

  function getAdacSchemaConfig(doc) {
    return adacSchemaConfigs[inferReportSchemaVersion(doc)] || null;
  }

  function getUnsupportedSchemaMessage(doc) {
    const rootElement = doc.documentElement;
    const versionText = String(rootElement.getAttribute("version") || rootElement.getAttribute("Version") || "").trim();
    return versionText
      ? `ADAC schema version ${versionText} is not supported by this viewer yet. Supported versions are 5.0.1 and 6.0.0.`
      : "No supported ADAC schema version was found. Supported versions are 5.0.1 and 6.0.0.";
  }

  function sanitizeValidationFileName(fileName, extension) {
    const clean = String(fileName || `uploaded.${extension}`)
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      .replace(/[^a-z0-9._-]+/gi, "_")
      .replace(/^-+/, "");
    return clean || `uploaded.${extension}`;
  }

  function getValidationXmlContext(xmlText, error) {
    const lineNumber = Number(error?.loc?.lineNumber || error?.lineNumber || 0);
    if (!lineNumber || !xmlText) return null;
    const lines = String(xmlText).split(/\r?\n/);
    const lineIndex = Math.max(0, Math.min(lines.length - 1, lineNumber - 1));
    const textToLine = lines.slice(0, lineIndex + 1).join("\n");
    const stack = [];
    let lastStartPath = [];
    const tokenPattern = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<\/?[^>]+>/g;
    let match;
    while ((match = tokenPattern.exec(textToLine))) {
      const token = match[0];
      if (/^<!--|^<!\[CDATA|^<\?|^<!/.test(token)) continue;
      const closeMatch = token.match(/^<\s*\/\s*([^\s>]+)/);
      if (closeMatch) {
        const name = cleanName(formatXmlToken(closeMatch[1]));
        const index = findLastStackIndex(stack, name);
        if (index >= 0) stack.splice(index);
        continue;
      }
      const openMatch = token.match(/^<\s*([^\s/>]+)/);
      if (!openMatch) continue;
      const name = cleanName(formatXmlToken(openMatch[1]));
      if (!name) continue;
      lastStartPath = [...stack, name];
      if (!/\/\s*>$/.test(token)) stack.push(name);
    }

    const path = lastStartPath.length ? lastStartPath : stack;
    if (!path.length) return null;
	    return {
	      lineNumber,
	      lineText: String(lines[lineIndex] || "").trim(),
	      nearbyLines: lines.slice(Math.max(0, lineIndex - 12), Math.min(lines.length, lineIndex + 13)),
	      path,
	    };
	  }

  function findLastStackIndex(stack, name) {
    const normalizedName = normalizeDetailKey(name);
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      if (normalizeDetailKey(stack[index]) === normalizedName) return index;
    }
    return -1;
  }

  function getValidationFailureStatusMessage(results) {
    const first = results[0] || {};
    const count = results.length;
    if (first.status === "parse-error") return `The XML could not be parsed: ${first.errors?.[0]?.message || "Invalid XML."}`;
    if (count === 1) return `${first.fileName || "The XML"} failed ADAC schema validation and was not loaded.`;
    return `${count} XML files failed ADAC schema validation and were not loaded.`;
  }

  function clearLoadedFiles(shouldRender = true) {
    state.features = [];
    state.filteredFeatures = [];
    state.layers = new Map();
    state.selectedId = null;
    state.selectedOverlayFeature = null;
    state.fileMeta = { receiver: "", receiverField: "" };
    state.fileMetas = [];
    state.loadedFiles = [];
    state.reportBundles = [];
    state.schemaValidationResults = [];
    state.validationErrorResults = [];
    state.repairPreview = null;
    state.assetKinds = new Set();
    state.fileName = "";
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    setMeasurementMode("off");
    resetLocationCheck();
    resetOverlayQueries();
    clearAssetFilters(false);
    if (els.fileInput) els.fileInput.value = "";
    setStatus("Cleared loaded XML files.", false);
    if (shouldRender) {
      renderFilterOptions();
      renderAll();
    }
  }

  function getCombinedFileMeta() {
    const receivers = getActiveReceivers();
    if (!receivers.length) return { receiver: "", receiverField: "" };
    if (receivers.length === 1) {
      const match = state.fileMetas.find((meta) => normalizeAuthorityName(meta.receiver) === normalizeAuthorityName(receivers[0]));
      return {
        receiver: receivers[0],
        receiverField: match ? match.receiverField : "Receiver",
      };
    }
    return {
      receiver: formatList(receivers),
      receiverField: "Multiple",
    };
  }

  function getLoadedFileLabel() {
    if (!state.loadedFiles.length) return "";
    if (state.loadedFiles.length === 1) return state.loadedFiles[0].name;
    return `${state.loadedFiles.length} XML files`;
  }

  function extractFeatures(doc) {
    const elements = Array.from(doc.querySelectorAll("*"));
    const candidates = [];
    const seen = new Set();

    elements.forEach((node, index) => {
      if (isCoordinateNode(node)) return;

      const points = extractPoints(node);
      if (!points.length) return;

      const rawId = getFirstValue(node, ["ADACId", "AssetID", "AssetId", "assetid", "ID", "Id", "id", "FeatureID", "ObjectID"]);
      const descendantCount = node.querySelectorAll("*").length;
      const tagName = cleanName(node.tagName).toLowerCase();
      if (!rawId && (descendantCount > points.length || /^(adac|assets|assetlist|features|project|metadata)$/i.test(tagName))) return;

      const id = rawId || `${cleanName(node.tagName)}-${index + 1}`;
      const type = getFirstValue(node, ["Type", "AssetType", "Class", "Subtype", "FeatureType", "Name"]) || cleanName(node.tagName);
      const layer = inferLayerFromStructure(node);
      const assetPath = getAssetPathFromStructure(node);
      const attributes = collectAttributes(node);
      const fullAttributes = collectAttributes(node, { includeAll: true });
      const labelValues = collectLabelValues(node);
      const status = getAssetStatus(node) || "Unknown";
      const planStyleKey = getPlanStyleKeyForAssetPath(assetPath);
      const geometryKey = points.map((point) => `${round(point.x)},${round(point.y)}`).join("|");
      const key = `${id}|${geometryKey}`;

      if (seen.has(key)) return;
      seen.add(key);

      const feature = {
        id: String(id).trim(),
        type: String(type).trim(),
        assetTag: cleanName(node.tagName),
        assetPath,
        planStyleKey,
        layer,
        status,
        geometryKind: inferGeometryKind(node, points, { assetPath, type, planStyleKey }),
        points,
        attributes,
        fullAttributes,
        labelValues,
        depth: getDepth(node),
        descendantCount,
      };

      candidates.push(feature);
    });

    return preferSpecificCandidates(candidates);
  }

  function extractFileMeta(doc) {
    return {
      ...getFirstMetadataValue(doc, [
        "Receiver",
        "ADACReceiver",
        "ReceivingAuthority",
        "Recipient",
        "Authority",
        "AssetOwner",
        "WaterUtility",
        "ServiceProvider",
        "Council",
        "LocalGovernment",
      ]),
    };
  }

  function getFirstMetadataValue(doc, names) {
    const normalizedNames = names.map((name) => cleanName(name).toLowerCase());
    const nodes = Array.from(doc.querySelectorAll("*"))
      .filter((node) => normalizedNames.includes(cleanName(node.tagName).toLowerCase()))
      .filter((node) => !node.closest("Geometry") && !node.closest("Point") && !node.closest("Vertex"))
      .map((node) => ({
        node,
        value: String(node.textContent || "").replace(/\s+/g, " ").trim(),
        field: cleanName(node.tagName),
        depth: getDepth(node),
      }))
      .filter((item) => item.value && item.value.length < 120)
      .sort((a, b) => normalizedNames.indexOf(a.field.toLowerCase()) - normalizedNames.indexOf(b.field.toLowerCase()) || a.depth - b.depth);

    const match = nodes[0];
    return {
      receiver: match ? match.value : "",
      receiverField: match ? match.field : "",
    };
  }

  function getAssetStatus(node) {
    const statusNames = ["Status", "LifecycleStatus", "ConstructionStatus"];
    const directStatus = getFirstValue(node, statusNames);
    if (directStatus) return directStatus;

    const componentInfo = firstDirectChild(node, "ComponentInfo");
    return getFirstValue(componentInfo, statusNames);
  }

  function extractReportBundle(doc, fileName) {
    const rootElement = doc.documentElement;
    const projectElement = firstElementByName(rootElement, "Project") || rootElement;
    const projectData = firstDirectChild(projectElement, "ProjectData") || firstElementByName(projectElement, "ProjectData");
    const metadata = parseReportMetadata(projectElement, fileName);
    return {
      metadata,
      assets: projectData ? parseReportAssets(projectData, fileName) : [],
      schemaVersion: inferReportSchemaVersion(doc),
      fileName,
    };
  }

  function parseReportMetadata(projectElement, fileName) {
    const coordinateSystem = firstDirectChild(projectElement, "CoordinateSystem");
    const drawingExtents = parseReportDrawingExtents(firstDirectChild(projectElement, "DrawingExtents"));
    const software = parseReportNameValue(firstDirectChild(projectElement, "Software"), ["Product", "Version"]);
    const surveyor = parseReportNameValue(firstDirectChild(projectElement, "Surveyor"), ["Name", "DateApproved", "DateFinalSurvey"]);
    const engineer = parseReportNameValue(firstDirectChild(projectElement, "Engineer"), ["Name", "DateApproved"]);

    return {
      name: directChildText(projectElement, "Name") || stripFileExtension(fileName) || "ADAC XML Report",
      owner: directChildText(projectElement, "Owner"),
      receiver: directChildText(projectElement, "Receiver"),
      worksApprovalId: directChildText(projectElement, "WorksApprovalID"),
      drawingNumber: directChildText(projectElement, "DrawingNumber") || stripFileExtension(fileName),
      drawingRevision: directChildText(projectElement, "DrawingRevision"),
      constructionDate: directChildText(projectElement, "ConstructionDate"),
      description: directChildText(projectElement, "Description"),
      projectStatus: directChildText(projectElement, "ProjectStatus") || "As Constructed",
      exportDateTime: directChildText(projectElement, "ExportDateTime"),
      coordinateSystem: {
        horizontalCoordinateSystem: directChildText(coordinateSystem, "HorizontalCoordinateSystem"),
        horizontalDatum: directChildText(coordinateSystem, "HorizontalDatum"),
        verticalDatum: directChildText(coordinateSystem, "VerticalDatum"),
        isApproximate: directChildText(coordinateSystem, "IsApproximate"),
        originMark: directChildText(coordinateSystem, "OriginMark"),
        notes: directChildText(coordinateSystem, "Notes"),
      },
      drawingExtents,
      software: software.Product || software.Version ? software : null,
      surveyor: surveyor.Name ? surveyor : null,
      engineer: engineer.Name ? engineer : null,
    };
  }

  function parseReportNameValue(element, names) {
    return names.reduce((values, name) => {
      values[name] = directChildText(element, name);
      return values;
    }, {});
  }

  function parseReportDrawingExtents(element) {
    if (!element) return null;
    const southWest = parseReportPoint(firstDirectChild(element, "SouthWest"));
    const northEast = parseReportPoint(firstDirectChild(element, "NorthEast"));
    if (!southWest || !northEast) return null;
    return { southWest, northEast };
  }

  function parseReportPoint(element) {
    if (!element) return null;
    const x = directChildText(element, "X");
    const y = directChildText(element, "Y");
    if (!formatReportValue(x) || !formatReportValue(y)) return null;
    return { X: x, Y: y, Z: directChildText(element, "Z") };
  }

  function parseReportAssets(projectData, fileName) {
    const assets = [];
    walkReportAssetNodes(projectData, [], assets, fileName);
    return assets;
  }

  function walkReportAssetNodes(element, pathParts, assets, fileName) {
    const children = elementChildren(element);
    if (!children.length) return;

    const currentPath = [...pathParts, cleanName(element.tagName)];
    if (looksLikeReportAssetElement(element)) {
      const values = {};
      children.forEach((child) => {
        values[cleanName(child.tagName)] = reportElementToValue(child);
      });
      const geometry = values.Geometry && typeof values.Geometry === "object" ? values.Geometry : null;
      assets.push({
        assetPath: currentPath.slice(1).join("/"),
        values,
        geometry,
        source: fileName,
      });
      return;
    }

    children.forEach((child) => walkReportAssetNodes(child, currentPath, assets, fileName));
  }

  function looksLikeReportAssetElement(element) {
    const childNames = new Set(elementChildren(element).map((child) => cleanName(child.tagName)));
    return childNames.has("ADACId") || (childNames.has("Geometry") && childNames.size > 1);
  }

  function reportElementToValue(element) {
    if (isNilledReportElement(element)) return null;
    const children = elementChildren(element);
    if (!children.length) {
      const text = String(element.textContent || "").trim();
      return text || null;
    }

    const grouped = {};
    children.forEach((child) => {
      const key = cleanName(child.tagName);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(reportElementToValue(child));
    });

    return Object.entries(grouped).reduce((result, [key, values]) => {
      result[key] = values.length === 1 ? values[0] : values;
      return result;
    }, {});
  }

  function inferReportSchemaVersion(doc) {
    const rootElement = doc.documentElement;
    const versionText = String(rootElement.getAttribute("version") || rootElement.getAttribute("Version") || "").trim();
    if (versionText.startsWith("5")) return "v5";
    if (versionText.startsWith("6")) return "v6";
    const schemaHint = Array.from(rootElement.attributes || [])
      .filter((attr) => /schemaLocation$/i.test(attr.name))
      .map((attr) => attr.value)
      .join(" ")
      .toUpperCase();
    if (schemaHint.includes("V501") || schemaHint.includes("5.0.1")) return "v5";
    if (schemaHint.includes("V600") || schemaHint.includes("6.0.0")) return "v6";
    return "";
  }

  function firstElementByName(element, name) {
    if (!element) return null;
    if (cleanName(element.tagName).toLowerCase() === cleanName(name).toLowerCase()) return element;
    return Array.from(element.querySelectorAll("*")).find((node) => cleanName(node.tagName).toLowerCase() === cleanName(name).toLowerCase()) || null;
  }

  function firstDirectChild(element, name) {
    if (!element) return null;
    const normalized = cleanName(name).toLowerCase();
    return elementChildren(element).find((child) => cleanName(child.tagName).toLowerCase() === normalized) || null;
  }

  function directChildText(element, name) {
    const child = firstDirectChild(element, name);
    return child ? String(child.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function elementChildren(element) {
    return element ? Array.from(element.children || []) : [];
  }

  function isNilledReportElement(element) {
    return Array.from(element.attributes || []).some((attr) => /nil$/i.test(attr.name) && /^(true|1)$/i.test(String(attr.value || "")));
  }

  function preferSpecificCandidates(candidates) {
    const byGeometry = new Map();

    candidates.forEach((feature) => {
      const key = feature.points.map((point) => `${round(point.x)},${round(point.y)}`).join("|");
      const existing = byGeometry.get(key);
      if (!existing || scoreFeature(feature) > scoreFeature(existing)) {
        byGeometry.set(key, feature);
      }
    });

    return Array.from(byGeometry.values()).sort((a, b) => a.layer.localeCompare(b.layer) || a.id.localeCompare(b.id));
  }

  function scoreFeature(feature) {
    const hasReadableId = /[a-z]/i.test(feature.id) && !/^Feature-\d+$/.test(feature.id);
    return (hasReadableId ? 20 : 0) + feature.depth - Math.min(feature.descendantCount, 30) / 10;
  }

  function inferCoordinateZoneFromDoc(doc) {
    const metadataTags = [
      "CoordinateSystem",
      "HorizontalCoordinateSystem",
      "CoordinateReferenceSystem",
      "SpatialReference",
      "Projection",
      "MapProjection",
      "MapZone",
      "Zone",
      "Datum",
    ];
    const text = metadataTags
      .flatMap((tag) => Array.from(doc.getElementsByTagName(tag)))
      .map((node) => node.textContent || "")
      .join(" ");
    const epsgMatch = text.match(/epsg\D*283(4[9]|5[0-6])/i);
    if (epsgMatch) return Number(epsgMatch[1]);
    const zoneMatch = text.match(/(?:mga|zone)\D*(4[9]|5[0-6])/i);
    return zoneMatch ? Number(zoneMatch[1]) : null;
  }

  function inferCoordinateZoneFromFeatures(features) {
    const hasMga = features.some((feature) => feature.points.some(isMgaCoordinate));
    return hasMga ? 56 : null;
  }

  function extractPoints(node) {
    const coordinateNodes = Array.from(node.querySelectorAll("*"))
      .filter((coordNode) => isCoordinateNode(coordNode) && isGeometryCoordinateNode(coordNode));
    const points = [];

    coordinateNodes.forEach((coordNode) => {
      if (isCoordinateContainerWithChildren(coordNode)) return;
      const fromAttrs = readPointFromAttributes(coordNode, true);
      if (fromAttrs) {
        points.push(fromAttrs);
        return;
      }

      const fromChildren = readPointFromChildren(coordNode, true);
      if (fromChildren) {
        points.push(fromChildren);
        return;
      }

      const fromText = readPointFromText(coordNode.textContent || "", true);
      if (fromText) points.push(fromText);
    });

    return dedupePoints(points);
  }

  function isCoordinateContainerWithChildren(node) {
    const name = cleanName(node.tagName).toLowerCase();
    if (!/^(geometry|coordinates|spatial)$/i.test(name)) return false;
    return Array.from(node.children).some((child) => isCoordinateNode(child) || child.querySelector("*"));
  }

  function isCoordinateNode(node) {
    const name = cleanName(node.tagName).toLowerCase();
    const hasXYAttrs = findAttribute(node, ["x", "easting", "longitude", "lon", "lng"]) && findAttribute(node, ["y", "northing", "latitude", "lat"]);
    return hasXYAttrs || /^(point|vertex|coord|coordinate|coordinates|geometry|gmlpos|pos|poslist|location|spatial)$/i.test(name);
  }

  function isGeometryCoordinateNode(node) {
    let current = node;
    while (current && current.nodeType === 1) {
      if (cleanName(current.tagName).toLowerCase() === "geometry") return true;
      current = current.parentElement;
    }
    return false;
  }

  function readPointFromAttributes(node, includeZ = false) {
    const x = findAttribute(node, ["x", "easting", "longitude", "lon", "lng"]);
    const y = findAttribute(node, ["y", "northing", "latitude", "lat"]);
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
    const point = { x: Number(x), y: Number(y) };
    const z = includeZ ? findAttribute(node, ["z", "elevation", "elev", "height", "level", "altitude", "alt"]) : "";
    if (includeZ && isFiniteNumber(z)) point.z = Number(z);
    return point;
  }

  function readPointFromChildren(node, includeZ = false) {
    const x = getFirstValue(node, ["X", "Easting", "Longitude", "Lon", "Lng"]);
    const y = getFirstValue(node, ["Y", "Northing", "Latitude", "Lat"]);
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
    const point = { x: Number(x), y: Number(y) };
    const z = includeZ ? getFirstValue(node, ["Z", "Elevation", "Elev", "Height", "Level", "Altitude", "Alt"]) : "";
    if (includeZ && isFiniteNumber(z)) point.z = Number(z);
    return point;
  }

  function readPointFromText(text, includeZ = false) {
    const numbers = String(text).match(/-?\d+(?:\.\d+)?/g);
    if (!numbers || numbers.length < 2) return null;
    const x = Number(numbers[0]);
    const y = Number(numbers[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const point = { x, y };
    const z = Number(numbers[2]);
    if (includeZ && Number.isFinite(z)) point.z = z;
    return point;
  }

  function dedupePoints(points) {
    const seen = new Set();
    return points.filter((point, index) => {
      const key = `${round(point.x)},${round(point.y)}`;
      const closesRing = index === points.length - 1 && points.length > 3 && samePoint(point, points[0]);
      if (closesRing) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function samePoint(a, b) {
    return Boolean(a && b && round(a.x) === round(b.x) && round(a.y) === round(b.y));
  }

  function collectAttributes(node, options = {}) {
    const includeAll = Boolean(options.includeAll);
    const attrs = {};
    Array.from(node.attributes || []).forEach((attr) => {
      attrs[cleanName(attr.name)] = attr.value;
    });

    Array.from(node.children).forEach((child) => {
      if (isCoordinateNode(child)) return;
      const key = cleanName(child.tagName);
      const normalizedKey = normalizeDetailKey(key);
      if (!includeAll && normalizedKey === "cells" && firstDirectChild(node, "PipeStructure")) return;
      if (!includeAll && isInlinePipeStructureAttribute(node, normalizedKey)) {
        if (!attrs.PipeStructure) {
          const inlinePipeStructure = formatInlinePipeStructureValue(node);
          if (inlinePipeStructure) attrs.PipeStructure = inlinePipeStructure;
        }
        return;
      }
      let value = formatAttributeValue(child);
      if (normalizedKey === "pipestructure") {
        value = formatPipeStructureValue(child, node) || value;
      }
      if (normalizedKey === "componentinfo") {
        if (includeAll) {
          collectNestedAttributes(child, key, attrs, { includeEmpty: true, includeLong: true });
        } else {
          collectComponentInfoAttributes(child, attrs);
        }
        return;
      }
      if (value && (includeAll || value.length < 120)) {
        attrs[key] = value;
      } else if (!value && child.children.length) {
        collectNestedAttributes(child, key, attrs, { includeEmpty: includeAll, includeLong: includeAll });
      } else if (!value && includeAll) {
        attrs[key] = "";
      }
    });

    return attrs;
  }

  function collectLabelValues(node) {
    const values = {};
    Array.from(node.children || []).forEach((child) => {
      if (isCoordinateNode(child)) return;
      const key = cleanName(child.tagName);
      const value = labelElementToValue(child);
      if (value == null || value === "") return;
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = Array.isArray(values[key]) ? [...values[key], value] : [values[key], value];
      } else {
        values[key] = value;
      }
    });
    return values;
  }

  function labelElementToValue(element) {
    if (!element || isNilledReportElement(element)) return "";
    const children = elementChildren(element).filter((child) => !isCoordinateNode(child));
    if (!children.length) return String(element.textContent || "").trim();

    const grouped = {};
    children.forEach((child) => {
      const key = cleanName(child.tagName);
      const value = labelElementToValue(child);
      if (value == null || value === "") return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(value);
    });

    const result = {};
    Object.entries(grouped).forEach(([key, items]) => {
      result[key] = items.length === 1 ? items[0] : items;
    });
    return Object.keys(result).length ? result : "";
  }

  function collectComponentInfoAttributes(element, attrs) {
    ["Owner", "Notes"].forEach((fieldName) => {
      const child = firstDirectChild(element, fieldName);
      const value = formatAttributeValue(child);
      if (value && value.length < 120) attrs[fieldName] = value;
    });
  }

  function collectNestedAttributes(element, prefix, attrs, options = {}) {
    if (!element || isCoordinateNode(element)) return;
    elementChildren(element).forEach((child) => {
      if (isCoordinateNode(child)) return;
      const key = `${prefix}_${cleanName(child.tagName)}`;
      const value = formatAttributeValue(child);
      if (value && (options.includeLong || value.length < 120)) {
        attrs[key] = value;
      } else if (!value && child.children.length) {
        collectNestedAttributes(child, key, attrs, options);
      } else if (!value && options.includeEmpty) {
        attrs[key] = "";
      }
    });
  }

  function formatAttributeValue(element) {
    if (!element || isNilledReportElement(element)) return "";
    const children = elementChildren(element);
    if (!children.length) return String(element.textContent || "").trim();

    const pipeStructureValue = formatPipeStructureValue(element);
    if (pipeStructureValue) return pipeStructureValue;

    const dimensionValue = formatDimensionContainer(element);
    if (dimensionValue) return dimensionValue;

    if (children.length > 1) return "";
    return formatAttributeValue(children[0]);
  }

  function formatPipeStructureValue(element, assetElement = null) {
    if (normalizeDetailKey(cleanName(element.tagName)) !== "pipestructure") return "";
    const pipeElement = elementChildren(element).find((child) => /pipe$/i.test(cleanName(child.tagName))) || element;
    const size = formatDimensionContainer(pipeElement);
    const material = directChildText(pipeElement, "Material");
    const classValue = directChildText(pipeElement, "Class");
    const jointType = directChildText(pipeElement, "JointType");
    const parts = [];
    if (size) parts.push(formatPipeSizeWithCells(size, assetElement));
    if (material) parts.push(material);
    if (classValue) parts.push(formatPipeClassValue(classValue, assetElement));
    if (jointType) parts.push(jointType);
    return parts.join(" ");
  }

  function formatPipeSizeWithCells(size, assetElement) {
    const cellCount = directChildText(assetElement, "Cells");
    if (!cellCount) return size;
    if (String(size || "").trim().startsWith(`${cellCount}/`)) return size;
    return `${cellCount}/${size}`;
  }

  function isInlinePipeStructureAttribute(assetElement, normalizedKey) {
    if (!isInlinePipeStructureAsset(assetElement)) return false;
    return ["diametermm", "widthmm", "heightmm", "spanmm", "risemm", "material", "class", "jointtype"].includes(normalizedKey);
  }

  function isInlinePipeStructureAsset(element) {
    const tag = normalizeDetailKey(cleanName(element?.tagName || ""));
    const path = getAssetPathFromStructure(element).toLowerCase();
    if (path.startsWith("sewerage/pipes")) return tag === "pipenonpressure" || tag === "pipepressure" || tag === "pipe";
    if (path.startsWith("sewerage/connections/")) return tag === "connection";
    if (path.startsWith("watersupply/pipes/")) return tag === "pipe";
    if (path.startsWith("watersupply/waterservices/")) return tag === "waterservice";
    return false;
  }

  function formatInlinePipeStructureValue(assetElement) {
    const size = formatDirectDimensionContainer(assetElement);
    const material = directChildText(assetElement, "Material");
    const classValue = directChildText(assetElement, "Class");
    const jointType = directChildText(assetElement, "JointType");
    const parts = [];
    if (size) parts.push(size);
    if (material) parts.push(material);
    if (classValue) parts.push(formatPipeClassValue(classValue, assetElement));
    if (jointType) parts.push(jointType);
    return parts.join(" ");
  }

  function formatPipeClassValue(classValue, assetElement) {
    const value = String(classValue || "").trim();
    if (!value) return "";
    return /^\d+(?:\.\d+)?$/.test(value) ? `Class ${value}` : value;
  }

  function formatDimensionContainer(element) {
    const dimensions = collectDimensionValues(element);
    if (!dimensions.length) return "";
    if (dimensions.length === 1) return dimensions[0].value;
    return dimensions.slice(0, 2).map((item) => item.value).join(" x ");
  }

  function formatDirectDimensionContainer(element) {
    const dimensions = collectDirectDimensionValues(element);
    if (!dimensions.length) return "";
    if (dimensions.length === 1) return dimensions[0].value;
    return dimensions.slice(0, 2).map((item) => item.value).join(" x ");
  }

  function collectDimensionValues(element) {
    return collectDimensionValuesFromElements(Array.from(element.querySelectorAll("*")));
  }

  function collectDirectDimensionValues(element) {
    return collectDimensionValuesFromElements(elementChildren(element).filter((node) => !node.children.length));
  }

  function collectDimensionValuesFromElements(elements) {
    const dimensionNames = new Set([
      "diametermm",
      "widthmm",
      "lengthmm",
      "heightmm",
      "depthmm",
      "spanmm",
      "risemm",
      "diameter",
      "width",
      "length",
      "height",
      "depth",
      "span",
      "rise",
    ]);
    const dimensionOrder = new Map([
      ["lengthmm", 1],
      ["length", 1],
      ["widthmm", 2],
      ["width", 2],
      ["heightmm", 3],
      ["height", 3],
      ["depthmm", 3],
      ["depth", 3],
      ["spanmm", 1],
      ["span", 1],
      ["risemm", 2],
      ["rise", 2],
      ["diametermm", 1],
      ["diameter", 1],
    ]);
    const values = [];
    elements.forEach((node) => {
      if (node.children.length) return;
      const normalized = cleanName(node.tagName).replace(/[^a-z0-9]+/gi, "").toLowerCase();
      if (!dimensionNames.has(normalized)) return;
      const value = String(node.textContent || "").trim();
      if (!value) return;
      values.push({
        key: normalized,
        value,
        order: dimensionOrder.get(normalized) || 99,
      });
    });
    return values.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  }

  function buildLayers() {
    state.layers = new Map();
    state.features.forEach((feature) => {
      if (!state.layers.has(feature.layer)) {
        state.layers.set(feature.layer, {
          name: feature.layer,
          visible: true,
          labelVisible: true,
          expanded: false,
          labelExpanded: false,
          color: layerPalette[feature.layer] || layerPalette.Other,
          count: 0,
          labelCount: 0,
          types: new Map(),
        });
      }
      const layer = state.layers.get(feature.layer);
      layer.count += 1;
      if (!layer.types.has(feature.assetTag)) {
        layer.types.set(feature.assetTag, {
          name: feature.assetTag,
          visible: !isSpotHeightFeature(feature),
          labelVisible: !isContourFeature(feature),
          count: 0,
          labelCount: 0,
        });
      }
      const layerType = layer.types.get(feature.assetTag);
      layerType.count += 1;
      if (isFeatureLabelable(feature)) {
        layer.labelCount += 1;
        layerType.labelCount += 1;
      }
    });
  }

  function isSpotHeightFeature(feature) {
    const text = [
      feature.assetTag,
      feature.assetPath,
      feature.type,
      feature.id,
    ].join(" ").toLowerCase();
    return /spot\s*height|spotheight/.test(text);
  }

  function isContourFeature(feature) {
    const text = [
      feature?.assetTag,
      feature?.assetPath,
      feature?.type,
      feature?.id,
      feature?.planStyleKey,
    ].join(" ").toLowerCase();
    return /surface\/contours\//.test(text) || /(^|[^a-z])contour([^a-z]|$)/i.test(text);
  }

  function updateFilteredFeatures() {
    const query = els.search.value.trim().toLowerCase();
    state.filteredFeatures = state.features.filter((feature) => {
      const layer = state.layers.get(feature.layer);
      if (layer && !layer.visible) return false;
      const layerType = layer ? layer.types.get(feature.assetTag) : null;
      if (layerType && !layerType.visible) return false;
      if (state.filters.layer !== "all" && feature.layer !== state.filters.layer) return false;
      if (state.filters.type !== "all" && feature.type !== state.filters.type) return false;
      if (state.filters.geometry !== "all" && feature.geometryKind !== state.filters.geometry) return false;
      if (!query) return true;
      return `${feature.id} ${feature.type} ${feature.layer} ${feature.status} ${feature.sourceFile || ""}`.toLowerCase().includes(query);
    }).sort(compareFeatures);
    renderAll();
  }

  function clearAssetFilters(shouldUpdate = true) {
    state.filters = {
      layer: "all",
      type: "all",
      geometry: "all",
      sort: "layer",
    };
    if (els.search) els.search.value = "";
    if (els.layerFilter) els.layerFilter.value = "all";
    if (els.typeFilter) els.typeFilter.value = "all";
    if (els.geometryFilter) els.geometryFilter.value = "all";
    if (els.sortSelect) els.sortSelect.value = "layer";
    if (shouldUpdate) updateFilteredFeatures();
  }

  function renderFilterOptions() {
    if (els.layerFilter) {
      setSelectOptions(
        els.layerFilter,
        "All layers",
        Array.from(state.layers.values()).map((layer) => ({ value: layer.name, label: `${layer.name} (${layer.count})` }))
      );
      els.layerFilter.value = state.filters.layer;
    }
    if (els.typeFilter) {
      setSelectOptions(
        els.typeFilter,
        "All types",
        getOptionCounts(state.features, "type").map(({ value, count }) => ({ value, label: `${value} (${count})` }))
      );
      els.typeFilter.value = state.filters.type;
    }
    if (els.geometryFilter) els.geometryFilter.value = state.filters.geometry;
    if (els.sortSelect) els.sortSelect.value = state.filters.sort;
  }

  function setSelectOptions(select, defaultLabel, options) {
    if (!select) return;
    const currentValue = select.value || "all";
    select.innerHTML = `<option value="all">${escapeHtml(defaultLabel)}</option>`;
    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      select.appendChild(item);
    });
    select.value = options.some((option) => option.value === currentValue) ? currentValue : "all";
  }

  function getOptionCounts(features, key) {
    const counts = new Map();
    features.forEach((feature) => {
      const value = feature[key] || "Unknown";
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  }

  function compareFeatures(a, b) {
    const idCompare = naturalCompare(a.id, b.id);
    if (state.filters.sort === "id") return idCompare;
    if (state.filters.sort === "id-desc") return naturalCompare(b.id, a.id);
    if (state.filters.sort === "type") return naturalCompare(a.type, b.type) || idCompare;
    if (state.filters.sort === "points") return b.points.length - a.points.length || idCompare;
    return naturalCompare(a.layer, b.layer) || idCompare || naturalCompare(a.sourceFile || "", b.sourceFile || "");
  }

  function toggleLayer(layerName) {
    const layer = state.layers.get(layerName);
    if (!layer) return;
    layer.visible = !layer.visible;
    updateFilteredFeatures();
  }

  function toggleLayerExpanded(layerName) {
    const layer = state.layers.get(layerName);
    if (!layer) return;
    layer.expanded = !layer.expanded;
    renderLayers();
  }

  function handleLayerDetailsToggle(event) {
    const details = event.target.closest("[data-layer-section]");
    if (!details || details.parentElement !== els.layerList) return;
    const layer = state.layers.get(details.dataset.layerSection);
    if (layer) layer.expanded = details.open;
  }

  function handleLabelDetailsToggle(event) {
    const details = event.target.closest("[data-label-layer-section]");
    if (!details || details.parentElement !== els.labelLayerList) return;
    const layer = state.layers.get(details.dataset.labelLayerSection);
    if (layer) layer.labelExpanded = details.open;
  }

  function toggleLayerType(layerName, typeName) {
    const layer = state.layers.get(layerName);
    const layerType = layer ? layer.types.get(typeName) : null;
    if (!layerType) return;
    layerType.visible = !layerType.visible;
    updateFilteredFeatures();
  }

  function toggleLabelLayer(layerName) {
    const layer = state.layers.get(layerName);
    if (!layer) return;
    const labelTypes = Array.from(layer.types.values()).filter((item) => item.labelCount > 0);
    const shouldShow = !layer.labelVisible || labelTypes.some((item) => !item.labelVisible);
    layer.labelVisible = shouldShow;
    labelTypes.forEach((item) => {
      item.labelVisible = shouldShow;
    });
    renderLabelLayers();
    updateLabelPanelState();
    drawMap();
  }

  function toggleLabelLayerType(layerName, typeName) {
    const layer = state.layers.get(layerName);
    const layerType = layer ? layer.types.get(typeName) : null;
    if (!layerType) return;
    layerType.labelVisible = !layerType.labelVisible;
    const labelTypes = Array.from(layer.types.values()).filter((item) => item.labelCount > 0);
    layer.labelVisible = labelTypes.some((item) => item.labelVisible);
    renderLabelLayers();
    updateLabelPanelState();
    drawMap();
  }

  function toggleOverlay(overlayId) {
    const overlay = state.overlays.find((item) => item.id === overlayId);
    if (!overlay) return;
    overlay.userToggled = true;
    overlay.enabled = !overlay.enabled;
    if (!overlay.enabled) {
      overlay.status = "Off";
      if (overlay.abortController) overlay.abortController.abort();
      if (state.selectedOverlayFeature && state.selectedOverlayFeature.overlay.id === overlay.id) {
        state.selectedOverlayFeature = null;
        renderDetails();
      }
    } else {
      overlay.lastExtentKey = "";
      overlay.status = "Ready";
    }
    renderOverlays();
    drawMap();
  }

  function toggleOverlaySection(sectionKey) {
    const section = findOverlayTreeSection(sectionKey);
    if (!section || !section.overlays.length) return;
    const shouldEnable = section.overlays.some((overlay) => !overlay.enabled);
    section.overlays.forEach((overlay) => {
      overlay.userToggled = true;
      overlay.enabled = shouldEnable;
      if (overlay.enabled) {
        overlay.lastExtentKey = "";
        overlay.status = "Ready";
      } else {
        overlay.features = [];
        overlay.status = "Off";
        overlay.lastExtentKey = "";
        overlay.requestKey = "";
        if (overlay.abortController) overlay.abortController.abort();
        overlay.abortController = null;
      }
    });
    if (!shouldEnable && state.selectedOverlayFeature && section.overlays.some((overlay) => overlay.id === state.selectedOverlayFeature.overlay.id)) {
      state.selectedOverlayFeature = null;
      renderDetails();
    }
    renderOverlays();
    drawMap();
  }

  function selectFeature(featureUid) {
    state.selectedId = featureUid;
    state.selectedOverlayFeature = null;
    renderDetails();
    drawMap();
  }

  function selectOverlayFeature(selection) {
    state.selectedId = null;
    state.selectedOverlayFeature = selection;
    renderDetails();
    drawMap();
  }

  function renderAll() {
    renderMetrics();
    renderLayers();
    renderLabelLayers();
    renderOverlays();
    renderChecks();
    renderDetails();
    renderValidationPanel();
    renderRepairPreviewBanner();
    drawMap();
  }

  function renderMetrics() {
    const visibleLayers = Array.from(state.layers.values()).filter((layer) => layer.visible).length;

    if (els.fileName) els.fileName.textContent = state.fileName || "No file loaded";
    if (els.exportReportButton) els.exportReportButton.hidden = !state.loadedFiles.length;
    if (els.repairedXmlDownloadButton) els.repairedXmlDownloadButton.hidden = !state.repairPreview?.repairedXmlText;
    if (state.reportBundles.length < 2) closeReportExportMenu();
    if (els.visibleLayerCount) els.visibleLayerCount.textContent = `${visibleLayers} visible`;
    updateLabelPanelState();
    if (els.empty) els.empty.classList.toggle("is-hidden", state.features.length > 0 || shouldShowValidationPanel());
  }

  function shouldShowValidationPanel() {
    return state.validationErrorResults.length > 0 && state.features.length === 0;
  }

  function renderValidationPanel() {
    if (!els.schemaValidationPanel) return;
    if (!shouldShowValidationPanel()) {
      els.schemaValidationPanel.hidden = true;
      els.schemaValidationPanel.innerHTML = "";
      return;
    }

    const repairPlan = getSuggestedXmlRepairPlan(state.validationErrorResults);
    const repairPanel = renderValidationRepairPanel(repairPlan);
    const validationActions = renderValidationPanelActions(repairPlan);
    const resultItems = state.validationErrorResults.map((result, resultIndex) => {
      const errors = normalizeValidationErrors(result.errors);
      const visibleErrors = errors.slice(0, 20);
      const hiddenCount = Math.max(0, errors.length - visibleErrors.length);
      const errorRows = visibleErrors.map((error, errorIndex) => {
        const errorDetails = formatValidationErrorDetails(error);
        const valueControl = renderRepairIssueValueControl(error, errorDetails, errorIndex, resultIndex);
        return `
          <li>
            <span class="viewer-validation-file__location">${escapeHtml(formatValidationErrorLocation(error))}</span>
            <span class="viewer-validation-file__message">
              <strong>${escapeHtml(errorDetails.title)}</strong>
              ${errorDetails.detail ? `<small>${escapeHtml(errorDetails.detail)}</small>` : ""}
            </span>
            <span class="viewer-validation-file__suggestion">${escapeHtml(errorDetails.suggestion || "Review this element against the selected ADAC schema.")}</span>
            ${valueControl}
          </li>
        `;
      }).join("");
      return `
        <section class="viewer-validation-file">
          <div class="viewer-validation-file__header">
            <span>${escapeHtml(result.schemaLabel || "ADAC schema")}</span>
            <strong>${escapeHtml(result.fileName || "Uploaded XML")}</strong>
          </div>
          <p>${escapeHtml(getValidationResultSummary(result, errors.length))}</p>
          <div class="viewer-validation-file__columns" aria-hidden="true">
            <span>Location</span>
            <span>Issue</span>
            <span>Suggested fix</span>
            <span>Value / repair action</span>
          </div>
          <ol>${errorRows}</ol>
          ${hiddenCount ? `<small>${hiddenCount} more validation error${hiddenCount === 1 ? "" : "s"} not shown.</small>` : ""}
        </section>
      `;
    }).join("");

    els.schemaValidationPanel.innerHTML = `
      <div class="viewer-validation-panel__content">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <div class="viewer-validation-panel__intro">
          <span>Schema validation failed</span>
          <h2>XML file not loaded</h2>
          <p>The uploaded file did not validate against the supported ADAC schema, so it has been blocked from the viewer.</p>
        </div>
        <div class="viewer-validation-panel__body">
          ${repairPanel}
          <div class="viewer-validation-panel__files">
            ${resultItems}
          </div>
          ${validationActions}
        </div>
      </div>
    `;
    els.schemaValidationPanel.hidden = false;
  }

  function renderValidationRepairPanel(repairPlan) {
    if (!repairPlan || !repairPlan.patches.length) return "";
    const patchItems = repairPlan.patches.slice(0, 6).map((patch) => `<li>${escapeHtml(patch.label || "Apply a high-confidence XML repair.")}</li>`).join("");
    const hiddenCount = Math.max(0, repairPlan.patches.length - 6);
    const failureMessage = state.repairPreview?.status === "failed" && state.repairPreview.message
      ? `<p>${escapeHtml(state.repairPreview.message)}</p>`
      : "";
    return `
      <section class="viewer-validation-repair" aria-label="Suggested XML repair preview">
        <div class="viewer-validation-repair__header">
          <strong>Suggested XML patch available</strong>
          <p>This will create a temporary viewer-only copy. The uploaded XML file will not be changed.</p>
          ${failureMessage}
        </div>
        <ul>
          ${patchItems}
          ${hiddenCount ? `<li>${hiddenCount} more high-confidence repair${hiddenCount === 1 ? "" : "s"} available.</li>` : ""}
        </ul>
      </section>
    `;
  }

  function renderValidationPanelActions(repairPlan) {
    const hasRepairPlan = repairPlan && repairPlan.patches.length;
    const hasValueFixes = hasSelectableValidationFixes();
    if (!hasRepairPlan && !hasValueFixes && !state.repairPreview?.repairedXmlText) return "";
    return `
      <div class="viewer-validation-panel__actions">
        ${hasRepairPlan ? `
          <button type="button" data-action="preview-repaired-xml">
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
            <span>Preview with suggested repairs</span>
          </button>
        ` : (hasValueFixes ? `
          <button type="button" data-action="preview-selected-validation-fixes">
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
            <span>Apply selected fixes</span>
          </button>
        ` : "")}
        ${state.repairPreview?.repairedXmlText ? `
          <button type="button" data-action="download-repaired-xml">
            <i class="fa-solid fa-download" aria-hidden="true"></i>
            <span>Download patched XML</span>
          </button>
        ` : ""}
      </div>
    `;
  }

  function hasSelectableValidationFixes() {
    return state.validationErrorResults.some((result) => normalizeValidationErrors(result.errors).some((error) => {
      const details = formatValidationErrorDetails(error);
      const control = getRepairIssueValueControl(error, details);
      return control.kind === "select" || control.kind === "input";
    }));
  }

  function renderRepairPreviewBanner() {
    if (!els.repairPreviewBanner) return;
    const preview = state.repairPreview;
    if (!preview?.active || preview.dismissed) {
      els.repairPreviewBanner.hidden = true;
      els.repairPreviewBanner.innerHTML = "";
      return;
    }
    const patchCount = preview.patches?.length || 0;
    const schemaText = preview.validationPassed
      ? "The repaired preview validates against the selected ADAC schema."
      : `Step 2 has ${preview.remainingErrorCount || 0} schema issue${(preview.remainingErrorCount || 0) === 1 ? "" : "s"} still needing correction.`;
    const hasValueFixes = hasSelectableRepairPreviewFixes(preview);
    els.repairPreviewBanner.innerHTML = `
      <strong>Previewing viewer-repaired XML</strong>
      <div class="viewer-repair-banner__steps">
        <section>
          <span>Step 1</span>
          <p>${patchCount} temporary XML repair${patchCount === 1 ? "" : "s"} applied in memory only. The original XML file was not changed.</p>
        </section>
        <section>
          <span>Step 2</span>
          <p>${schemaText}</p>
          ${renderRepairPreviewRemainingIssues(preview)}
        </section>
      </div>
      <div class="viewer-repair-banner__actions">
        ${hasValueFixes ? `
          <button type="button" data-action="preview-selected-validation-fixes">
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
            <span>Apply selected fixes</span>
          </button>
        ` : ""}
        <button type="button" data-action="download-repaired-xml">
          <i class="fa-solid fa-download" aria-hidden="true"></i>
          <span>Download patched XML</span>
        </button>
        <button type="button" data-action="continue-repaired-preview">
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          <span>Continue without fixing</span>
        </button>
      </div>
    `;
    els.repairPreviewBanner.hidden = false;
  }

  function hasSelectableRepairPreviewFixes(preview) {
    if (preview?.validationPassed) return false;
    const errors = Array.isArray(preview?.remainingErrors) ? preview.remainingErrors : [];
    return errors.some((error) => {
      const details = formatValidationErrorDetails(error);
      const control = getRepairIssueValueControl(error, details);
      return control.kind === "select" || control.kind === "input";
    });
  }

  function continueRepairedPreview() {
    if (!state.repairPreview?.active) return;
    state.repairPreview.dismissed = true;
    renderRepairPreviewBanner();
    setStatus("Continuing with the viewer-repaired preview. The original XML still failed schema validation.", true);
  }

  function renderRepairPreviewRemainingIssues(preview) {
    const errors = Array.isArray(preview?.remainingErrors) ? preview.remainingErrors : [];
    if (preview?.validationPassed || !errors.length) return "";
    const rows = errors.map((error, index) => {
      const details = formatValidationErrorDetails(error);
      const control = renderRepairIssueValueControl(error, details, index, "preview");
      return `
        <li>
          <span class="viewer-repair-banner__issue">
            <small>${escapeHtml(formatValidationErrorLocation(error))}</small>
            <strong>${escapeHtml(details.title)}</strong>
          </span>
          <span class="viewer-repair-banner__suggestion">${escapeHtml(details.suggestion || details.detail || "Review this value against the ADAC schema.")}</span>
          ${control}
        </li>
      `;
    }).join("");
    const hiddenCount = Math.max(0, (preview.remainingErrorCount || errors.length) - errors.length);
    return `
      <div class="viewer-repair-banner__issue-headings" aria-hidden="true">
        <span>Issue</span>
        <span>Suggested fix</span>
        <span>Value / repair action</span>
      </div>
      <ol class="viewer-repair-banner__issues">
        ${rows}
        ${hiddenCount ? `<li><span class="viewer-repair-banner__issue"><small>More</small><strong>${hiddenCount} additional schema issue${hiddenCount === 1 ? "" : "s"}</strong></span><span class="viewer-repair-banner__suggestion">Download the patched XML or continue reviewing the validation checks for the full list.</span><span class="viewer-repair-banner__control">Manual review</span></li>` : ""}
      </ol>
    `;
  }

  function renderRepairIssueValueControl(error, details, index, resultIndex = "") {
    if (isSuggestedPatchRepair(error)) {
      return `
        <span class="viewer-repair-banner__control viewer-repair-banner__control--auto">
          <span>Suggested patch</span>
          <strong>Included automatically</strong>
          <small>No value needed</small>
        </span>
      `;
    }
    const control = getRepairIssueValueControl(error, details);
    const label = control.element ? `Choose ${control.element}` : "Choose fix";
    if (control.kind === "select" && control.options.length) {
      const options = [
        `<option value="">Choose value...</option>`,
        ...control.options.map((value) => `<option value="${escapeHtml(value)}"${value === control.suggestedValue ? " selected" : ""}>${escapeHtml(value)}</option>`),
      ].join("");
      return `
        <label class="viewer-repair-banner__control">
          <span>${escapeHtml(label)}</span>
          <select data-repair-index="${index}" data-repair-result="${escapeHtml(resultIndex)}" data-repair-element="${escapeHtml(control.element || "")}">
            ${options}
          </select>
        </label>
      `;
    }
    if (control.kind === "input") {
      return `
        <label class="viewer-repair-banner__control">
          <span>${escapeHtml(label)}</span>
          <input type="text" value="${escapeHtml(control.suggestedValue || "")}" placeholder="${escapeHtml(control.placeholder || "Enter replacement value")}" data-repair-index="${index}" data-repair-result="${escapeHtml(resultIndex)}" data-repair-element="${escapeHtml(control.element || "")}" />
        </label>
      `;
    }
    return `<span class="viewer-repair-banner__control viewer-repair-banner__control--manual">Requires manual XML edit</span>`;
  }

  function isSuggestedPatchRepair(error) {
    if (error?.repair?.confidence === "high") return true;
    return Boolean(getSchemaRenameRepairPatch(error));
  }

  function getRepairIssueValueControl(error, details) {
    const message = cleanValidationErrorMessage(error?.message || error?.rawMessage || "");
    const invalidValueMatch = message.match(/^Element '([^']+)': '([^']*)' is not a valid value/i);
    if (invalidValueMatch) {
      const element = formatXmlToken(invalidValueMatch[1]);
      const suppliedValue = invalidValueMatch[2] || "";
      const typeName = getAtomicTypeName(message);
      const allowedValues = getAllowedSchemaValuesForError(error, element, typeName);
      if (allowedValues.length) {
        const orderedValues = orderRepairAllowedValues(element, allowedValues);
        return {
          kind: "select",
          element,
          options: orderedValues,
          suggestedValue: getSuggestedRepairValue(details, suppliedValue, orderedValues, element),
        };
      }
      return {
        kind: "input",
        element,
        suggestedValue: getSuggestedRepairValue(details, suppliedValue, [], element, error),
        placeholder: formatSchemaTypeName(typeName) || "Replacement value",
      };
    }

    const facetMatch = message.match(/^Element '([^']+)': \[facet '([^']+)'\] (.+)$/i);
    if (facetMatch) {
      const element = formatXmlToken(facetMatch[1]);
      const suppliedValue = extractInvalidFacetValue(facetMatch[3]);
      const inlineAllowedValues = extractAllowedSchemaValues(facetMatch[3]);
      const allowedValues = inlineAllowedValues.length
        ? inlineAllowedValues
        : getAllowedSchemaValuesForError(error, element, getAtomicTypeName(message));
      if (allowedValues.length) {
        const orderedValues = orderRepairAllowedValues(element, allowedValues);
        return {
          kind: "select",
          element,
          options: orderedValues,
          suggestedValue: getSuggestedRepairValue(details, suppliedValue, orderedValues, element),
        };
      }
      return {
        kind: "input",
        element,
        suggestedValue: getSuggestedRepairValue(details, suppliedValue, [], element, error),
        placeholder: getNumericBoundarySuggestion(element, facetMatch[2], facetMatch[3]) || "Replacement value",
      };
    }

    return { kind: "manual", element: "" };
  }

  function orderRepairAllowedValues(element, allowedValues = []) {
    if (!isTypeValueElement(element)) return allowedValues;
    return [...allowedValues].sort((a, b) => {
      const rankA = getFallbackValueRank(a);
      const rankB = getFallbackValueRank(b);
      return rankA - rankB;
    });
  }

  function getFallbackValueRank(value) {
    const normalized = normalizeCompactValue(value);
    if (normalized === "unknown") return 2;
    if (normalized === "other") return 3;
    return 1;
  }

  function isTypeValueElement(element) {
    return normalizeDetailKey(element) === "type";
  }

  function getSuggestedRepairValue(details, suppliedValue = "", allowedValues = [], element = "", error = null) {
    if (isOwnerValueElement(element)) {
      return getSuggestedOwnerRepairValue(error);
    }
    const suggestion = String(details?.suggestion || "");
    const quoted = suggestion.match(/(?:with|Use)\s+'([^']+)'/i) || suggestion.match(/\bUse\s+([A-Za-z0-9_.-]+)\b/i);
    const candidate = quoted && !isSuggestionFillerWord(quoted[1]) ? quoted[1] : "";
    if (allowedValues.length) {
      if (isTypeValueElement(element) && isFallbackSchemaValue(candidate)) return "";
      if (hasAllowedValue(allowedValues, candidate)) {
        return allowedValues.find((value) => normalizeCompactValue(value) === normalizeCompactValue(candidate)) || candidate;
      }
      const closest = getClosestAllowedSchemaValue(suppliedValue, allowedValues);
      if (isTypeValueElement(element) && isFallbackSchemaValue(closest)) return "";
      return closest;
    }
    return candidate;
  }

  function isFallbackSchemaValue(value) {
    const normalized = normalizeCompactValue(value);
    return normalized === "unknown" || normalized === "other";
  }

  function isSuggestionFillerWord(value) {
    return /^(the|a|an|one|of|valid|matching)$/i.test(String(value || "").trim());
  }

  function isOwnerValueElement(element) {
    return normalizeDetailKey(element) === "owner";
  }

  function getSuggestedOwnerRepairValue(error = null) {
    const commonOwner = getMostCommonLoadedOwnerValue();
    if (commonOwner) return commonOwner;

    const nearbyOwner = getNearbyElementValues(error).get("owner");
    if (nearbyOwner) return nearbyOwner;

    const receiver = [
      state.fileMeta?.receiver,
      ...getActiveReceivers(),
    ].filter(Boolean).join(" ");
    return inferOwnerValueFromReceiver(receiver);
  }

  function getMostCommonLoadedOwnerValue() {
    const counts = new Map();
    state.features.forEach((feature) => {
      const owner = getFeatureAttributeValue(feature, "Owner");
      if (!owner || /^(unknown|other|none|null|n\/a|na)$/i.test(owner)) return;
      counts.set(owner, (counts.get(owner) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
  }

  function getFeatureAttributeValue(feature, wantedKey) {
    const normalizedWanted = normalizeDetailKey(wantedKey);
    const attributes = feature?.attributes || {};
    const match = Object.entries(attributes).find(([key, value]) => normalizeDetailKey(key) === normalizedWanted && String(value || "").trim());
    return match ? String(match[1] || "").trim() : "";
  }

  function inferOwnerValueFromReceiver(receiver) {
    const normalized = normalizeAuthorityName(receiver);
    if (!normalized) return "";
    if (/unitywater/.test(normalized)) return "UW";
    if (/urbanutilities|queenslandurbanutilities/.test(normalized)) return "QUU";
    if (/powerwater/.test(normalized)) return "PWC";
    if (/council|city|regional|shire|somerset|brisbane|ipswich|lockyer|scenicrim|moretonbay|sunshinecoast|goldcoast|logan|redland|toowoomba|noosa|gympie|bundaberg|frasercoast|gladstone|mackay|rockhampton|whitsunday|burnett/.test(normalized)) {
      return "Council";
    }
    return "";
  }

  function normalizeValidationErrors(errors = []) {
    return errors.length ? errors : [{ message: "The XML did not pass schema validation.", loc: null }];
  }

  function getValidationResultSummary(result, errorCount) {
    if (result.status === "unsupported") return result.message || "This ADAC schema version is not supported by the viewer yet.";
    if (result.status === "validator-error") return result.message || "The schema validator could not complete.";
    if (result.status === "parse-error") return "The XML is not well-formed, so schema validation could not run.";
    return `${errorCount} schema validation error${errorCount === 1 ? "" : "s"} found.`;
  }

  function formatValidationErrorLocation(error) {
    if (error?.loc?.lineNumber) return `Line ${error.loc.lineNumber}`;
    return "XML";
  }

  function formatValidationErrorMessage(error) {
    return formatValidationErrorDetails(error).title;
  }

  function formatValidationErrorDetails(error) {
    const message = cleanValidationErrorMessage(error?.message || error?.rawMessage || "Schema validation error.");
    if (error?.title || error?.detail || error?.suggestion) {
      return {
        title: error.title || message,
        detail: error.detail || "",
        suggestion: error.suggestion || "Fix the XML structure, then upload the file again.",
      };
    }

    const unexpectedMatch = message.match(/^Element '([^']+)': This element is not expected\.(?: Expected is(?: one of)? \( ([^)]+) \)\.)?/i);
    if (unexpectedMatch) {
      const element = formatXmlToken(unexpectedMatch[1]);
      const expected = unexpectedMatch[2] ? formatExpectedXmlTokens(unexpectedMatch[2]) : "";
      return {
        title: `Unexpected element: ${element}`,
        detail: expected ? `Expected: ${expected}` : "",
        suggestion: expected
          ? `Rename, move, or replace ${element} with the expected schema element: ${expected}.`
          : `Remove ${element} or move it to a schema-valid location.`,
      };
    }

    const missingMatch = message.match(/^Element '([^']+)': Missing child element\(s\)\. Expected is(?: one of)? \( ([^)]+) \)\.?/i);
    if (missingMatch) {
      const parent = formatXmlToken(missingMatch[1]);
      const expected = formatExpectedXmlTokens(missingMatch[2]);
      return {
        title: `Missing required child element under ${parent}`,
        detail: `Expected: ${expected}`,
        suggestion: `Add the required child element under ${parent}: ${expected}.`,
      };
    }

    const invalidValueMatch = message.match(/^Element '([^']+)': '([^']*)' is not a valid value/i);
    if (invalidValueMatch) {
      const element = formatXmlToken(invalidValueMatch[1]);
      const value = invalidValueMatch[2] || "(blank)";
      const typeName = getAtomicTypeName(message);
      const typeDetail = typeName ? `Expected type: ${formatSchemaTypeName(typeName)}` : "";
      const allowedValues = getAllowedSchemaValuesForError(error, element, typeName);
      const contextLabel = getSchemaContextLabelForError(error, element);
      const ambiguousValues = !allowedValues.length && hasAmbiguousSchemaValuesForError(error, element, typeName);
	      return {
	        title: `Invalid value for ${element}`,
	        detail: [
	          contextLabel ? `Context: ${contextLabel}` : "",
	          `Value supplied: ${value}`,
          allowedValues.length
            ? `Allowed values: ${formatAllowedSchemaValues(allowedValues)}`
            : (ambiguousValues ? "Allowed values depend on the parent asset type." : typeDetail),
	        ].filter(Boolean).join(". "),
	        suggestion: allowedValues.length
	          ? getAllowedValueCorrectionSuggestion(error, element, value, allowedValues)
	          : (ambiguousValues ? getAmbiguousSchemaValueSuggestion(error, element) : getValueCorrectionSuggestion(error, element, message)),
	      };
	    }

    const facetMatch = message.match(/^Element '([^']+)': \[facet '([^']+)'\] (.+)$/i);
	    if (facetMatch) {
	      const element = formatXmlToken(facetMatch[1]);
	      const facet = formatFacetLabel(facetMatch[2]);
	      const suppliedValue = extractInvalidFacetValue(facetMatch[3]);
	      const inlineAllowedValues = extractAllowedSchemaValues(facetMatch[3]);
	      const allowedValues = inlineAllowedValues.length
	        ? inlineAllowedValues
	        : getAllowedSchemaValuesForError(error, element, getAtomicTypeName(message));
      const contextLabel = getSchemaContextLabelForError(error, element);
      const ambiguousValues = !allowedValues.length && hasAmbiguousSchemaValuesForError(error, element, getAtomicTypeName(message));
      const boundarySuggestion = getNumericBoundarySuggestion(element, facetMatch[2], facetMatch[3]);
      return {
        title: `Invalid ${facet} for ${element}`,
        detail: [
          contextLabel ? `Context: ${contextLabel}` : "",
          allowedValues.length
            ? `Allowed values: ${formatAllowedSchemaValues(allowedValues)}`
            : (ambiguousValues ? "Allowed values depend on the parent asset type." : facetMatch[3]),
	        ].filter(Boolean).join(". "),
	        suggestion: allowedValues.length
	          ? getAllowedValueCorrectionSuggestion(error, element, suppliedValue, allowedValues)
	          : (ambiguousValues ? getAmbiguousSchemaValueSuggestion(error, element) : (boundarySuggestion || getValueCorrectionSuggestion(error, element, message))),
	      };
	    }

    const elementMatch = message.match(/^Element '([^']+)': (.+)$/i);
    if (elementMatch) {
      const element = formatXmlToken(elementMatch[1]);
      return {
        title: `Issue with ${element}`,
        detail: elementMatch[2],
        suggestion: `Check ${element} against the ADAC schema requirements.`,
      };
    }

    return {
      title: message,
      detail: "",
      suggestion: "Review this message against the selected ADAC schema.",
    };
  }

  function cleanValidationErrorMessage(message) {
    return String(message || "")
      .replace(/\{[^}]+\}([A-Za-z0-9_.:-]+)/g, "$1")
      .replace(/^(?:.*?:\d+:\s*)?element\s+[A-Za-z0-9_.:-]+\s*:\s*Schemas validity error\s*:\s*/i, "")
      .replace(/^Schemas validity error\s*:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatXmlToken(value) {
    return String(value || "")
      .replace(/\{[^}]+\}/g, "")
      .replace(/^.*:/, "")
      .trim();
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function formatExpectedXmlTokens(value) {
    const tokens = String(value || "")
      .replace(/\{[^}]+\}([A-Za-z0-9_.:-]+)/g, "$1")
      .replace(/[()]/g, "")
      .split(/\s*,\s*/)
      .map(formatXmlToken)
      .filter(Boolean);
    if (tokens.length > 8) return `${tokens.slice(0, 8).join(", ")} and ${tokens.length - 8} more`;
    return tokens.join(", ");
  }

  function formatFacetLabel(value) {
    const labels = {
      enumeration: "listed value",
      maxexclusive: "maximum value",
      maxinclusive: "maximum value",
      minexclusive: "minimum value",
      mininclusive: "minimum value",
      pattern: "format",
      totaldigits: "number",
      fractiondigits: "decimal precision",
      length: "length",
      minlength: "minimum length",
      maxlength: "maximum length",
    };
    const key = normalizeDetailKey(value);
    return labels[key] || String(value || "value").replace(/[-_]+/g, " ");
  }

  function getAllowedSchemaValuesForError(error, element, typeName = "") {
    const lookup = schemaValueLookupCache.get(error?.schemaKey);
    if (!lookup) return [];

    const explicitTypeValues = getAllowedSchemaValuesForType(lookup, typeName);
    if (explicitTypeValues.length) return explicitTypeValues;

    const contextCandidates = getSchemaValueCandidatesForErrorContext(lookup, error, element);
    if (contextCandidates.length === 1) return contextCandidates[0].values;
    if (contextCandidates.length > 1 && getDistinctSchemaValueSets(contextCandidates).length === 1) return contextCandidates[0].values;

    const valuesByType = getSchemaValueCandidatesForElement(lookup, element);

    if (valuesByType.length === 1) return valuesByType[0].values;
    if (valuesByType.length > 1 && getDistinctSchemaValueSets(valuesByType).length === 1) return valuesByType[0].values;
    return [];
  }

  function getAllowedSchemaValuesForType(lookup, typeName = "") {
    if (!lookup || !typeName) return [];
    return lookup.typeValues.get(normalizeSchemaTypeKey(typeName)) || [];
  }

  function hasAmbiguousSchemaValuesForError(error, element, typeName = "") {
    const lookup = schemaValueLookupCache.get(error?.schemaKey);
    if (!lookup || getAllowedSchemaValuesForType(lookup, typeName).length) return false;
    const contextCandidates = getSchemaValueCandidatesForErrorContext(lookup, error, element);
    if (contextCandidates.length > 1) return getDistinctSchemaValueSets(contextCandidates).length > 1;
    if (contextCandidates.length === 1) return false;
    const valuesByType = getSchemaValueCandidatesForElement(lookup, element);
    return valuesByType.length > 1 && getDistinctSchemaValueSets(valuesByType).length > 1;
  }

  function getSchemaValueCandidatesForErrorContext(lookup, error, element) {
    if (!lookup?.contextElementTypes || !error?.xmlContext?.path?.length) return [];
    const path = error.xmlContext.path.map(cleanName).filter(Boolean);
    if (!path.length) return [];
    const elementKey = normalizeDetailKey(element);
    const elementIndex = findLastPathIndex(path, elementKey);
    const parentPath = (elementIndex >= 0 ? path.slice(0, elementIndex) : path)
      .filter((item) => normalizeDetailKey(item) !== elementKey);
    const contextKeys = getSchemaContextKeysForPath(parentPath, element);

    for (const contextKey of contextKeys) {
      const possibleTypes = lookup.contextElementTypes.get(normalizeSchemaPathKey(contextKey));
      if (!possibleTypes || !possibleTypes.size) continue;
      const contextParts = contextKey.split("/");
      const candidates = uniqueSchemaValueCandidates(Array.from(possibleTypes).map((candidateType) => ({
        context: contextParts.slice(0, -1).join(" > "),
        type: candidateType,
        values: getAllowedSchemaValuesForType(lookup, candidateType),
      })).filter((item) => item.values.length));
      if (candidates.length) return candidates;
    }

    return [];
  }

  function getSchemaContextKeysForPath(parentPath, element) {
    if (!parentPath.length) return [];
    const keys = [];
    const nearestParent = parentPath[parentPath.length - 1];

    for (let index = parentPath.length - 2; index >= 0; index -= 1) {
      keys.push(`${parentPath[index]}/${nearestParent}/${element}`);
    }

    for (let start = 0; start < parentPath.length; start += 1) {
      keys.push([...parentPath.slice(start), element].join("/"));
    }

    keys.push(`${nearestParent}/${element}`);
    return uniqueValues(keys.map(normalizeSchemaPathKey).filter(Boolean));
  }

  function getSchemaValueCandidatesForElement(lookup, element) {
    const possibleTypes = lookup?.elementTypes.get(normalizeDetailKey(element));
    if (!possibleTypes || !possibleTypes.size) return [];
    return uniqueSchemaValueCandidates(Array.from(possibleTypes)
      .map((candidateType) => ({
        type: candidateType,
        values: getAllowedSchemaValuesForType(lookup, candidateType),
      }))
      .filter((item) => item.values.length));
  }

  function uniqueSchemaValueCandidates(candidates = []) {
    const seen = new Set();
    return candidates.filter((candidate) => {
      const key = `${normalizeSchemaTypeKey(candidate.type)}|${candidate.values.join("\u0001")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getDistinctSchemaValueSets(valuesByType = []) {
    return uniqueValues(valuesByType.map((item) => item.values.join("\u0001")));
  }

  function getSchemaContextLabelForError(error, element) {
    const path = error?.xmlContext?.path;
    if (!Array.isArray(path) || !path.length) return "";
    const elementKey = normalizeDetailKey(element);
    const lastElementIndex = path.findLastIndex
      ? path.findLastIndex((item) => normalizeDetailKey(item) === elementKey)
      : findLastPathIndex(path, elementKey);
    const contextPath = lastElementIndex >= 0 ? path.slice(0, lastElementIndex + 1) : path;
    const trimmedPath = contextPath.slice(-4);
    return trimmedPath.map(formatXmlToken).filter(Boolean).join(" > ");
  }

  function findLastPathIndex(path, key) {
    for (let index = path.length - 1; index >= 0; index -= 1) {
      if (normalizeDetailKey(path[index]) === key) return index;
    }
    return -1;
  }

  function getAmbiguousSchemaValueSuggestion(error, element) {
    const lookup = schemaValueLookupCache.get(error?.schemaKey);
    const contextCandidates = getSchemaValueCandidatesForErrorContext(lookup, error, element);
    const candidates = contextCandidates.length ? contextCandidates : getSchemaValueCandidatesForElement(lookup, element);
    const labels = candidates
      .map((candidate) => candidate.context
        ? `${formatXmlToken(candidate.context)} (${formatSchemaTypeName(candidate.type)})`
        : formatSchemaTypeName(candidate.type))
      .filter(Boolean);
    if (labels.length) {
      const visibleLabels = labels.slice(0, 6).join(", ");
      const moreText = labels.length > 6 ? ` and ${labels.length - 6} more` : "";
      return `${element} has multiple possible schema value sets. Use the values for the correct parent asset: ${visibleLabels}${moreText}.`;
    }
    return `${element} is used by multiple ADAC asset types. Check the parent asset and use the ${element} values for that specific asset class.`;
  }

  function normalizeSchemaTypeKey(typeName) {
    return normalizeDetailKey(formatXmlToken(typeName));
  }

  function normalizeSchemaPathKey(value) {
    return String(value || "")
      .split("/")
      .map((part) => normalizeDetailKey(formatXmlToken(part)))
      .filter(Boolean)
      .join("/");
  }

  function uniqueValues(values = []) {
    return Array.from(new Set(values));
  }

  function getAtomicTypeName(message) {
    const match = String(message || "").match(/atomic type '([^']+)'/i);
    return match ? formatXmlToken(match[1]) : "";
  }

  function formatSchemaTypeName(typeName) {
    const normalized = formatXmlToken(typeName);
    const labels = {
      positiveInteger: "whole number, 1 or greater",
      nonNegativeInteger: "whole number, 0 or greater",
      integer: "whole number",
      float: "decimal number",
      double: "decimal number",
      decimal: "decimal number",
      Float_Positive_NonZero: "decimal number greater than 0",
      Float_Positive_Zero: "decimal number 0 or greater",
      water_service_diameter: "whole-number water service diameter from 20 to 63 mm",
    };
    return labels[normalized] || normalized.replace(/_/g, " ");
  }

  function getValueCorrectionSuggestion(error, element, message = "") {
    const normalizedElement = normalizeDetailKey(element);
    const typeName = getAtomicTypeName(message);
    const normalizedType = normalizeDetailKey(typeName);
    const nearbyNumericSuggestion = getNearbyNumericCorrectionSuggestion(error, element, message);
    if (nearbyNumericSuggestion) return nearbyNumericSuggestion;

    const boundarySuggestion = getNumericBoundarySuggestion(element, "", message);
    if (boundarySuggestion) return boundarySuggestion;

    if (/minlength|minimum length|underruns the allowed minimum length/i.test(message)) {
      if (normalizedElement === "owner") {
        const suggestedOwner = getSuggestedOwnerRepairValue(error);
        return suggestedOwner
          ? `Owner cannot be blank. Use '${suggestedOwner}' based on the other assets or the Receiver field.`
          : "Owner cannot be blank. Use the asset owner code expected by the Receiver field, or use Council for council-owned assets.";
      }
      return `${element} cannot be blank. Provide at least one character or mark the element nil only if the schema allows it.`;
    }

    if (normalizedType === "waterservicediameter") {
      return "Use a whole-number service diameter in millimetres between 20 and 63. Common sizes are 20, 25, 32, 38, 40, 50 and 63.";
    }

    if (normalizedElement.includes("diametermm") || normalizedElement.endsWith("diameter")) {
      return "Use a whole-number diameter in millimetres. Values must be 1 or greater, for example 100, 150, 225 or 375.";
    }

    if (normalizedType === "positiveinteger" || normalizedType.includes("positiveinteger")) {
      return `Use a whole number for ${element}. Values must be 1 or greater.`;
    }

    if (normalizedType === "nonnegativeinteger") {
      return `Use a whole number for ${element}. Values must be 0 or greater.`;
    }

    if (normalizedType.includes("floatpositivenonzero")) {
      return `Use a decimal number for ${element}. Values must be greater than 0.`;
    }

    if (normalizedType.includes("floatpositivezero")) {
      return `Use a decimal number for ${element}. Values must be 0 or greater.`;
    }

    if (/level|chainage|length|width|height|depth|area|volume|offset|bearing|slope/i.test(element)) {
      return `Use a numeric value for ${element} and check the unit shown in the element name.`;
    }

    return `Update ${element} to a value allowed by the ADAC schema.`;
  }

  function getNearbyNumericCorrectionSuggestion(error, element, message = "") {
    const normalizedElement = normalizeDetailKey(element);
    if (!normalizedElement.includes("diametermm") && !normalizedElement.endsWith("diameter")) return "";

    const nearbyValues = getNearbyElementValues(error);
    const notes = nearbyValues.get("notes") || "";
    const candidate = getFirstPositiveIntegerFromText(notes);
    if (!candidate) return "";

    const text = String(message || "");
    if (!/positiveInteger|not a valid value|minimum|greater than/i.test(text)) return "";
    return `Use ${candidate} for ${element}. Nearby Notes say '${notes}', which appears to identify a ${candidate} mm chamber/asset size.`;
  }

  function getFirstPositiveIntegerFromText(text) {
    const match = String(text || "").match(/\b([1-9]\d{1,4})\b/);
    return match ? match[1] : "";
  }

  function getNumericBoundarySuggestion(element, facetName, message) {
    const text = String(message || "");
    const facet = normalizeDetailKey(facetName);
    const minAllowed = text.match(/minimum value allowed \('([^']+)'\)/i)
      || text.match(/greater than or equal to '?([0-9.+-]+)'?/i);
    if (minAllowed) {
      const inclusive = facet !== "minexclusive" && !/greater than '?[0-9.+-]+'?/i.test(text);
      return `Use a numeric value for ${element} that is ${inclusive ? "at least" : "greater than"} ${minAllowed[1]}.`;
    }

    const maxAllowed = text.match(/maximum value allowed \('([^']+)'\)/i)
      || text.match(/less than or equal to '?([0-9.+-]+)'?/i);
    if (maxAllowed) {
      const inclusive = facet !== "maxexclusive" && !/less than '?[0-9.+-]+'?/i.test(text);
      return `Use a numeric value for ${element} that is ${inclusive ? "no more than" : "less than"} ${maxAllowed[1]}.`;
    }

    const exclusiveMin = text.match(/greater than '?([0-9.+-]+)'?/i);
    if (exclusiveMin) return `Use a numeric value for ${element} that is greater than ${exclusiveMin[1]}.`;

    const exclusiveMax = text.match(/less than '?([0-9.+-]+)'?/i);
    if (exclusiveMax) return `Use a numeric value for ${element} that is less than ${exclusiveMax[1]}.`;

    return "";
  }

  function extractAllowedSchemaValues(message) {
    const match = String(message || "").match(/set\s*\{([^}]+)\}/i)
      || String(message || "").match(/set of values\s*\{([^}]+)\}/i);
    if (!match) return [];
    return match[1]
      .split(/\s*,\s*/)
      .map((value) => value.replace(/^['"]|['"]$/g, "").trim())
      .filter(Boolean);
  }

  function extractInvalidFacetValue(message) {
    const match = String(message || "").match(/The value '([^']*)'/i);
    return match ? match[1] : "";
  }

  function getAllowedValueCorrectionSuggestion(error, element, suppliedValue, allowedValues = []) {
    const allowedText = formatAllowedSchemaValues(allowedValues);
    const value = String(suppliedValue || "").trim();
    const nearbySuggestion = getNearbyValueCorrectionSuggestion(error, element, value, allowedValues);
    if (nearbySuggestion) return nearbySuggestion;

    if (isTypeValueElement(element)) {
      const orderedValues = orderRepairAllowedValues(element, allowedValues);
      const primaryValues = orderedValues.filter((allowed) => !isFallbackSchemaValue(allowed));
      const primaryText = formatAllowedSchemaValues(primaryValues.length ? primaryValues : orderedValues);
      if (/^(none|nil|null|n\/a|na)$/i.test(value)) {
        return `Choose the matching ${element} from the schema values first: ${primaryText}. Use 'Unknown' or 'Other' only if no specific value applies.`;
      }
      const closestType = getClosestAllowedSchemaValue(value, primaryValues);
      if (closestType) {
        return `Replace ${element} value '${value}' with '${closestType}'. Use 'Unknown' or 'Other' only if no specific value applies.`;
      }
      return `Choose the matching ${element} from the valid schema values: ${primaryText}. Use 'Unknown' or 'Other' only as a fallback.`;
    }

    if (/^(none|nil|null|n\/a|na)$/i.test(value)) {
      if (hasAllowedValue(allowedValues, "Unknown")) return `Use 'Unknown' when ${element} is not known. Use 'Other' only if the value is known but not listed.`;
      if (hasAllowedValue(allowedValues, "Other")) return `Use 'Other' if ${element} is not covered by the listed schema values.`;
    }

    const closest = getClosestAllowedSchemaValue(value, allowedValues);
    if (closest) {
      return `Replace ${element} value '${value}' with '${closest}'. Valid values are: ${allowedText}.`;
    }

    return `Use one of the valid schema values: ${allowedText}.`;
  }

  function getNearbyValueCorrectionSuggestion(error, element, suppliedValue, allowedValues = []) {
    const nearbyValues = getNearbyElementValues(error);
    const normalizedElement = normalizeDetailKey(element);
    if (normalizedElement.includes("material")) {
      const relatedMaterials = ["FloorMaterial", "RoofMaterial", "WallMaterial", "LidMaterial"]
        .filter((name) => normalizeDetailKey(name) !== normalizedElement)
        .map((name) => ({ name, value: nearbyValues.get(normalizeDetailKey(name)) }))
        .filter((item) => item.value && hasAllowedValue(allowedValues, item.value));
      const matchingMaterial = relatedMaterials.find((item) => suppliedValue && normalizeCompactValue(suppliedValue).startsWith(normalizeCompactValue(item.value)));
      if (matchingMaterial) {
        return `Replace '${suppliedValue}' with '${matchingMaterial.value}'. Nearby ${formatXmlToken(matchingMaterial.name)} is '${matchingMaterial.value}', and '${matchingMaterial.value}' is the valid ADAC schema material value.`;
      }
    }
    return "";
  }

  function getNearbyElementValues(error) {
    const lines = Array.isArray(error?.xmlContext?.nearbyLines) ? error.xmlContext.nearbyLines : [];
    const values = new Map();
    lines.forEach((line) => {
      const match = String(line || "").match(/<([A-Za-z0-9_:-]+)(?:\s[^>]*)?>([^<]*)<\/\1>/);
      if (!match) return;
      const name = formatXmlToken(match[1]);
      const value = String(match[2] || "").trim();
      if (name && value) values.set(normalizeDetailKey(name), value);
    });
    return values;
  }

  function getClosestAllowedSchemaValue(value, allowedValues = []) {
    const normalizedValue = normalizeCompactValue(value);
    if (!normalizedValue) return "";
    const exact = allowedValues.find((allowed) => normalizeCompactValue(allowed) === normalizedValue);
    if (exact) return exact;
    const prefix = allowedValues
      .filter((allowed) => normalizeCompactValue(allowed).length >= 2)
      .find((allowed) => normalizedValue.startsWith(normalizeCompactValue(allowed)));
    if (prefix) return prefix;
    const contained = allowedValues
      .filter((allowed) => normalizedValue.length >= 3 && normalizeCompactValue(allowed).length > normalizedValue.length)
      .find((allowed) => normalizeCompactValue(allowed).includes(normalizedValue));
    return contained || "";
  }

  function hasAllowedValue(allowedValues = [], value = "") {
    const normalizedValue = normalizeCompactValue(value);
    return allowedValues.some((allowed) => normalizeCompactValue(allowed) === normalizedValue);
  }

  function normalizeCompactValue(value) {
    return String(value || "").replace(/[^a-z0-9]+/gi, "").toLowerCase();
  }

  function formatAllowedSchemaValues(values = []) {
    if (!values.length) return "";
    if (values.length > 12) return `${values.slice(0, 12).join(", ")}. Showing first 12 of ${values.length} valid values.`;
    return values.join(", ");
  }

  function renderLayers() {
    els.layerList.innerHTML = "";
    Array.from(state.layers.values()).forEach((layer) => {
      const group = document.createElement("details");
      group.className = "viewer-layer-group";
      group.dataset.layerSection = layer.name;
      group.open = Boolean(layer.expanded);
      const layerToggle = getLayerToggleState(layer);
      group.innerHTML = `
        <summary class="viewer-layer-group__summary">
          <span class="viewer-layer__swatch" style="background:${layer.color}"></span>
          <span class="viewer-layer-group__title">${escapeHtml(layer.name)}</span>
          <span class="viewer-layer-group__meta">${escapeHtml(getLayerMetaText(layer))}</span>
          <button type="button" class="viewer-overlay-section__visibility ${layerToggle.mixed ? "is-mixed" : ""}" data-layer-toggle="${escapeHtml(layer.name)}" aria-label="${escapeHtml(layerToggle.label)}">
            <i class="fa-solid ${layerToggle.icon}" aria-hidden="true"></i>
          </button>
        </summary>
      `;
      const children = document.createElement("div");
      children.className = "viewer-layer-types";
      Array.from(layer.types.values())
        .sort((a, b) => naturalCompare(a.name, b.name))
        .forEach((layerType) => {
          const child = document.createElement("div");
          child.className = `viewer-layer-type ${layer.visible && layerType.visible ? "" : "is-muted"}`;
          child.innerHTML = `
            <span class="viewer-layer-type__main">
              <strong>${escapeHtml(layerType.name)}</strong>
              <small>${layerType.count} asset${layerType.count === 1 ? "" : "s"}</small>
            </span>
            <button type="button" class="viewer-overlay__visibility" data-layer="${escapeHtml(layer.name)}" data-layer-type="${escapeHtml(layerType.name)}" data-layer-type-toggle aria-label="${layerType.visible ? "Hide" : "Show"} ${escapeHtml(layerType.name)} assets in ${escapeHtml(layer.name)}">
              <i class="fa-solid ${layerType.visible ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>
            </button>
          `;
          children.appendChild(child);
        });
      group.appendChild(children);
      els.layerList.appendChild(group);
    });
  }

  function renderLabelLayers() {
    if (!els.labelLayerList) return;
    els.labelLayerList.innerHTML = "";
    Array.from(state.layers.values())
      .filter((layer) => layer.labelCount > 0)
      .forEach((layer) => {
        const group = document.createElement("details");
        group.className = "viewer-layer-group";
        group.dataset.labelLayerSection = layer.name;
        group.open = Boolean(layer.labelExpanded);
        const layerToggle = getLabelLayerToggleState(layer);
        group.innerHTML = `
          <summary class="viewer-layer-group__summary">
            <span class="viewer-layer__swatch" style="background:${layer.color}"></span>
            <span class="viewer-layer-group__title">${escapeHtml(layer.name)}</span>
            <span class="viewer-layer-group__meta">${escapeHtml(getLabelLayerMetaText(layer))}</span>
            <button type="button" class="viewer-overlay-section__visibility ${layerToggle.mixed ? "is-mixed" : ""}" data-label-layer-toggle="${escapeHtml(layer.name)}" aria-label="${escapeHtml(layerToggle.label)}">
              <i class="fa-solid ${layerToggle.icon}" aria-hidden="true"></i>
            </button>
          </summary>
        `;
        const children = document.createElement("div");
        children.className = "viewer-layer-types";
        Array.from(layer.types.values())
          .filter((layerType) => layerType.labelCount > 0)
          .sort((a, b) => naturalCompare(a.name, b.name))
          .forEach((layerType) => {
            const child = document.createElement("div");
            child.className = `viewer-layer-type ${layer.labelVisible && layerType.labelVisible ? "" : "is-muted"}`;
            child.innerHTML = `
              <span class="viewer-layer-type__main">
                <strong>${escapeHtml(layerType.name)}</strong>
                <small>${layerType.labelCount} label${layerType.labelCount === 1 ? "" : "s"}</small>
              </span>
              <button type="button" class="viewer-overlay__visibility" data-label-layer="${escapeHtml(layer.name)}" data-label-layer-type="${escapeHtml(layerType.name)}" data-label-layer-type-toggle aria-label="${layerType.labelVisible ? "Hide" : "Show"} ${escapeHtml(layerType.name)} labels in ${escapeHtml(layer.name)}">
                <i class="fa-solid ${layerType.labelVisible ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>
              </button>
            `;
            children.appendChild(child);
          });
        group.appendChild(children);
        els.labelLayerList.appendChild(group);
      });
  }

  function updateLabelPanelState() {
    if (!els.labelLayerPanel) return;
    const active = state.labelMode !== "off" && getTotalLabelCount() > 0;
    els.labelLayerPanel.hidden = !active;
    if (els.visibleLabelCount) {
      els.visibleLabelCount.textContent = active ? `${getVisibleLabelCount()} visible` : "0 visible";
    }
  }

  function getTotalLabelCount() {
    return Array.from(state.layers.values()).reduce((total, layer) => total + layer.labelCount, 0);
  }

  function getVisibleLabelCount() {
    return Array.from(state.layers.values()).reduce((total, layer) => {
      if (!layer.labelVisible) return total;
      return total + Array.from(layer.types.values()).reduce((typeTotal, layerType) => (
        typeTotal + (layerType.labelVisible ? layerType.labelCount : 0)
      ), 0);
    }, 0);
  }

  function getLabelLayerToggleState(layer) {
    const types = Array.from(layer.types.values()).filter((item) => item.labelCount > 0);
    const visibleTypes = types.filter((item) => item.labelVisible).length;
    const mixed = layer.labelVisible && visibleTypes > 0 && visibleTypes < types.length;
    if (!layer.labelVisible || visibleTypes === 0) {
      return { icon: "fa-eye-slash", mixed: false, label: `Show ${layer.name} labels` };
    }
    return {
      icon: mixed ? "fa-eye-low-vision" : "fa-eye",
      mixed,
      label: mixed ? `Show all ${layer.name} label types` : `Hide ${layer.name} labels`,
    };
  }

  function getLabelLayerMetaText(layer) {
    const types = Array.from(layer.types.values());
    const visibleCount = types.reduce((total, item) => total + (layer.labelVisible && item.labelVisible ? item.labelCount : 0), 0);
    return `${visibleCount}/${layer.labelCount} visible`;
  }

  function getLayerToggleState(layer) {
    const types = Array.from(layer.types.values());
    const visibleTypes = types.filter((item) => item.visible).length;
    const mixed = layer.visible && visibleTypes > 0 && visibleTypes < types.length;
    if (!layer.visible || visibleTypes === 0) {
      return { icon: "fa-eye-slash", mixed: false, label: `Show ${layer.name} layer` };
    }
    return {
      icon: mixed ? "fa-eye-low-vision" : "fa-eye",
      mixed,
      label: mixed ? `Show all ${layer.name} asset types` : `Hide ${layer.name} layer`,
    };
  }

  function getLayerMetaText(layer) {
    const types = Array.from(layer.types.values());
    const visibleCount = types.reduce((total, item) => total + (layer.visible && item.visible ? item.count : 0), 0);
    return `${visibleCount}/${layer.count} visible`;
  }

  function renderOverlays() {
    if (!els.overlayList) return;

    captureOverlayOpenSections();
    els.overlayList.innerHTML = "";

    const managerOverlays = getLayerManagerOverlays();
    getOverlayTree(managerOverlays).forEach((group) => {
      const groupToggle = getOverlayTreeToggleState(group);
      const groupEl = document.createElement("details");
      groupEl.className = "viewer-overlay-group";
      groupEl.dataset.overlaySection = group.key;
      groupEl.open = shouldOpenOverlaySection(group);
      groupEl.innerHTML = `
        <summary class="viewer-overlay-group__summary">
          <span class="viewer-overlay-group__title">${escapeHtml(group.name)}</span>
          <span class="viewer-overlay-group__meta">${getOverlayTreeCountText(group)}</span>
          <button type="button" class="viewer-overlay-section__visibility ${groupToggle.mixed ? "is-mixed" : ""}" data-overlay-section-toggle="${escapeHtml(group.key)}" aria-label="${escapeHtml(groupToggle.label)}">
            <i class="fa-solid ${groupToggle.icon}" aria-hidden="true"></i>
          </button>
        </summary>
      `;

      group.categories.forEach((category) => {
        const categoryToggle = getOverlayTreeToggleState(category);
        const categoryEl = document.createElement("details");
        categoryEl.className = "viewer-overlay-category";
        categoryEl.dataset.overlaySection = category.key;
        categoryEl.open = shouldOpenOverlaySection(category);
        categoryEl.innerHTML = `
          <summary class="viewer-overlay-category__summary">
            <span>${escapeHtml(category.name)}</span>
            <span class="viewer-overlay-category__meta">${getOverlayTreeCountText(category)}</span>
            <button type="button" class="viewer-overlay-section__visibility ${categoryToggle.mixed ? "is-mixed" : ""}" data-overlay-section-toggle="${escapeHtml(category.key)}" aria-label="${escapeHtml(categoryToggle.label)}">
              <i class="fa-solid ${categoryToggle.icon}" aria-hidden="true"></i>
            </button>
          </summary>
        `;

        category.overlays.forEach((overlay) => {
          const row = document.createElement("div");
          const swatchStyle = getOverlayFeatureStyle(overlay, {}).stroke;
          row.className = `viewer-overlay ${overlay.enabled ? "" : "is-muted"}`;
          row.innerHTML = `
            <span class="viewer-overlay__swatch" style="background:${escapeHtml(swatchStyle)}"></span>
            <span class="viewer-overlay__main">
              <strong>${escapeHtml(overlay.name)}</strong>
              <small>${escapeHtml(getOverlayStatusText(overlay))}</small>
            </span>
            <button type="button" class="viewer-overlay__visibility" data-overlay-toggle="${escapeHtml(overlay.id)}" aria-label="${overlay.enabled ? "Hide" : "Show"} ${escapeHtml(overlay.name)} overlay">
              <i class="fa-solid ${overlay.enabled ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>
            </button>
          `;
          categoryEl.appendChild(row);
        });

        groupEl.appendChild(categoryEl);
      });

      els.overlayList.appendChild(groupEl);
    });

    const activeCount = managerOverlays.filter((overlay) => overlay.enabled).length;
    if (els.overlayStatus) {
      els.overlayStatus.textContent = activeCount ? `${activeCount} enabled` : "All off";
    }
  }

  function captureOverlayOpenSections() {
    if (!els.overlayList) return;
    els.overlayList.querySelectorAll("details[data-overlay-section]").forEach((section) => {
      if (section.open) {
        state.overlayOpenSections.add(section.dataset.overlaySection);
        state.overlayClosedSections.delete(section.dataset.overlaySection);
      } else {
        state.overlayOpenSections.delete(section.dataset.overlaySection);
        state.overlayClosedSections.add(section.dataset.overlaySection);
      }
    });
  }

  function getLayerManagerOverlays() {
    return state.overlays.filter(shouldShowOverlayInLayerManager);
  }

  function shouldShowOverlayInLayerManager(overlay) {
    if (isGlobalOverlay(overlay)) return true;
    if (overlay.enabled || overlay.userToggled) return true;
    if (!state.features.length) return false;
    if (state.locationCheck.status === "checking") return false;
    if (!hasDetectedOverlayRegion()) return true;
    return isRecommendedOverlay(overlay);
  }

  function isGlobalOverlay(overlay) {
    return overlay.mode === "parcel" || (!overlay.provider && !overlay.council);
  }

  function hasDetectedOverlayRegion() {
    return Boolean(state.locationCheck.councils.length || state.locationCheck.providers.length);
  }

  function getOverlayTree(overlays = state.overlays) {
    const groups = new Map();
    overlays.forEach((overlay) => {
      const groupName = getOverlayOwnerName(overlay);
      const groupKey = `group:${normalizeTreeKey(groupName)}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          name: groupName,
          categories: new Map(),
          overlays: [],
        });
      }

      const group = groups.get(groupKey);
      const categoryName = getOverlayCategoryName(overlay);
      const categoryKey = `${groupKey}:category:${normalizeTreeKey(categoryName)}`;
      if (!group.categories.has(categoryKey)) {
        group.categories.set(categoryKey, {
          key: categoryKey,
          name: categoryName,
          overlays: [],
        });
      }
      const category = group.categories.get(categoryKey);
      category.overlays.push(overlay);
      group.overlays.push(overlay);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      categories: Array.from(group.categories.values()),
    }));
  }

  function findOverlayTreeSection(sectionKey) {
    for (const group of getOverlayTree(getLayerManagerOverlays())) {
      if (group.key === sectionKey) return group;
      const category = group.categories.find((item) => item.key === sectionKey);
      if (category) return category;
    }
    return null;
  }

  function getOverlayTreeToggleState(section) {
    const overlays = section.overlays || [];
    const enabledCount = overlays.filter((overlay) => overlay.enabled).length;
    const allEnabled = overlays.length > 0 && enabledCount === overlays.length;
    const mixed = enabledCount > 0 && enabledCount < overlays.length;
    return {
      icon: allEnabled ? "fa-eye" : (mixed ? "fa-circle-half-stroke" : "fa-eye-slash"),
      mixed,
      label: `${allEnabled ? "Hide" : "Show"} all ${section.name} overlays`,
    };
  }

  function getOverlayOwnerName(overlay) {
    if (overlay.provider) return overlay.provider;
    if (overlay.council) return getOverlayCouncilLabel(overlay.council);
    return overlay.group || "Base context";
  }

  function getOverlayCouncilLabel(council) {
    const labels = {
      Brisbane: "Brisbane City Council",
      Bundaberg: "Bundaberg Regional Council",
      "Gold Coast": "Gold Coast City Council",
      Gympie: "Gympie Regional Council",
      Logan: "Logan City Council",
      "Moreton Bay": "Moreton Bay City Council",
      "North Burnett": "North Burnett Regional Council",
      Noosa: "Noosa Shire Council",
      "Port Macquarie-Hastings": "Port Macquarie-Hastings Council",
      Redland: "Redland City Council",
      "South Burnett": "South Burnett Regional Council",
      "Sunshine Coast": "Sunshine Coast Regional Council",
      Toowoomba: "Toowoomba Regional Council",
      Tweed: "Tweed Shire Council",
    };
    return labels[council] || `${council} Council`;
  }

  function getOverlayCategoryName(overlay) {
    if (overlay.mode === "parcel") return "Cadastre";
    const names = {
      water: "Water",
      sewer: "Sewer",
      stormwater: "Stormwater",
      transport: "Transport",
      surface: "Surface",
    };
    return names[overlay.serviceKind] || "Reference";
  }

  function shouldOpenOverlaySection(section) {
    if (state.overlayClosedSections.has(section.key)) return false;
    if (state.overlayOpenSections.has(section.key)) return true;
    return section.overlays.some((overlay) => overlay.enabled || isRecommendedOverlay(overlay));
  }

  function getOverlayTreeCountText(section) {
    const active = section.overlays.filter((overlay) => overlay.enabled).length;
    return active ? `${active}/${section.overlays.length}` : String(section.overlays.length);
  }

  function normalizeTreeKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function isRecommendedOverlay(overlay) {
    return Boolean(
      isOverlayRelevantToLoadedAssets(overlay)
      && (
        (overlay.provider && isRecommendedOverlayProvider(overlay.provider))
        || (overlay.council && isRecommendedOverlayCouncil(overlay.council))
      )
    );
  }

  function isOverlayRelevantToLoadedAssets(overlay) {
    if (overlay.mode === "parcel") return true;
    if (!overlay.serviceKind) return true;
    return state.assetKinds.has(overlay.serviceKind);
  }

  function shouldAutoEnableRecommendedOverlay(overlay) {
    return !isRoadCentrelineOverlay(overlay);
  }

  function isRoadCentrelineOverlay(overlay) {
    if (overlay.serviceKind !== "transport") return false;
    const text = `${overlay.id || ""} ${overlay.name || ""}`.toLowerCase();
    return /\broad[-\s_]*(?:centre|center)[-\s_]*lines?\b/.test(text)
      || /\broad[-\s_]*centrelines?\b/.test(text)
      || /\broad[-\s_]*register\b/.test(text);
  }

  function getOverlayStatusText(overlay) {
    if (!overlay.enabled && isRecommendedOverlay(overlay)) return "Recommended for this file";
    if (overlay.status && overlay.status !== "Ready") return overlay.status;
    if (isRecommendedOverlay(overlay)) return "Recommended for this file";
    return overlay.status || overlay.source;
  }

  function isRecommendedOverlayProvider(provider) {
    return state.locationCheck.providers.some((item) => normalizeAuthorityName(item) === normalizeAuthorityName(provider));
  }

  function isRecommendedOverlayCouncil(council) {
    return state.locationCheck.councils.some((item) => normalizeCouncilKey(item) === normalizeCouncilKey(council));
  }

  function getAssetKindsForFeatures(features) {
    const kinds = new Set();
    features.forEach((feature) => {
      const layer = String(feature.layer || "").toLowerCase();
      if (layer === "water") kinds.add("water");
      else if (layer === "sewer") kinds.add("sewer");
      else if (layer === "stormwater") kinds.add("stormwater");
      else if (layer === "transport") kinds.add("transport");
      else if (layer === "surface" || layer === "openspace") kinds.add("surface");
      else if (layer === "cadastre") kinds.add("cadastre");
    });
    return kinds;
  }

  function renderChecks() {
    const checks = buildChecks();
    els.checkCount.textContent = `${checks.length} check${checks.length === 1 ? "" : "s"}`;
    els.checkList.innerHTML = "";
    checks.forEach((check) => {
      const item = document.createElement("li");
      item.className = `viewer-checks__item viewer-checks__item--${check.tone}`;
      item.innerHTML = `<i class="fa-solid ${check.icon}" aria-hidden="true"></i><span>${escapeHtml(check.text)}</span>`;
      els.checkList.appendChild(item);
    });
  }

  function renderDetails() {
    const feature = state.features.find((item) => item.uid === state.selectedId);
    if (!feature && state.selectedOverlayFeature) {
      renderOverlayDetails(state.selectedOverlayFeature);
      return;
    }
    if (!feature) {
      if (shouldShowValidationPanel()) {
        els.details.innerHTML = `<span>Fix the schema validation errors before inspecting asset attributes.</span>`;
        return;
      }
      els.details.innerHTML = `<span>Select an asset to inspect its XML attributes and geometry summary.</span>`;
      return;
    }

    const detailAttributes = state.showAllDetails ? (feature.fullAttributes || feature.attributes) : feature.attributes;
    const detailEntries = getDetailAttributeEntries(detailAttributes, { includeAll: state.showAllDetails });
    const compactLevels = extractCompactLevelEntries(detailEntries);
    const rows = renderDetailEntriesWithLevels(compactLevels.entries, compactLevels.html);
    const sourceFileRow = state.loadedFiles.length > 1
      ? `<div><dt>Source file</dt><dd>${escapeHtml(feature.sourceFile || state.fileName || "Loaded XML")}</dd></div>`
      : "";

    els.details.innerHTML = `
      <div class="viewer-details__header">
        <span>${escapeHtml(feature.layer)}</span>
        <div class="viewer-details__title-row">
          <h2>${escapeHtml(getFeatureDetailsTitle(feature))}</h2>
          ${renderAllDetailsToggle()}
        </div>
      </div>
      <dl class="viewer-details__grid">
        <div><dt>Status</dt><dd>${escapeHtml(feature.status)}</dd></div>
        ${sourceFileRow}
        ${rows}
        ${renderGeometryDetails(feature)}
      </dl>
    `;
  }

  function renderAllDetailsToggle() {
    return `
      <label class="viewer-details-toggle" data-role="all-details-control">
        <input type="checkbox" data-role="all-details-toggle" ${state.showAllDetails ? "checked" : ""} />
        <span>Show all</span>
      </label>
    `;
  }

  function extractCompactLevelEntries(entries) {
    const levelOrder = ["USSL", "DSSL", "USIL", "DSIL"];
    const levelValues = new Map();
    const remainingEntries = [];
    entries.forEach((entry) => {
      const key = getCompactLevelKey(entry.label);
      if (key) {
        if (!levelValues.has(key)) levelValues.set(key, entry.value);
      } else {
        remainingEntries.push(entry);
      }
    });
    if (!levelValues.size) return { entries, html: "" };
    const cells = levelOrder.map((key) => `
      <div class="viewer-level-grid__cell">
        <span>${escapeHtml(key)}</span>
        <strong>${escapeHtml(formatDetailValue(levelValues.get(key)))}</strong>
      </div>
    `).join("");
    const gridHtml = `<div class="viewer-level-grid">${cells}</div>`;
    return {
      entries: remainingEntries,
      gridHtml,
      html: `
        <div class="viewer-level-row">
          <dt>Levels</dt>
          <dd>${gridHtml}</dd>
        </div>
      `,
    };
  }

  function renderDetailEntriesWithLevels(entries, levelsHtml = "") {
    if (!levelsHtml) return entries.map(renderDetailEntry).join("");
    const pipeIndex = entries.findIndex((entry) => isPipeStructureDetailLabel(entry.label));
    if (pipeIndex < 0) return `${levelsHtml}${entries.map(renderDetailEntry).join("")}`;
    return entries
      .map((entry, index) => `${renderDetailEntry(entry)}${index === pipeIndex ? levelsHtml : ""}`)
      .join("");
  }

  function renderDetailEntry(entry) {
    return `<div><dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(formatDetailValue(entry.value))}</dd></div>`;
  }

  function isPipeStructureDetailLabel(label) {
    return normalizeDetailKey(label) === "pipestructure";
  }

  function getCompactLevelKey(label) {
    const normalized = normalizeDetailKey(label);
    if (normalized === "ussl") return "USSL";
    if (normalized === "dssl") return "DSSL";
    if (normalized === "usil") return "USIL";
    if (normalized === "dsil") return "DSIL";
    return "";
  }

  function getFeatureDetailsTitle(feature) {
    const id = formatReportValue(feature.id);
    const type = formatReportValue(feature.type);
    if (usesIdOnlyDetailsTitle(feature)) return id || type || "Asset";
    if (type && id) return `${type} ${id}`;
    return type || id || "Asset";
  }

  function usesIdOnlyDetailsTitle(feature) {
    return /^(cadastre|surface|transport)$/i.test(String(feature?.layer || ""))
      || /^(cadastre|surface|transport)\//i.test(String(feature?.assetPath || ""));
  }

  function getDetailAttributeEntries(attributes = {}, options = {}) {
    const entries = Object.entries(attributes)
      .filter(([key]) => options.includeAll || shouldShowStandardDetailAttribute(key));
    if (options.includeAll) {
      return entries.map(([key, value]) => ({
        label: formatDetailLabel(key),
        value,
      }));
    }

    const adacEntry = entries.find(([key]) => normalizeDetailKey(key) === "adacid");
    const pitEntry = entries.find(([key]) => normalizeDetailKey(key) === "pitnumber");
    const combinePitNumber = Boolean(
      adacEntry
      && pitEntry
      && normalizeDetailValue(adacEntry[1]) === normalizeDetailValue(pitEntry[1])
    );

    return entries
      .filter(([key]) => !(combinePitNumber && normalizeDetailKey(key) === "pitnumber"))
      .map(([key, value]) => ({
        label: combinePitNumber && normalizeDetailKey(key) === "adacid"
          ? "ADAC ID / PIT Number"
          : formatDetailLabel(key),
        value,
      }));
  }

  function shouldShowStandardDetailAttribute(key) {
    const normalized = normalizeDetailKey(key);
    return normalized !== "rotation"
      && normalized !== "status"
      && normalized !== "lifecyclestatus"
      && normalized !== "constructionstatus";
  }

  function normalizeDetailKey(value) {
    return cleanName(value).replace(/[^a-z0-9]+/gi, "").toLowerCase();
  }

  function normalizeDetailValue(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function formatDetailValue(value) {
    const text = String(value ?? "").trim();
    return text || "—";
  }

  function renderGeometryDetails(feature) {
    const pointCount = feature.points.length;
    const pointLabel = `${feature.geometryKind} (${pointCount} ${pointCount === 1 ? "pt" : "pts"})`;
    if (!pointCount) {
      return `<div><dt>Geometry</dt><dd>${escapeHtml(pointLabel)}</dd></div>`;
    }

    if (pointCount === 1) {
      return `
        <div>
          <dt>Geometry</dt>
          <dd>
            <span class="viewer-coordinate-line">${escapeHtml(formatCoordinateTriple(feature.points[0]))}</span>
          </dd>
        </div>
      `;
    }

    const coordinateItems = feature.points
      .map((point, index) => `<li><strong>${index + 1}</strong> ${escapeHtml(formatCoordinateTriple(point))}</li>`)
      .join("");
    return `
      <div class="viewer-details__geometry">
        <dt>Geometry</dt>
        <dd>
          <details class="viewer-coordinate-list">
            <summary>${escapeHtml(pointLabel)}</summary>
            <ol>${coordinateItems}</ol>
          </details>
        </dd>
      </div>
    `;
  }

  function renderOverlayDetails(selection) {
    const overlay = selection.overlay;
    const feature = selection.feature;
    const props = feature.properties || {};
    const title = getOverlayFeatureTitle(overlay, feature);
    const rows = Object.entries(props)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
      .slice(0, 14)
      .map(([key, value]) => `<div><dt>${escapeHtml(formatDetailLabel(key))}</dt><dd>${escapeHtml(value)}</dd></div>`)
      .join("");

    els.details.innerHTML = `
      <div class="viewer-details__header">
        <span>${escapeHtml(overlay.provider || overlay.council || overlay.source || "Reference")}</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(overlay.name)} reference asset</p>
      </div>
      <dl class="viewer-details__grid">
        <div><dt>Source</dt><dd>${escapeHtml(overlay.source)}</dd></div>
        <div><dt>Geometry</dt><dd>${escapeHtml(getOverlayGeometryLabel(feature.geometry))}</dd></div>
        ${rows || "<div><dt>Attributes</dt><dd>No public attributes returned.</dd></div>"}
      </dl>
    `;
  }

  function buildChecks() {
    if (!state.features.length) {
      if (state.validationErrorResults.length) {
        return buildSchemaValidationFailureChecks();
      }
      return [{ tone: "muted", icon: "fa-circle-info", text: "Waiting for an ADAC XML file." }];
    }

    const checks = [];
    const missingIds = state.features.filter((feature) => !feature.id).length;
    const singlePointLines = state.features.filter((feature) => feature.points.length === 1 && /pipe|main|road|line|kerb/i.test(feature.type)).length;
    const unknownLayers = state.features.filter((feature) => feature.layer === "Other").length;

    checks.push({ tone: "good", icon: "fa-check", text: "XML parsed successfully in browser." });
    if (state.repairPreview?.active) {
      checks.push({
        tone: "warn",
        icon: "fa-triangle-exclamation",
        text: `Previewing a viewer-repaired copy of ${state.repairPreview.originalFileName || "the uploaded XML"}. The original file was not changed.`,
      });
      if (!state.repairPreview.validationPassed && Array.isArray(state.repairPreview.remainingErrors)) {
        state.repairPreview.remainingErrors.slice(0, 3).forEach((error) => {
          const details = formatValidationErrorDetails(error);
          checks.push({
            tone: "warn",
            icon: "fa-triangle-exclamation",
            text: `Step 2 ${formatValidationErrorLocation(error)}: ${details.title}`,
          });
        });
      }
    }
    checks.push(getSchemaValidationCheckItem());
    if (state.validationErrorResults.length) {
      checks.push(...buildSchemaValidationFailureChecks());
    }
    checks.push({ tone: "good", icon: "fa-check", text: `${state.features.length} mapped assets found.` });
    checks.push(getLocationCheckItem());

    if (missingIds) {
      checks.push({ tone: "warn", icon: "fa-triangle-exclamation", text: `${missingIds} assets may be missing IDs.` });
    }
    if (singlePointLines) {
      checks.push({ tone: "warn", icon: "fa-triangle-exclamation", text: `${singlePointLines} line assets only have one mapped point.` });
    }
    if (unknownLayers) {
      checks.push({ tone: "muted", icon: "fa-circle-info", text: `${unknownLayers} assets could not be confidently layered.` });
    }
    if (!missingIds && !singlePointLines) {
      checks.push({ tone: "good", icon: "fa-check", text: "Asset IDs and geometry passed the quick checks." });
    }

    return checks;
  }

  function getSchemaValidationCheckItem() {
    if (state.repairPreview?.active) {
      if (state.repairPreview.validationPassed) {
        return {
          tone: "warn",
          icon: "fa-triangle-exclamation",
          text: "The repaired preview passed schema validation, but the original uploaded XML still failed.",
        };
      }
      return {
        tone: "warn",
        icon: "fa-triangle-exclamation",
        text: `The repaired preview is parseable but still has ${state.repairPreview.remainingErrorCount || 0} schema warning${(state.repairPreview.remainingErrorCount || 0) === 1 ? "" : "s"}.`,
      };
    }
    const validResults = state.schemaValidationResults.filter((result) => result.valid);
    if (!validResults.length) {
      return { tone: "muted", icon: "fa-circle-info", text: "ADAC schema validation has not run for the loaded files." };
    }
    const versions = Array.from(new Set(validResults.map((result) => result.schemaVersion || result.schemaLabel).filter(Boolean)));
    const versionText = versions.length ? ` (${versions.join(", ")})` : "";
    return {
      tone: "good",
      icon: "fa-check",
      text: `ADAC schema validation passed for ${validResults.length} file${validResults.length === 1 ? "" : "s"}${versionText}.`,
    };
  }

  function buildSchemaValidationFailureChecks() {
    const failedCount = state.validationErrorResults.length;
    const checks = [{
      tone: "warn",
      icon: "fa-triangle-exclamation",
      text: `${failedCount} uploaded XML file${failedCount === 1 ? "" : "s"} failed validation and were not loaded.`,
    }];
    state.validationErrorResults.slice(0, 3).forEach((result) => {
      const firstError = normalizeValidationErrors(result.errors)[0];
      checks.push({
        tone: "warn",
        icon: "fa-triangle-exclamation",
        text: `${result.fileName || "Uploaded XML"}: ${formatValidationErrorMessage(firstError)}`,
      });
    });
    if (state.validationErrorResults.length > 3) {
      checks.push({
        tone: "muted",
        icon: "fa-circle-info",
        text: `${state.validationErrorResults.length - 3} more failed file${state.validationErrorResults.length - 3 === 1 ? "" : "s"} not shown.`,
      });
    }
    return checks;
  }

  function getLocationCheckItem() {
    const check = state.locationCheck;
    if (!state.fileMeta.receiver) {
      return { tone: "muted", icon: "fa-circle-info", text: "No Receiver field was found to compare against the mapped location." };
    }
    if (check.status === "checking") {
      return { tone: "muted", icon: "fa-circle-info", text: `Checking ${state.fileMetas.length > 1 ? "receivers" : "receiver"} ${formatQuotedList(getActiveReceivers())} against the mapped council area...` };
    }
    if (check.status === "match") {
      return { tone: "good", icon: "fa-check", text: check.message };
    }
    if (check.status === "mismatch") {
      return { tone: "warn", icon: "fa-triangle-exclamation", text: check.message };
    }
    if (check.status === "not-georeferenced") {
      return { tone: "muted", icon: "fa-circle-info", text: "Receiver location check needs MGA or longitude/latitude coordinates." };
    }
    if (check.status === "unavailable") {
      return { tone: "muted", icon: "fa-circle-info", text: check.message || "Receiver location check is temporarily unavailable." };
    }
    return { tone: "muted", icon: "fa-circle-info", text: `${state.fileMetas.length > 1 ? "Receivers" : "Receiver"} found: ${formatQuotedList(getActiveReceivers())}.` };
  }

  function drawMap() {
    updateMapModeButtons();
    updateLabelModeUi();

    const width = els.canvas.clientWidth || els.canvas.width;
    const height = els.canvas.clientHeight || els.canvas.height;
    const dpr = window.devicePixelRatio || 1;

    updateCanvasStateAttributes();
    els.canvas.width = Math.max(320, Math.floor(width * dpr));
    els.canvas.height = Math.max(240, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    state.labelHitBoxes = [];
    state.labelHitBoxesByGroup = new Map();
    state.labelObstacleCache = createLabelObstacleCache();
    state.projectedFeatureCache = null;

    const features = state.filteredFeatures;
    if (!features.length) {
      drawGrid(width, height);
      renderMeasurementUi();
      return;
    }

    const transform = getActiveMapTransform(features, width, height);
    state.projectedFeatureCache = new Map();
    if (state.mapMode === "grid" || !transform || transform.type !== "geo") {
      drawGrid(width, height);
    } else {
      drawTileBasemap(width, height, transform);
    }

    if (transform && transform.type === "geo") {
      drawArcgisOverlays(width, height, transform);
      scheduleOverlayQueries(transform);
    }

    getFeaturesForMapDrawing(features).forEach((feature) => {
      drawAssetFeature(feature, transform);
    });
    drawMeasurementOverlay(transform);
    renderMeasurementUi();
  }

  function getFeaturesForMapDrawing(features) {
    if (
      state.drawOrderCache
      && state.drawOrderCache.features === features
      && state.drawOrderCache.selectedId === state.selectedId
    ) {
      return state.drawOrderCache.result;
    }
    const result = features
      .map((feature, index) => ({ feature, index }))
      .sort((a, b) => getGeometryDrawRank(a.feature.geometryKind) - getGeometryDrawRank(b.feature.geometryKind) || getPlanDrawOrder(a.feature) - getPlanDrawOrder(b.feature) || getSelectionDrawRank(a.feature) - getSelectionDrawRank(b.feature) || a.index - b.index)
      .map((item) => item.feature);
    state.drawOrderCache = {
      features,
      selectedId: state.selectedId,
      result,
    };
    return result;
  }

  function getProjectedFeatureScreenPairs(feature, transform) {
    if (!feature) return [];
    if (state.projectedFeatureCache?.has(feature.uid)) {
      return state.projectedFeatureCache.get(feature.uid);
    }
    const pairs = (feature.points || [])
      .map((sourcePoint) => ({
        sourcePoint,
        screenPoint: projectFeaturePoint(sourcePoint, transform),
      }))
      .filter((pair) => Boolean(pair.screenPoint));
    if (state.projectedFeatureCache) {
      state.projectedFeatureCache.set(feature.uid, pairs);
    }
    return pairs;
  }

  function getProjectedFeatureScreenPoints(feature, transform) {
    return getProjectedFeatureScreenPairs(feature, transform).map((pair) => pair.screenPoint);
  }

  function drawAssetFeature(feature, transform) {
    const style = getPlanStyleForFeature(feature);
    const color = style.color;
    const isSelected = state.selectedId === feature.uid;
    const screenPointPairs = getProjectedFeatureScreenPairs(feature, transform);
    const points = screenPointPairs.map((pair) => pair.screenPoint);
    if (!points.length) return;
    const dash = getPlanDashForFeature(feature, style);
    const lineWidth = getPlanLineWidthPx(style, isSelected);

    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = isSelected ? 1 : 0.86;

    if (points.length > 1) {
      if (style.key === "water_pipe" && isWaterConduit(feature.attributes)) {
        const conduitPaths = getOffsetScreenPaths(points, conduitParallelOffsetPx);
        if (isSelected) {
          conduitPaths.forEach((path) => {
            drawSelectedPathHighlight(path, { dash, lineWidth });
          });
        }
        conduitPaths.forEach((path) => {
          drawStyledScreenPath(path, {
            closePath: false,
            dash,
            lineWidth,
            stroke: color,
          });
        });
      } else {
        if (isSelected && (isPipePlanStyle(style) || feature.geometryKind === "Polygon")) {
          drawSelectedPathHighlight(points, {
            closePath: feature.geometryKind === "Polygon",
            dash,
            lineWidth,
          });
        }
        drawStyledScreenPath(points, {
          closePath: feature.geometryKind === "Polygon",
          dash,
          fill: feature.geometryKind === "Polygon" && !isOutlineOnlyPolygonFeature(feature, style) ? (style.fill || color) : "",
          fillAlpha: style.fill ? (isSelected ? 0.42 : 0.28) : (isSelected ? 0.16 : 0.1),
          lineWidth,
          stroke: color,
        });
      }
    }

    if (feature.geometryKind === "Point") {
      screenPointPairs.forEach((pair) => drawPointMarker(pair.screenPoint, feature, isSelected, points, transform, pair.sourcePoint));
    } else if (isSelected) {
      drawEndpointMarker(points[0]);
      drawEndpointMarker(points[points.length - 1]);
    }

    if (state.labelMode !== "off" && shouldShowFeatureLabel(feature)) {
      const labelLines = getFeatureLabelLines(feature);
      const labelPlacement = getOptimizedLabelPlacement(feature, points, transform, labelLines);
      if (labelPlacement && labelPlacement.point) {
        const adjustedLabelPlacement = getCollisionAdjustedLabelPlacement(feature, labelPlacement, labelLines, transform);
        if (shouldDrawFeatureLabelLeader(feature, labelLines)) {
          drawLabelLeader(getFeatureLabelLeaderStart(feature, points, adjustedLabelPlacement.point), adjustedLabelPlacement.point, labelLines, isSelected, {
            anchor: adjustedLabelPlacement.anchor,
            color,
            rotation: adjustedLabelPlacement.rotation,
            scaleMultiplier: adjustedLabelPlacement.scaleMultiplier,
          });
        }
        drawLabel(labelLines, adjustedLabelPlacement.point.x, adjustedLabelPlacement.point.y, isSelected, feature.uid, {
          anchor: adjustedLabelPlacement.anchor,
          collisionGroup: adjustedLabelPlacement.collisionGroup,
          rotation: adjustedLabelPlacement.rotation,
          scaleMultiplier: adjustedLabelPlacement.scaleMultiplier,
        });
      }
    }
    ctx.restore();
  }

  function getOptimizedLabelPlacement(feature, screenPoints, transform, labelLines) {
    const fallbackPoint = screenPoints[Math.floor(screenPoints.length / 2)];
    if (!fallbackPoint) return null;

    if (isLotLabelFeature(feature)) {
      return getInLotLabelPlacement(screenPoints, labelLines, {
        fallbackPoint,
      });
    }

    if (isHouseConnectionLabelFeature(feature)) {
      const linkedLot = findLinkedLotForConnection(feature);
      if (linkedLot) {
        const lotScreenPoints = getProjectedFeatureScreenPoints(linkedLot, transform);
        if (lotScreenPoints.length > 2) {
          return getInLotLabelPlacement(lotScreenPoints, labelLines, {
            fallbackPoint,
            target: fallbackPoint,
          });
        }
      }
    }

    if (isWaterMeterLabelFeature(feature)) {
      const linkedLot = findLinkedLotForMeter(feature);
      if (linkedLot) {
        const lotScreenPoints = getProjectedFeatureScreenPoints(linkedLot, transform);
        const placement = getWaterMeterSerialPlacement(feature, fallbackPoint, lotScreenPoints, transform, labelLines);
        if (placement) return placement;
      }
    }

    if (isWaterPipeLabelFeature(feature)) {
      const placement = getInlinePipeLabelPlacement(screenPoints);
      if (placement) return placement;
    }

    if (isOffsetPipeLabelFeature(feature)) {
      const midpoint = getScreenPathMidpoint(screenPoints);
      if (midpoint) {
        return {
          point: midpoint,
          anchor: "offset",
        };
      }
    }

    return {
      point: fallbackPoint,
      anchor: isFittingLabelFeature(feature)
        ? "fitting-offset"
        : (feature.geometryKind === "Point" ? "point-offset" : "offset"),
    };
  }

  function getCollisionAdjustedLabelPlacement(feature, placement, labelLines, transform) {
    const collisionGroup = getFeatureLabelCollisionGroup(feature);
    if (!placement?.point) return { ...placement, collisionGroup };
    const peers = collisionGroup ? (state.labelHitBoxesByGroup.get(collisionGroup) || []) : [];
    const assetObstacles = collisionGroup ? getLabelAssetObstacles(collisionGroup, transform) : [];
    const lotObstacles = shouldAvoidLotLabelPlacement(feature) ? getLabelLotObstacles(transform) : [];
    if (!peers.length && !assetObstacles.length && !lotObstacles.length) return { ...placement, collisionGroup };

    const metrics = getCanvasLabelMetrics(labelLines, placement.scaleMultiplier || 1);
    if (!metrics.labelLines.length) return { ...placement, collisionGroup };

    const candidates = getLabelCollisionCandidates(placement, metrics);
    let best = null;
    for (const candidate of candidates) {
      const hitBox = getLabelHitBox(candidate.point.x, candidate.point.y, metrics, candidate);
      const score = peers.reduce((total, box) => total + getRectOverlapArea(hitBox, box), 0)
        + getAssetObstacleOverlapScore(hitBox, assetObstacles)
        + getLotObstacleOverlapScore(hitBox, lotObstacles);
      if (!best || score < best.score) {
        best = { placement: candidate, score };
      }
      if (score <= 0) break;
    }
    return {
      ...placement,
      ...(best?.placement || {}),
      collisionGroup,
    };
  }

  function getFeatureLabelCollisionGroup(feature) {
    const path = normalizePlanAssetPath(feature?.assetPath);
    const styleKey = feature?.planStyleKey || getPlanStyleKeyForAssetPath(feature?.assetPath);
    if (path.startsWith("watersupply/") || String(styleKey || "").startsWith("water_")) return "water";
    if (path.startsWith("sewerage/") || String(styleKey || "").startsWith("sewer_")) return "sewer";
    if (path.startsWith("stormwater/") || String(styleKey || "").startsWith("stormwater_")) return "stormwater";
    return "";
  }

  function createLabelObstacleCache() {
    return {
      assetGroups: new Map(),
      lotObstacles: null,
    };
  }

  function getLabelAssetObstacles(collisionGroup, transform) {
    if (!collisionGroup) return [];
    if (state.labelObstacleCache?.assetGroups?.has(collisionGroup)) {
      return state.labelObstacleCache.assetGroups.get(collisionGroup);
    }
    const obstacles = state.filteredFeatures
      .filter((feature) => getFeatureLabelCollisionGroup(feature) === collisionGroup)
      .map((feature) => {
        const points = getProjectedFeatureScreenPoints(feature, transform);
        if (!points.length) return null;
        return {
          kind: feature.geometryKind,
          points,
          bounds: getScreenPointRectBounds(points),
        };
      })
      .filter(Boolean);
    if (state.labelObstacleCache?.assetGroups) {
      state.labelObstacleCache.assetGroups.set(collisionGroup, obstacles);
    }
    return obstacles;
  }

  function shouldAvoidLotLabelPlacement(feature) {
    if (isLotLabelFeature(feature)) return false;
    if (isOpenSpaceRelatedLabelFeature(feature)) return false;
    if (isHouseConnectionLabelFeature(feature)) return !findLinkedLotForConnection(feature);
    if (isWaterMeterLabelFeature(feature)) return !findLinkedLotForMeter(feature);
    return true;
  }

  function isOpenSpaceRelatedLabelFeature(feature) {
    const path = normalizePlanAssetPath(feature?.assetPath);
    const styleKey = feature?.planStyleKey || getPlanStyleKeyForFeature(feature);
    return path.startsWith("openspace/")
      || path.startsWith("electrical/")
      || path.startsWith("communication/")
      || path.startsWith("communications/")
      || path.startsWith("telecommunications/")
      || String(styleKey || "").startsWith("open_space_");
  }

  function getLabelLotObstacles(transform) {
    if (state.labelObstacleCache && Array.isArray(state.labelObstacleCache.lotObstacles)) {
      return state.labelObstacleCache.lotObstacles;
    }
    const obstacles = state.filteredFeatures
      .filter(isLotLabelFeature)
      .map((feature) => {
        const points = getProjectedFeatureScreenPoints(feature, transform);
        if (points.length < 3) return null;
        return {
          points,
          bounds: getScreenPointRectBounds(points),
        };
      })
      .filter(Boolean);
    if (state.labelObstacleCache) {
      state.labelObstacleCache.lotObstacles = obstacles;
    }
    return obstacles;
  }

  function getLotObstacleOverlapScore(hitBox, lotObstacles) {
    if (!hitBox || !lotObstacles?.length) return 0;
    const padded = expandRect(hitBox, Math.max(1, getMapLabelScale() * 0.4));
    let score = 0;
    lotObstacles.forEach((lot) => {
      if (!rectsOverlap(padded, lot.bounds)) return;
      if (rectCenterInPolygon(padded, lot.points)) score += 70000;
      const corners = getRectCorners(padded);
      const insideCorners = corners.filter((corner) => isPointInPolygon(corner, lot.points)).length;
      if (insideCorners) score += insideCorners * 22000;
      if (pathIntersectsRect(lot.points, padded, true)) score += 8000;
    });
    return score;
  }

  function getAssetObstacleOverlapScore(hitBox, obstacles) {
    if (!hitBox || !obstacles?.length) return 0;
    const padded = expandRect(hitBox, Math.max(1.5, getMapLabelScale() * 0.7));
    let score = 0;
    obstacles.forEach((obstacle) => {
      if (!rectsOverlap(padded, obstacle.bounds)) return;
      if (obstacle.kind === "Point") {
        if (obstacle.points.some((point) => rectContainsPoint(padded, point))) score += 45000;
        return;
      }
      if (pathIntersectsRect(obstacle.points, padded, obstacle.kind === "Polygon")) {
        score += obstacle.kind === "Polygon" ? 22000 : 30000;
      }
      if (obstacle.kind === "Polygon" && rectCenterInPolygon(padded, obstacle.points)) score += 16000;
    });
    return score;
  }

  function getScreenPointRectBounds(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  function expandRect(rect, amount) {
    return {
      x: rect.x - amount,
      y: rect.y - amount,
      width: rect.width + amount * 2,
      height: rect.height + amount * 2,
    };
  }

  function rectsOverlap(a, b) {
    if (!a || !b) return false;
    return Math.min(a.x + a.width, b.x + b.width) >= Math.max(a.x, b.x)
      && Math.min(a.y + a.height, b.y + b.height) >= Math.max(a.y, b.y);
  }

  function rectContainsPoint(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.width
      && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function getRectCorners(rect) {
    return [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height },
    ];
  }

  function pathIntersectsRect(points, rect, closePath = false) {
    if (!Array.isArray(points) || !points.length) return false;
    if (points.some((point) => rectContainsPoint(rect, point))) return true;
    for (let index = 0; index < points.length - 1; index += 1) {
      if (segmentIntersectsRect(points[index], points[index + 1], rect)) return true;
    }
    return closePath && points.length > 2 ? segmentIntersectsRect(points[points.length - 1], points[0], rect) : false;
  }

  function segmentIntersectsRect(start, end, rect) {
    const corners = getRectCorners(rect);
    return rectContainsPoint(rect, start)
      || rectContainsPoint(rect, end)
      || corners.some((corner, index) => segmentsIntersect(start, end, corner, corners[(index + 1) % corners.length]));
  }

  function segmentsIntersect(a, b, c, d) {
    const abC = signedArea(a, b, c);
    const abD = signedArea(a, b, d);
    const cdA = signedArea(c, d, a);
    const cdB = signedArea(c, d, b);
    if (abC === 0 && pointOnSegment(c, a, b)) return true;
    if (abD === 0 && pointOnSegment(d, a, b)) return true;
    if (cdA === 0 && pointOnSegment(a, c, d)) return true;
    if (cdB === 0 && pointOnSegment(b, c, d)) return true;
    return abC * abD < 0 && cdA * cdB < 0;
  }

  function signedArea(a, b, c) {
    const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return Math.abs(value) < 1e-9 ? 0 : value;
  }

  function pointOnSegment(point, start, end) {
    return point.x >= Math.min(start.x, end.x) - 1e-9
      && point.x <= Math.max(start.x, end.x) + 1e-9
      && point.y >= Math.min(start.y, end.y) - 1e-9
      && point.y <= Math.max(start.y, end.y) + 1e-9;
  }

  function rectCenterInPolygon(rect, points) {
    return isPointInPolygon({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    }, points);
  }

  function getLabelCollisionCandidates(placement, metrics) {
    const point = placement.point;
    const scale = getMapLabelScale();
    const gap = Math.max(7 * scale, Math.min(28 * scale, Math.max(metrics.width, metrics.height) * 0.45));
    const anchor = placement.anchor || "offset";
    if (isCornerOffsetAnchor(anchor)) {
      const anchors = getCornerOffsetAnchors(anchor);
      return anchors.flatMap((candidateAnchor) => (
        [
          [0, 0],
          [gap * 0.45, 0],
          [-gap * 0.45, 0],
          [0, -gap * 0.45],
          [0, gap * 0.45],
        ].map(([dx, dy]) => ({
          ...placement,
          anchor: candidateAnchor,
          point: {
            x: point.x + dx,
            y: point.y + dy,
          },
        }))
      ));
    }
    const offsets = anchor === "center"
      ? [
        [0, 0],
        [gap, 0],
        [-gap, 0],
        [0, -gap],
        [0, gap],
        [gap, -gap],
        [-gap, -gap],
        [gap, gap],
        [-gap, gap],
      ]
      : [
        [0, 0],
        [gap * 0.8, 0],
        [0, -gap * 0.8],
        [gap * 0.8, -gap * 0.8],
        [-gap * 0.8, 0],
        [0, gap * 0.8],
        [gap * 1.35, 0],
        [0, -gap * 1.35],
        [-gap * 1.1, -gap * 0.8],
        [gap * 0.8, gap * 0.8],
      ];
    return offsets.map(([dx, dy]) => ({
      ...placement,
      point: {
        x: point.x + dx,
        y: point.y + dy,
      },
    }));
  }

  function isCornerOffsetAnchor(anchor) {
    return Boolean(getLabelOffsetAnchorParts(anchor));
  }

  function getCornerOffsetAnchors(preferredAnchor = "offset") {
    const parts = getLabelOffsetAnchorParts(preferredAnchor);
    if (!parts) return [preferredAnchor];
    const normalized = `${parts.base}-${parts.corner}`;
    return [
      normalized,
      `${parts.base}-sw`,
      `${parts.base}-nw`,
      `${parts.base}-se`,
      `${parts.base}-ne`,
    ].filter((anchor, index, anchors) => anchors.indexOf(anchor) === index);
  }

  function getLabelOffsetAnchorParts(anchor) {
    const normalized = String(anchor || "offset").trim();
    if (normalized === "offset") return { base: "offset", corner: "ne" };
    if (normalized === "point-offset") return { base: "point-offset", corner: "ne" };
    if (normalized === "fitting-offset") return { base: "fitting-offset", corner: "ne" };
    const match = normalized.match(/^(offset|point-offset|fitting-offset)-(ne|nw|se|sw)$/);
    return match ? { base: match[1], corner: match[2] } : null;
  }

  function getRectOverlapArea(a, b) {
    if (!a || !b) return 0;
    const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    return x * y;
  }

  function isLotLabelFeature(feature) {
    return feature?.geometryKind === "Polygon" && planPathStarts(feature, "cadastre/landparcels/lot");
  }

  function isHouseConnectionLabelFeature(feature) {
    return planPathStarts(feature, "sewerage/connections/");
  }

  function isWaterMeterLabelFeature(feature) {
    return planPathStarts(feature, "watersupply/meters/");
  }

  function isWaterPipeLabelFeature(feature) {
    return planPathStarts(feature, "watersupply/pipes/");
  }

  function isOffsetPipeLabelFeature(feature) {
    return planPathStarts(feature, "sewerage/pipes")
      || planPathStarts(feature, "stormwater/pipes/");
  }

  function shouldDrawFeatureLabelLeader(feature, labelLines) {
    if (!labelLines || !labelLines.length) return false;
    return isOffsetPipeLabelFeature(feature) || isWaterPointLabelLeaderFeature(feature);
  }

  function isWaterPointLabelLeaderFeature(feature) {
    if (feature?.geometryKind !== "Point") return false;
    const path = normalizePlanAssetPath(feature?.assetPath);
    const styleKey = feature?.planStyleKey || getPlanStyleKeyForAssetPath(feature?.assetPath);
    return path.startsWith("watersupply/")
      && !path.startsWith("watersupply/pipes/")
      && !path.startsWith("watersupply/waterservices/")
      && String(styleKey || "") !== "water_pipe"
      && String(styleKey || "") !== "water_service";
  }

  function getFeatureLabelLeaderStart(feature, points, labelPoint) {
    if (isOffsetPipeLabelFeature(feature)) return getClosestPointOnScreenPath(labelPoint, points);
    if (isWaterPointLabelLeaderFeature(feature)) return getClosestPointOnScreenPath(labelPoint, points);
    return null;
  }

  function getInlinePipeLabelPlacement(points) {
    const segment = getDominantLabelSegment(points);
    if (!segment) return null;
    return {
      point: segment.midpoint,
      anchor: "center",
      rotation: normalizeReadableLabelRotation(Math.atan2(segment.dy, segment.dx)),
    };
  }

  function getDominantLabelSegment(points) {
    if (!Array.isArray(points) || points.length < 2) return null;
    let best = null;
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length <= 1e-9) continue;
      if (!best || length > best.length) {
        best = {
          start,
          end,
          dx,
          dy,
          length,
          midpoint: {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
          },
        };
      }
    }
    return best;
  }

  function getScreenPathMidpoint(points) {
    if (!Array.isArray(points) || !points.length) return null;
    if (points.length === 1) return points[0];
    let totalLength = 0;
    const segments = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length <= 1e-9) continue;
      segments.push({ start, end, length });
      totalLength += length;
    }
    if (totalLength <= 1e-9) return points[Math.floor(points.length / 2)];
    let distance = totalLength / 2;
    for (const segment of segments) {
      if (distance <= segment.length) {
        const ratio = distance / segment.length;
        return {
          x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
          y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
        };
      }
      distance -= segment.length;
    }
    const last = segments[segments.length - 1];
    return last ? last.end : points[Math.floor(points.length / 2)];
  }

  function isFittingLabelFeature(feature) {
    const key = feature?.planStyleKey || getPlanStyleKeyForAssetPath(feature?.assetPath);
    return key === "water_fitting" || key === "sewer_fitting";
  }

  function findNearestLotForMeterSymbol(feature) {
    const linkedLot = findLinkedLotForMeter(feature);
    if (linkedLot) return linkedLot;

    return state.features
      .filter((item) => isLotLabelFeature(item) && item.sourceFileId === feature.sourceFileId)
      .map((lot) => ({ lot, distance: getFeatureToPolygonDistance(feature, lot) }))
      .filter((item) => Number.isFinite(item.distance))
      .sort((a, b) => a.distance - b.distance)[0]?.lot || null;
  }

  function findLinkedLotForMeter(feature) {
    const lots = state.features.filter((item) => isLotLabelFeature(item) && item.sourceFileId === feature.sourceFileId);
    if (!lots.length) return null;

    const reference = getFeatureLotReference(feature);
    if (reference.lotNo) {
      const matches = lots
        .filter((lot) => {
          const lotRef = getFeatureLotReference(lot);
          if (lotRef.lotNo !== reference.lotNo) return false;
          return !reference.planNo || !lotRef.planNo || lotRef.planNo === reference.planNo;
        })
        .sort((a, b) => getFeatureToPolygonDistance(feature, a) - getFeatureToPolygonDistance(feature, b));
      if (matches[0] && getFeatureToPolygonDistance(feature, matches[0]) <= 4) return matches[0];
    }

    return lots
      .map((lot) => ({ lot, distance: getFeatureToPolygonDistance(feature, lot) }))
      .filter((item) => item.distance <= 4)
      .sort((a, b) => a.distance - b.distance)[0]?.lot || null;
  }

  function getFeatureToPolygonDistance(feature, polygonFeature) {
    const points = feature.points || [];
    const ring = polygonFeature.points || [];
    if (!points.length || ring.length < 3) return Infinity;
    return Math.min(...points.map((point) => (
      isPointInPolygon(point, ring) ? 0 : getClosestSegmentDistance(point, ring, true)
    )));
  }

  function getInLotLabelPlacement(polygonPoints, labelLines, options = {}) {
    if (!polygonPoints || polygonPoints.length < 3) return null;
    const rotation = Number(options.rotation) || 0;
    const target = options.target || getPolygonInteriorLabelPoint(polygonPoints) || getPolygonBoundsCenter(polygonPoints);
    for (const scaleMultiplier of getInLotLabelScaleCandidates()) {
      const metrics = getCanvasLabelMetrics(labelLines, scaleMultiplier);
      const point = getLabelPointFullyInsidePolygon(polygonPoints, metrics, { target, rotation });
      if (point) {
        return {
          point,
          anchor: "center",
          rotation,
          scaleMultiplier,
        };
      }
    }

    const fallbackPoint = options.fallbackPoint
      || getPolygonInteriorPointNearTarget(polygonPoints, target)
      || getPolygonInteriorLabelPoint(polygonPoints)
      || getPolygonBoundsCenter(polygonPoints);
    return fallbackPoint
      ? {
        point: fallbackPoint,
        anchor: "center",
        rotation,
        scaleMultiplier: getInLotLabelScaleCandidates().at(-1) || 1,
      }
      : null;
  }

  function getInLotLabelScaleCandidates() {
    return [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.32, 0.25];
  }

  function getWaterMeterSerialPlacement(feature, anchor, lotScreenPoints, transform, labelLines) {
    if (!anchor || !lotScreenPoints || lotScreenPoints.length < 3) return null;
    const pipeTangent = getNearestWaterPipeTangent(feature, anchor, transform);
    const boundary = getWaterMeterLabelBoundary(anchor, lotScreenPoints, pipeTangent);
    const lotAnchor = getPolygonInteriorLabelPoint(lotScreenPoints) || getPolygonBoundsCenter(lotScreenPoints);
    if (!boundary || !lotAnchor) return null;
    const dx = boundary.end.x - boundary.start.x;
    const dy = boundary.end.y - boundary.start.y;
    const length = Math.hypot(dx, dy);
    if (length <= 1e-9) return null;
    const rotation = normalizeReadableLabelRotation(Math.atan2(dy, dx));
    const tangent = { x: dx / length, y: dy / length };
    let normal = { x: -tangent.y, y: tangent.x };
    const inward = { x: lotAnchor.x - boundary.projection.x, y: lotAnchor.y - boundary.projection.y };
    if (normal.x * inward.x + normal.y * inward.y < 0) normal = { x: -normal.x, y: -normal.y };
    const labelOffset = Math.max(10 * getMapLabelScale(), 6);
    const alongDistances = [0, labelOffset * 0.7, -labelOffset * 0.7, labelOffset * 1.35, -labelOffset * 1.35, labelOffset * 2, -labelOffset * 2];
    const inwardDistances = [labelOffset, labelOffset * 1.25, labelOffset * 1.5, labelOffset * 2];
    for (const scaleMultiplier of getInLotLabelScaleCandidates()) {
      const metrics = getCanvasLabelMetrics(labelLines, scaleMultiplier);
      for (const inwardDistance of inwardDistances) {
        for (const alongDistance of alongDistances) {
          const point = {
            x: boundary.projection.x + normal.x * inwardDistance + tangent.x * alongDistance,
            y: boundary.projection.y + normal.y * inwardDistance + tangent.y * alongDistance,
          };
          if (isLabelBoxInsidePolygon(point, metrics, lotScreenPoints, { rotation })) {
            return { point, anchor: "center", rotation, scaleMultiplier };
          }
        }
      }
    }

    return getInLotLabelPlacement(lotScreenPoints, labelLines, {
      fallbackPoint: getPolygonInteriorPointNearTarget(lotScreenPoints, anchor) || lotAnchor,
      target: anchor,
      rotation,
    });
  }

  function getNearestWaterPipeTangent(feature, anchor, transform) {
    let nearest = null;
    state.features
      .filter((item) => item.sourceFileId === feature.sourceFileId && planPathStarts(item, "watersupply/pipes/"))
      .filter((item) => {
        const values = getPlanLabelValues(item);
        const use = planLabelValue(values, ["Use", "PipeUse"]).trim().toLowerCase();
        return !["conduit", "service", "service pipe"].includes(use);
      })
      .forEach((pipe) => {
        const points = getProjectedFeatureScreenPoints(pipe, transform);
        for (let index = 0; index < points.length - 1; index += 1) {
          const start = points[index];
          const end = points[index + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy);
          if (length < 8) continue;
          const projection = projectPointToSegment(anchor, start, end);
          const distance = distanceBetween(anchor, projection);
          if (distance > 80) continue;
          if (!nearest || distance < nearest.distance) {
            nearest = {
              distance,
              tangent: { x: dx / length, y: dy / length },
            };
          }
        }
      });
    return nearest ? nearest.tangent : null;
  }

  function getWaterMeterLabelBoundary(anchor, lotScreenPoints, pipeTangent = null) {
    const segments = getPolygonSegmentsWithProjections(anchor, lotScreenPoints);
    if (!segments.length) return null;
    const maxLength = Math.max(...segments.map((segment) => segment.length));
    segments.sort((a, b) => compareWaterMeterBoundarySegments(a, b, maxLength, pipeTangent));
    return segments[0];
  }

  function compareWaterMeterBoundarySegments(a, b, maxLength, pipeTangent) {
    const scoreA = getWaterMeterBoundaryScore(a, maxLength, pipeTangent);
    const scoreB = getWaterMeterBoundaryScore(b, maxLength, pipeTangent);
    for (let index = 0; index < Math.min(scoreA.length, scoreB.length); index += 1) {
      if (scoreA[index] !== scoreB[index]) return scoreA[index] - scoreB[index];
    }
    return 0;
  }

  function getWaterMeterBoundaryScore(segment, maxLength, pipeTangent) {
    const lengthRank = segment.length >= maxLength * 0.55 ? 0 : 1;
    if (pipeTangent) {
      const parallelScore = Math.abs(segment.unit.x * pipeTangent.x + segment.unit.y * pipeTangent.y);
      const sideRank = parallelScore <= 0.55 ? 0 : 1;
      return [sideRank, lengthRank, segment.distance, parallelScore, -segment.length];
    }
    return [lengthRank, segment.distance, -segment.length];
  }

  function getPolygonSegmentsWithProjections(point, ring) {
    const segments = [];
    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length <= 1e-9) continue;
      const projection = projectPointToSegment(point, start, end);
      segments.push({
        start,
        end,
        projection,
        distance: distanceBetween(point, projection),
        length,
        unit: { x: dx / length, y: dy / length },
      });
    }
    return segments;
  }

  function normalizeReadableLabelRotation(rotation) {
    let angle = rotation;
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;
    return angle;
  }

  function getLabelPointFullyInsidePolygon(polygonPoints, labelMetrics, options = {}) {
    if (!polygonPoints || polygonPoints.length < 3 || !labelMetrics) return null;
    const rotation = Number(options.rotation) || 0;
    const target = options.target || getPolygonInteriorLabelPoint(polygonPoints) || getPolygonBoundsCenter(polygonPoints);
    const candidates = getPolygonInteriorLabelCandidates(polygonPoints, target);
    let best = null;
    let bestScore = -Infinity;
    candidates.forEach((candidate) => {
      if (!candidate || !isLabelBoxInsidePolygon(candidate, labelMetrics, polygonPoints, { rotation })) return;
      const edgeDistance = getClosestSegmentDistance(candidate, polygonPoints, true);
      const targetPenalty = target ? distanceBetween(candidate, target) * 0.08 : 0;
      const score = edgeDistance - targetPenalty;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });
    return best;
  }

  function getPolygonInteriorLabelCandidates(points, target = null) {
    const bounds = getPointBounds(points);
    if (!bounds) return [];
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);
    const steps = 14;
    const candidates = [
      target,
      getPolygonInteriorLabelPoint(points),
      getPolygonBoundsCenter(points),
      getPolygonCentroid(points),
    ].filter(Boolean);

    for (let row = 0; row <= steps; row += 1) {
      for (let column = 0; column <= steps; column += 1) {
        candidates.push({
          x: bounds.minX + (width * column) / steps,
          y: bounds.minY + (height * row) / steps,
        });
      }
    }
    return candidates.filter((candidate) => isPointInPolygon(candidate, points));
  }

  function isLabelBoxInsidePolygon(point, labelMetrics, polygonPoints, options = {}) {
    if (!point || !labelMetrics || !polygonPoints || polygonPoints.length < 3) return false;
    return getLabelBoxCorners(point.x, point.y, labelMetrics, {
      anchor: "center",
      rotation: Number(options.rotation) || 0,
    }).every((corner) => isPointInPolygon(corner, polygonPoints));
  }

  function projectPointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return { x: start.x, y: start.y };
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };
  }

  function getClosestPointOnPolygonBoundary(point, polygonPoints) {
    if (!point || !Array.isArray(polygonPoints) || polygonPoints.length < 2) return null;
    let best = null;
    let bestDistance = Infinity;
    for (let index = 0; index < polygonPoints.length; index += 1) {
      const start = polygonPoints[index];
      const end = polygonPoints[(index + 1) % polygonPoints.length];
      const projected = projectPointToSegment(point, start, end);
      const distance = distanceBetween(point, projected);
      if (distance < bestDistance) {
        best = projected;
        bestDistance = distance;
      }
    }
    return best;
  }

  function findLinkedLotForConnection(feature) {
    const lots = state.features.filter((item) => isLotLabelFeature(item) && item.sourceFileId === feature.sourceFileId);
    if (!lots.length) return null;

    const reference = getFeatureLotReference(feature);
    if (reference.lotNo) {
      const exactMatch = lots.find((lot) => {
        const lotRef = getFeatureLotReference(lot);
        if (lotRef.lotNo !== reference.lotNo) return false;
        return !reference.planNo || !lotRef.planNo || lotRef.planNo === reference.planNo;
      });
      if (exactMatch) return exactMatch;
    }

    const connectionPoints = feature.points || [];
    return lots.find((lot) => {
      if (!lot.points || lot.points.length < 3) return false;
      return connectionPoints.some((point) => isPointInPolygon(point, lot.points));
    }) || null;
  }

  function getFeatureLotReference(feature) {
    const values = getPlanLabelValues(feature);
    return {
      lotNo: normalizeLotReference(planLabelValue(values, [
        "LotNo",
        "LotNumber",
        "Lot_No",
        "PropertyLot",
        "PropertyLotNo",
        "HouseLot",
        "ServiceLot",
        "ConnectionLot",
        "LotServed",
        "AssociatedLot",
        "Lot",
      ])),
      planNo: normalizeLotReference(planLabelValue(values, [
        "PlanNo",
        "PlanNumber",
        "Plan_No",
        "PropertyPlan",
        "PropertyPlanNo",
        "ServicePlan",
        "ConnectionPlan",
        "Plan",
      ])),
    };
  }

  function normalizeLotReference(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function getPolygonInteriorLabelPoint(points) {
    if (!points || points.length < 3) return null;
    const centroid = getPolygonCentroid(points);
    if (centroid && isPointInPolygon(centroid, points)) return centroid;
    const boundsCenter = getPolygonBoundsCenter(points);
    if (boundsCenter && isPointInPolygon(boundsCenter, points)) return boundsCenter;
    return getBestInteriorPolygonPoint(points);
  }

  function getPolygonInteriorPointNearTarget(points, target) {
    if (!points || points.length < 3 || !target) return getPolygonInteriorLabelPoint(points);
    if (isPointInPolygon(target, points) && getClosestSegmentDistance(target, points, true) > 4) return target;
    return getBestInteriorPolygonPoint(points, target);
  }

  function getPolygonCentroid(points) {
    let areaTwice = 0;
    let xTotal = 0;
    let yTotal = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const cross = current.x * next.y - next.x * current.y;
      areaTwice += cross;
      xTotal += (current.x + next.x) * cross;
      yTotal += (current.y + next.y) * cross;
    }
    if (Math.abs(areaTwice) < 1e-9) return getPolygonBoundsCenter(points);
    return {
      x: xTotal / (3 * areaTwice),
      y: yTotal / (3 * areaTwice),
    };
  }

  function getPolygonBoundsCenter(points) {
    const bounds = getPointBounds(points);
    if (!bounds) return null;
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }

  function getBestInteriorPolygonPoint(points, target = null) {
    const bounds = getPointBounds(points);
    if (!bounds) return null;
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);
    const steps = 12;
    const candidates = [
      getPolygonBoundsCenter(points),
      getPolygonCentroid(points),
    ].filter(Boolean);

    for (let row = 0; row <= steps; row += 1) {
      for (let column = 0; column <= steps; column += 1) {
        candidates.push({
          x: bounds.minX + (width * column) / steps,
          y: bounds.minY + (height * row) / steps,
        });
      }
    }

    let best = null;
    let bestScore = -Infinity;
    candidates.forEach((candidate) => {
      if (!candidate || !isPointInPolygon(candidate, points)) return;
      const edgeDistance = getClosestSegmentDistance(candidate, points, true);
      const targetPenalty = target ? distanceBetween(candidate, target) * 0.08 : 0;
      const score = edgeDistance - targetPenalty;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });
    return best;
  }

  function getPointBounds(points) {
    const finitePoints = (points || []).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (!finitePoints.length) return null;
    return {
      minX: Math.min(...finitePoints.map((point) => point.x)),
      maxX: Math.max(...finitePoints.map((point) => point.x)),
      minY: Math.min(...finitePoints.map((point) => point.y)),
      maxY: Math.max(...finitePoints.map((point) => point.y)),
    };
  }

  function drawMeasurementOverlay(transform) {
    state.measurement.completed.forEach((measurement) => {
      drawMeasurementPath(measurement.points, measurement.mode, transform, false);
    });

    if (!isMeasurementActive()) return;
    drawMeasurementPath(getActiveMeasurementPoints(), state.measurement.mode, transform, Boolean(state.measurement.preview));
  }

  function drawMeasurementPath(points, mode, transform, hasPreview) {
    if (mode !== "distance" && mode !== "area") return;

    const screenPoints = points.map((point) => projectMeasurementPoint(point, transform)).filter(Boolean);
    if (!screenPoints.length) return;

    ctx.save();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#f06f24";
    ctx.fillStyle = "rgba(240, 111, 36, 0.14)";
    ctx.setLineDash(hasPreview ? [8, 5] : []);
    ctx.beginPath();
    screenPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    if (mode === "area" && screenPoints.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();
    ctx.setLineDash([]);

    screenPoints.forEach((point, index) => {
      const isPreview = hasPreview && index === screenPoints.length - 1;
      ctx.beginPath();
      ctx.arc(point.x, point.y, isPreview ? 4 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isPreview ? "#ffffff" : "#f06f24";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });

    const labelPoint = screenPoints[screenPoints.length - 1];
    const label = getMeasurementValueTextFor(points, mode);
    if (labelPoint && label) drawMeasurementLabel(label, labelPoint.x + 10, labelPoint.y - 10);
    ctx.restore();
  }

  function getActiveMeasurementPoints() {
    const points = state.measurement.points.slice();
    if (state.measurement.preview) points.push(state.measurement.preview);
    return points;
  }

  function getLastCompletedMeasurement() {
    return state.measurement.completed[state.measurement.completed.length - 1] || null;
  }

  function projectMeasurementPoint(point, transform) {
    if (!point || !transform) return null;
    if (point.type === "geo" && transform.type === "geo") {
      const mercator = latLngToMercatorPoint(point.lat, point.lng);
      return {
        x: transform.offsetX + mercator.x * transform.baseScale,
        y: transform.offsetY + mercator.y * transform.baseScale,
      };
    }
    if (point.type === "raw" && transform.type === "geo") {
      return projectFeaturePoint(point, transform);
    }
    if (point.type === "raw") return project(point, transform);
    return null;
  }

  function drawMeasurementLabel(text, x, y) {
    drawInScreenSpace(() => {
      ctx.font = "800 13px Manrope, Segoe UI, Arial, sans-serif";
      const paddingX = 8;
      const paddingY = 6;
      const width = ctx.measureText(text).width + paddingX * 2;
      const height = 26;
      const labelX = Math.min(Math.max(8, x), (els.canvas.clientWidth || els.canvas.width) - width - 8);
      const labelY = Math.min(Math.max(8, y), (els.canvas.clientHeight || els.canvas.height) - height - 8);
      roundedRect(labelX, labelY, width, height, 7);
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.fill();
      ctx.strokeStyle = "rgba(11, 31, 58, 0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#0b1f3a";
      ctx.fillText(text, labelX + paddingX, labelY + paddingY + 10);
    });
  }

  function renderMeasurementUi() {
    const active = isMeasurementActive();
    const visible = active || hasMeasurementResult();
    const displayMode = getMeasurementDisplayMode();
    if (els.measurementButton) {
      els.measurementButton.classList.toggle("is-active", active);
      els.measurementButton.setAttribute("aria-pressed", String(active));
    }
    if (els.measurementReadout) {
      els.measurementReadout.hidden = !visible;
    }
    if (els.measurementMode) {
      els.measurementMode.textContent = displayMode === "area" ? "Area" : "Distance";
    }
    if (els.measurementValue) {
      els.measurementValue.textContent = getMeasurementValueText() || (displayMode === "area" ? "0 m2" : "0 m");
    }
  }

  function getMeasurementValueText() {
    if (isMeasurementActive()) return getMeasurementValueTextFor(getActiveMeasurementPoints(), state.measurement.mode);
    const lastMeasurement = getLastCompletedMeasurement();
    if (lastMeasurement) return getMeasurementValueTextFor(lastMeasurement.points, lastMeasurement.mode);
    return "";
  }

  function getMeasurementValueTextFor(points, mode) {
    if (mode === "area") {
      return points.length >= 3 ? formatArea(calculateMeasurementArea(points)) : "0 m2";
    }
    return points.length >= 2 ? formatDistance(calculateMeasurementDistance(points)) : "0 m";
  }

  function calculateMeasurementDistance(points) {
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      total += measurementDistanceBetween(points[index - 1], points[index]);
    }
    return total;
  }

  function calculateMeasurementArea(points) {
    if (points.length < 3) return 0;
    if (points.every((point) => point.type === "geo")) return calculateSphericalPolygonArea(points);
    let total = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      total += current.x * next.y - next.x * current.y;
    }
    return Math.abs(total) / 2;
  }

  function measurementDistanceBetween(a, b) {
    if (a.type === "geo" && b.type === "geo") return haversineDistance(a, b);
    return Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0));
  }

  function haversineDistance(a, b) {
    const radius = 6378137;
    const lat1 = degreesToRadians(a.lat);
    const lat2 = degreesToRadians(b.lat);
    const deltaLat = degreesToRadians(b.lat - a.lat);
    const deltaLng = degreesToRadians(b.lng - a.lng);
    const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function calculateSphericalPolygonArea(points) {
    const radius = 6378137;
    let total = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      total += degreesToRadians(next.lng - current.lng) * (2 + Math.sin(degreesToRadians(current.lat)) + Math.sin(degreesToRadians(next.lat)));
    }
    return Math.abs(total * radius * radius / 2);
  }

  function formatDistance(value) {
    if (!Number.isFinite(value)) return "0 m";
    if (value >= 1000) return `${formatNumber(value / 1000, 3)} km`;
    return `${formatNumber(value, value >= 10 ? 1 : 2)} m`;
  }

  function formatArea(value) {
    if (!Number.isFinite(value)) return "0 m2";
    if (value >= 10000) return `${formatNumber(value / 10000, 3)} ha`;
    return `${formatNumber(value, value >= 100 ? 0 : 1)} m2`;
  }

  function formatCoordinateTriple(point) {
    return `X: ${formatCoordinateValue(point.x)}, Y: ${formatCoordinateValue(point.y)}, Z: ${formatCoordinateValue(point.z)}`;
  }

  function formatCoordinateValue(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return Number(value).toLocaleString("en-AU", {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0,
      useGrouping: false,
    });
  }

  function formatNumber(value, decimals) {
    return Number(value || 0).toLocaleString("en-AU", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0,
    });
  }

  function degreesToRadians(value) {
    return value * Math.PI / 180;
  }

  function getGeometryDrawRank(geometryKind) {
    if (geometryKind === "Polygon") return 1;
    if (geometryKind === "Line") return 2;
    if (geometryKind === "Point") return 3;
    return 2;
  }

  function getSelectionDrawRank(feature) {
    return state.selectedId === feature.uid ? 1 : 0;
  }

  function getPlanDrawOrder(feature) {
    return getPlanStyleForFeature(feature).drawOrder || 50;
  }

  function getActiveMapTransform(features, width, height) {
    if (!features.length) return getTransform(features, width, height);
    const geoTransform = getGeoTransform(features, width, height);
    if (state.mapMode === "grid" && !hasEnabledMapOverlays()) return getTransform(features, width, height);
    return geoTransform || getTransform(features, width, height);
  }

  function hasEnabledMapOverlays() {
    return state.overlays.some((overlay) => overlay.enabled);
  }

  function getGeoTransform(features, width, height) {
    const mercatorPoints = features
      .flatMap((feature) => feature.points)
      .map((point) => {
        const latLng = toLatLng(point);
        return latLng ? latLngToMercatorPoint(latLng[0], latLng[1]) : null;
      })
      .filter(Boolean);

    if (!mercatorPoints.length) return null;

    const xs = mercatorPoints.map((point) => point.x);
    const ys = mercatorPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 0.0000001);
    const spanY = Math.max(maxY - minY, 0.0000001);
    const padding = 46;
    const baseScale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY) * state.zoom;
    const tileZoom = clamp(Math.round(Math.log2(baseScale / 256)), 1, mapMaxTileZoom);
    const worldSize = 256 * 2 ** tileZoom;
    const tileScale = baseScale / worldSize;
    const contentWidth = spanX * baseScale;
    const contentHeight = spanY * baseScale;
    const offsetX = (width - contentWidth) / 2 - minX * baseScale + state.pan.x;
    const offsetY = (height - contentHeight) / 2 - minY * baseScale + state.pan.y;

    return { type: "geo", width, height, baseScale, tileZoom, tileScale, offsetX, offsetY };
  }

  function projectFeaturePoint(point, transform) {
    if (!transform) return null;
    if (transform.type !== "geo") return project(point, transform);
    const latLng = toLatLng(point);
    if (!latLng) return null;
    const mercator = latLngToMercatorPoint(latLng[0], latLng[1]);
    return {
      x: transform.offsetX + mercator.x * transform.baseScale,
      y: transform.offsetY + mercator.y * transform.baseScale,
    };
  }

  function drawTileBasemap(width, height, transform) {
    ctx.fillStyle = state.mapMode === "satellite" ? "#2c3339" : "#eef3f7";
    ctx.fillRect(0, 0, width, height);

    const tileSize = 256 * transform.tileScale;
    const tileCount = 2 ** transform.tileZoom;
    const minTileX = Math.floor((-transform.offsetX) / tileSize) - 1;
    const maxTileX = Math.floor((width - transform.offsetX) / tileSize) + 1;
    const minTileY = Math.max(0, Math.floor((-transform.offsetY) / tileSize) - 1);
    const maxTileY = Math.min(tileCount - 1, Math.floor((height - transform.offsetY) / tileSize) + 1);

    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
        const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
        const image = getTileImage(state.mapMode, transform.tileZoom, wrappedX, tileY);
        const x = transform.offsetX + tileX * tileSize;
        const y = transform.offsetY + tileY * tileSize;
        if (image.complete && image.naturalWidth) {
          drawMutedTileImage(image, x, y, tileSize);
        } else {
          drawTilePlaceholder(x, y, tileSize);
        }
      }
    }
    drawBasemapWash(width, height);
    drawTileAttribution(width, height);
  }

  function drawMutedTileImage(image, x, y, size) {
    const tone = getBasemapTone();
    ctx.save();
    ctx.globalAlpha = tone.opacity;
    ctx.filter = tone.filter;
    ctx.drawImage(image, x, y, size + 1, size + 1);
    ctx.restore();
  }

  function getTileImage(mode, zoom, x, y) {
    const key = `${mode}:${zoom}:${x}:${y}`;
    const cached = state.tileCache.get(key);
    if (cached) return cached;

    const image = new Image();
    image.decoding = "async";
    image.referrerPolicy = "no-referrer-when-downgrade";
    image.onload = () => {
      if (state.mapMode === mode) drawMap();
    };
    image.src = getTileUrl(mode, zoom, x, y);
    state.tileCache.set(key, image);
    return image;
  }

  function getTileUrl(mode, zoom, x, y) {
    if (mode === "satellite") {
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
    }
    const subdomain = ["a", "b", "c"][(x + y) % 3];
    return `https://${subdomain}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  }

  function drawTilePlaceholder(x, y, size) {
    ctx.fillStyle = state.mapMode === "satellite" ? "#343b42" : "#eef3f7";
    ctx.fillRect(x, y, size + 1, size + 1);
    ctx.strokeStyle = state.mapMode === "satellite" ? "rgba(255,255,255,0.06)" : "rgba(11,31,58,0.06)";
    ctx.strokeRect(x, y, size + 1, size + 1);
  }

  function getBasemapTone() {
    if (state.mapMode === "satellite") {
      return {
        filter: "grayscale(1) saturate(0.12) contrast(0.78) brightness(1.18)",
        opacity: 0.54,
        wash: "rgba(244, 248, 251, 0.36)",
      };
    }
    return {
      filter: "grayscale(1) saturate(0.12) contrast(0.82) brightness(1.08)",
      opacity: 0.48,
      wash: "rgba(248, 251, 254, 0.42)",
    };
  }

  function drawBasemapWash(width, height) {
    ctx.save();
    ctx.fillStyle = getBasemapTone().wash;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawTileAttribution(width, height) {
    const text = state.mapMode === "satellite" ? "Imagery © Esri" : "Map data © OpenStreetMap contributors";
    ctx.save();
    ctx.font = "700 11px Manrope, Arial, sans-serif";
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fillRect(width - textWidth - 18, height - 24, textWidth + 12, 18);
    ctx.fillStyle = "#122033";
    ctx.fillText(text, width - textWidth - 12, height - 11);
    ctx.restore();
  }

  async function runReceiverLocationCheck() {
    const receivers = getActiveReceivers();
    const receiverText = formatQuotedList(receivers);
    if (!receivers.length || !state.features.length) {
      resetLocationCheck();
      renderChecks();
      return;
    }

    const extent = getFeatureLngLatExtent(state.features);
    if (!extent) {
      state.locationCheck = {
        status: "not-georeferenced",
        message: "",
        receiver: receiverText,
        councils: [],
        providers: [],
      };
      renderChecks();
      return;
    }

    if (state.locationCheckAbort) state.locationCheckAbort.abort();
    const controller = new AbortController();
    state.locationCheckAbort = controller;
    state.locationCheck = {
      status: "checking",
      message: "",
      receiver: receiverText,
      councils: [],
      providers: [],
    };
    renderChecks();
    renderOverlays();

    const params = new URLSearchParams({
      f: "geojson",
      where: "1=1",
      outFields: "lga,abbrev_name,lga_code",
      returnGeometry: "false",
      geometry: `${extent.minLng},${extent.minLat},${extent.maxLng},${extent.maxLat}`,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      resultRecordCount: "10",
    });

    try {
      const response = await fetch(`${councilBoundaryServiceUrl}/query?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "ArcGIS query failed");

      const councils = uniqueValues((data.features || []).map((feature) => getCouncilName(feature.properties || "")).filter(Boolean));
      const providers = uniqueValues(councils.map((council) => waterProviderByCouncil[normalizeCouncilKey(council)]).filter(Boolean));
      const unmatchedReceivers = receivers.filter((receiver) => {
        const councilMatch = councils.find((council) => isAuthorityMatch(receiver, council));
        const providerMatch = providers.find((provider) => isAuthorityMatch(receiver, provider));
        return !councilMatch && !providerMatch;
      });
      const mappedText = describeMappedAuthorities(councils, providers);

      if (!unmatchedReceivers.length) {
        state.locationCheck = {
          status: "match",
          message: `${receivers.length === 1 ? "Receiver" : "Receivers"} ${receiverText} ${receivers.length === 1 ? "matches" : "match"} the mapped location: ${mappedText}.`,
          receiver: receiverText,
          councils,
          providers,
        };
      } else {
        state.locationCheck = {
          status: councils.length ? "mismatch" : "unavailable",
          message: councils.length
            ? `${unmatchedReceivers.length === 1 ? "Receiver" : "Receivers"} ${formatQuotedList(unmatchedReceivers)} ${unmatchedReceivers.length === 1 ? "does" : "do"} not match the mapped location. Map appears to be ${mappedText}.`
            : `${receivers.length === 1 ? "Receiver" : "Receivers"} ${receiverText} could not be checked against a Queensland council boundary at this location.`,
          receiver: receiverText,
          councils,
          providers,
        };
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      state.locationCheck = {
        status: "unavailable",
        message: `${receivers.length === 1 ? "Receiver" : "Receivers"} ${receiverText} could not be checked against the Queensland boundary service.`,
        receiver: receiverText,
        councils: [],
        providers: [],
      };
    } finally {
      if (state.locationCheckAbort === controller) state.locationCheckAbort = null;
      applySuggestedOverlaysForFile();
      renderChecks();
      renderOverlays();
      drawMap();
    }
  }

  function applySuggestedOverlaysForFile() {
    if (state.suggestedOverlaysApplied) return;
    state.suggestedOverlaysApplied = true;

    state.overlays.forEach((overlay) => {
      if (!isRecommendedOverlay(overlay) || !shouldAutoEnableRecommendedOverlay(overlay) || overlay.userToggled || overlay.enabled) return;
      overlay.enabled = true;
      overlay.status = "Ready";
      overlay.lastExtentKey = "";
    });
  }

  function getFeatureLngLatExtent(features) {
    const latLngs = features
      .flatMap((feature) => feature.points)
      .map((point) => {
        const latLng = toLatLng(point);
        return latLng ? { lat: latLng[0], lng: latLng[1] } : null;
      })
      .filter(Boolean);

    if (!latLngs.length) return null;

    const lats = latLngs.map((point) => point.lat);
    const lngs = latLngs.map((point) => point.lng);
    const padding = 0.001;
    return {
      minLat: clamp(Math.min(...lats) - padding, -85, 85),
      maxLat: clamp(Math.max(...lats) + padding, -85, 85),
      minLng: clamp(Math.min(...lngs) - padding, -180, 180),
      maxLng: clamp(Math.max(...lngs) + padding, -180, 180),
    };
  }

  function describeMappedAuthorities(councils, providers) {
    const councilText = councils.length ? `council ${formatList(councils)}` : "no Queensland council boundary";
    if (!providers.length) return councilText;
    return `${councilText}, water provider ${formatList(providers)}`;
  }

  function isAuthorityMatch(receiver, candidate) {
    const left = normalizeAuthorityName(receiver);
    const right = normalizeAuthorityName(candidate);
    return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
  }

  function normalizeAuthorityName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\bcity\s+of\b/g, " ")
      .replace(/\bregional\s+council\b/g, " ")
      .replace(/\bshire\s+council\b/g, " ")
      .replace(/\bcity\s+council\b/g, " ")
      .replace(/\b(regional|shire|city|council|authority|water|utility|utilities|of|the)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function formatList(values) {
    if (values.length <= 1) return values[0] || "";
    if (values.length === 2) return `${values[0]} and ${values[1]}`;
    return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
  }

  function formatQuotedList(values) {
    return formatList(values.map((value) => `"${value}"`));
  }

  function getActiveReceivers() {
    return uniqueValues(state.fileMetas.map((meta) => meta.receiver).filter(Boolean));
  }

  function uniqueValues(values) {
    const seen = new Set();
    return values.filter((value) => {
      const key = normalizeAuthorityName(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function resetLocationCheck() {
    if (state.locationCheckAbort) state.locationCheckAbort.abort();
    state.locationCheckAbort = null;
    state.locationCheck = {
      status: state.fileMeta.receiver ? "idle" : "missing",
      message: "",
      receiver: state.fileMeta.receiver || "",
      councils: [],
      providers: [],
    };
  }

  function scheduleOverlayQueries(transform) {
    if (!transform || transform.type !== "geo") return;
    window.clearTimeout(state.overlayTimer);
    state.overlayTimer = window.setTimeout(() => {
      loadVisibleOverlays(transform);
    }, 260);
  }

  function loadVisibleOverlays(transform) {
    const extent = getViewLngLatExtent(transform);
    if (!extent) return;

    state.overlays.forEach((overlay) => {
      if (!overlay.enabled) return;
      if (transform.tileZoom < overlay.minTileZoom) {
        overlay.features = [];
        overlay.status = `Zoom in to show ${overlay.name.toLowerCase()}`;
        overlay.lastExtentKey = "";
        if (overlay.abortController) overlay.abortController.abort();
        renderOverlays();
        return;
      }

      const extentKey = getOverlayExtentKey(extent, transform.tileZoom, overlay.mode);
      if (extentKey === overlay.lastExtentKey || extentKey === overlay.requestKey) return;
      fetchOverlayFeatures(overlay, extent, extentKey, transform.width);
    });
  }

  async function fetchOverlayFeatures(overlay, extent, extentKey, width) {
    if (overlay.abortController) overlay.abortController.abort();

    const controller = new AbortController();
    overlay.abortController = controller;
    overlay.requestKey = extentKey;
    overlay.status = "Loading...";
    renderOverlays();

    const params = new URLSearchParams({
      f: "geojson",
      where: "1=1",
      outFields: overlay.outFields,
      returnGeometry: "true",
      geometry: `${extent.minLng},${extent.minLat},${extent.maxLng},${extent.maxLat}`,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outSR: "4326",
      resultRecordCount: String(overlay.resultRecordCount || (overlay.mode === "parcel" ? 900 : 300)),
      geometryPrecision: "7",
      maxAllowableOffset: String(getOverlayTolerance(extent, width)),
    });

    try {
      const response = await fetch(`${overlay.serviceUrl}/query?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "ArcGIS query failed");

      overlay.features = Array.isArray(data.features)
        ? data.features.map((feature, index) => ({
          ...feature,
          _overlayId: overlay.id,
          _overlayFeatureId: getOverlayFeatureId(feature, index),
        }))
        : [];
      overlay.lastExtentKey = extentKey;
      overlay.requestKey = "";
      overlay.status = overlay.features.length
        ? `${overlay.features.length}${data.exceededTransferLimit ? "+" : ""} shown`
        : "None in view";
      drawMap();
      renderOverlays();
    } catch (error) {
      if (error.name === "AbortError") return;
      overlay.requestKey = "";
      overlay.status = "Unavailable";
      renderOverlays();
    }
  }

  function drawArcgisOverlays(width, height, transform) {
    const labelKeys = new Set();
    const overlays = state.overlays
      .filter((overlay) => overlay.enabled && overlay.features.length)
      .sort((a, b) => getOverlayDrawOrder(a) - getOverlayDrawOrder(b));

    overlays.forEach((overlay) => {
      overlay.features.forEach((feature) => {
        drawOverlayFeature(overlay, feature, transform, labelKeys);
      });
    });

    drawOverlayAttribution(width, height, overlays);
  }

  function drawOverlayFeature(overlay, feature, transform, labelKeys) {
    if (!feature || !feature.geometry) return;

    const props = feature.properties || {};
    const style = getOverlayFeatureStyle(overlay, props);
    const selected = isSelectedOverlayFeature(overlay, feature);
    const pointCoords = getGeometryPointCoords(feature.geometry);
    if (pointCoords.length) {
      pointCoords.forEach((coord) => {
        const point = projectLngLat(coord[0], coord[1], transform);
        if (point) drawServiceOverlayMarker(point, style, selected, props);
      });
      return;
    }

    const paths = getGeometryPaths(feature.geometry);
    if (!paths.length) return;

    ctx.save();
    ctx.lineWidth = selected ? style.lineWidth + 0.9 : style.lineWidth;
    ctx.strokeStyle = style.stroke;
    ctx.fillStyle = style.fill;
    ctx.globalAlpha = selected ? 1 : getOverlayAlpha(overlay);
    ctx.setLineDash(style.dash || []);

    paths.forEach((path) => {
      const points = path.map((coord) => projectLngLat(coord[0], coord[1], transform)).filter(Boolean);
      if (points.length < 2) return;
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      if (isPolygonGeometry(feature.geometry)) {
        ctx.closePath();
        if (style.fill && overlay.mode !== "parcel") ctx.fill();
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();

    if (selected && overlay.mode !== "parcel") {
      const center = getGeometryScreenCenter(feature.geometry, transform);
      if (center) drawOverlayLabel(getOverlayFeatureTitle(overlay, feature), center.x, center.y, style.labelColor);
      return;
    }

    if (overlay.mode === "parcel" || overlay.mode.startsWith("service") || transform.tileZoom < 10) return;
    const label = getOverlayFeatureLabel(overlay, props);
    if (!label) return;

    const labelKey = overlay.mode === "provider" ? `${overlay.id}:${label}` : `${overlay.id}:${label}`;
    if (labelKeys.has(labelKey)) return;
    const center = getGeometryScreenCenter(feature.geometry, transform);
    if (!center) return;
    labelKeys.add(labelKey);
    drawOverlayLabel(label, center.x, center.y, style.labelColor);
  }

  function drawServiceOverlayMarker(point, style, selected, props) {
    ctx.save();
    ctx.globalAlpha = selected ? 1 : 0.74;
    drawPlanPointSymbol(point, style.planStyle, selected, [], props, {
      lineWidth: selected ? 1.8 : 1.05,
      fill: style.pointFill,
      radiusScale: 0.82,
      selectedHaloWidth: 2.8,
    });
    ctx.restore();
  }

  function drawOverlayLabel(text, x, y, color) {
    drawInScreenSpace(() => {
      const scale = getMapLabelScale();
      ctx.font = `800 ${2.4 * scale}px Manrope, Arial, sans-serif`;
      const paddingX = 1.5 * scale;
      const width = ctx.measureText(text).width + paddingX * 2;
      const height = 4.5 * scale;
      const canvasWidth = els.canvas.clientWidth || els.canvas.width;
      const canvasHeight = els.canvas.clientHeight || els.canvas.height;
      if (!isLabelAnchorNearViewport(x, y, canvasWidth, canvasHeight, Math.max(width, height, 24))) return;
      ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
      ctx.strokeStyle = "rgba(157, 172, 189, 0.58)";
      ctx.lineWidth = Math.max(0.5, scale);
      ctx.beginPath();
      roundedRect(x - width / 2, y - height / 2, width, height, 1.2 * scale);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(text, x - width / 2 + paddingX, y + 0.9 * scale);
    });
  }

  function drawOverlayAttribution(width, height, overlays) {
    if (!overlays.length) return;
    const hasParcels = overlays.some((overlay) => overlay.mode === "parcel");
    const providers = uniqueValues(overlays.map((overlay) => overlay.provider).filter(Boolean));
    const councils = uniqueValues(overlays.map((overlay) => overlay.council).filter(Boolean));
    const sources = uniqueValues([...providers, ...councils.map((council) => `${council} Council`)]);
    const providerText = sources.length ? `Reference data: ${formatList(sources)}` : "";
    const stateText = hasParcels ? "State of Queensland" : "";
    const text = providerText && stateText
      ? `${providerText} / ${stateText}`
      : providerText || (stateText ? `Overlays: ${stateText}` : "Boundaries: State of Queensland");
    ctx.save();
    ctx.font = "700 10px Manrope, Arial, sans-serif";
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.fillRect(10, height - 24, textWidth + 12, 18);
    ctx.fillStyle = "#405267";
    ctx.fillText(text, 16, height - 11);
    ctx.restore();
  }

  function getOverlayDrawOrder(overlay) {
    if (overlay.mode === "provider") return 1;
    if (overlay.mode === "parcel") return 2;
    if (overlay.mode === "service-line") return 3;
    if (overlay.mode === "service-point") return 4;
    return 3;
  }

  function getOverlayFeatureStyle(overlay, props) {
    const planStyle = getMutedOverlayPlanStyle(getPlanStyleForOverlay(overlay, props), overlay);
    const stroke = hexToRgba(planStyle.color, mapOverlayReferenceStyle.strokeAlpha);
    const pointStroke = hexToRgba(planStyle.color, mapOverlayReferenceStyle.pointStrokeAlpha);
    const pointFill = hexToRgba(planStyle.color, mapOverlayReferenceStyle.pointFillAlpha);
    const polygonFill = hexToRgba(planStyle.color, mapOverlayReferenceStyle.polygonFillAlpha);
    const labelColor = hexToRgba(planStyle.color, mapOverlayReferenceStyle.labelAlpha);
    if (overlay.mode.startsWith("service")) {
      return {
        stroke: overlay.mode === "service-point" ? pointStroke : stroke,
        fill: overlay.mode === "service-polygon"
          ? polygonFill
          : (overlay.mode === "service-point" ? pointFill : "rgba(0, 0, 0, 0)"),
        pointFill,
        labelColor,
        lineWidth: getOverlayLineWidth(overlay),
        dash: getOverlayDashForStyle(planStyle, overlay, props),
        planStyle,
      };
    }
    if (overlay.mode !== "provider") {
      return {
        stroke,
        fill: overlay.mode === "parcel" ? "rgba(0, 0, 0, 0)" : polygonFill,
        pointFill,
        labelColor,
        lineWidth: getOverlayLineWidth(overlay),
        dash: [],
        planStyle,
      };
    }

    return {
      stroke,
      fill: polygonFill,
      pointFill,
      labelColor,
      lineWidth: getOverlayLineWidth(overlay),
      dash: [],
      planStyle,
    };
  }

  function getOverlayLineWidth(overlay) {
    if (overlay.mode === "parcel") return 0.55;
    if (overlay.mode === "service-line") return 1.05;
    if (overlay.mode === "service-polygon") return 0.9;
    if (overlay.mode === "service-point") return 1;
    return 0.85;
  }

  function getOverlayAlpha(overlay) {
    if (overlay.mode === "parcel") return 0.58;
    if (overlay.mode.startsWith("service")) return 0.66;
    return 0.62;
  }

  function isSelectedOverlayFeature(overlay, feature) {
    return Boolean(
      state.selectedOverlayFeature
      && state.selectedOverlayFeature.overlay.id === overlay.id
      && state.selectedOverlayFeature.feature._overlayFeatureId === feature._overlayFeatureId
    );
  }

  function getViewLngLatExtent(transform) {
    const corners = [
      mercatorPointToLatLng((0 - transform.offsetX) / transform.baseScale, (0 - transform.offsetY) / transform.baseScale),
      mercatorPointToLatLng((transform.width - transform.offsetX) / transform.baseScale, (0 - transform.offsetY) / transform.baseScale),
      mercatorPointToLatLng((0 - transform.offsetX) / transform.baseScale, (transform.height - transform.offsetY) / transform.baseScale),
      mercatorPointToLatLng((transform.width - transform.offsetX) / transform.baseScale, (transform.height - transform.offsetY) / transform.baseScale),
    ].filter(Boolean);

    if (!corners.length) return null;

    const lats = corners.map((point) => point.lat);
    const lngs = corners.map((point) => point.lng);
    return {
      minLat: clamp(Math.min(...lats), -85, 85),
      maxLat: clamp(Math.max(...lats), -85, 85),
      minLng: clamp(Math.min(...lngs), -180, 180),
      maxLng: clamp(Math.max(...lngs), -180, 180),
    };
  }

  function getOverlayExtentKey(extent, tileZoom, mode) {
    const precision = mode === "parcel" ? 5 : 3;
    return [
      tileZoom,
      extent.minLng.toFixed(precision),
      extent.minLat.toFixed(precision),
      extent.maxLng.toFixed(precision),
      extent.maxLat.toFixed(precision),
    ].join(":");
  }

  function getOverlayTolerance(extent, width) {
    const span = Math.max(extent.maxLng - extent.minLng, extent.maxLat - extent.minLat, 0.000001);
    return Math.max(span / Math.max(width || 800, 320), 0.000001).toFixed(7);
  }

  function projectLngLat(lng, lat, transform) {
    const longitude = Number(lng);
    const latitude = Number(lat);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    const mercator = latLngToMercatorPoint(latitude, longitude);
    return {
      x: transform.offsetX + mercator.x * transform.baseScale,
      y: transform.offsetY + mercator.y * transform.baseScale,
    };
  }

  function getGeometryPaths(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return geometry.coordinates;
    if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap((polygon) => polygon);
    if (geometry.type === "LineString") return [geometry.coordinates];
    if (geometry.type === "MultiLineString") return geometry.coordinates;
    return [];
  }

  function getGeometryPointCoords(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Point") return [geometry.coordinates];
    if (geometry.type === "MultiPoint") return geometry.coordinates;
    return [];
  }

  function isPolygonGeometry(geometry) {
    return geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon");
  }

  function getOverlayGeometryLabel(geometry) {
    if (!geometry) return "Unknown";
    if (geometry.type === "Point" || geometry.type === "MultiPoint") return "Point";
    if (geometry.type === "LineString" || geometry.type === "MultiLineString") return "Line";
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") return "Polygon";
    return geometry.type || "Unknown";
  }

  function getOverlayFeatureId(feature, index) {
    const props = feature.properties || {};
    return String(
      props.MXASSETNUM
      || props.SAPOBJECTID
      || props.ASSETID
      || props.AssetID
      || props.AssetId
      || props.Asset_ID
      || props.asset_id
      || props.OBJECTID
      || props.objectid
      || props.GlobalID
      || `${index + 1}`
    );
  }

  function getOverlayFeatureTitle(overlay, feature) {
    const props = feature.properties || {};
    const id = getOverlayFeatureId(feature, 0);
    const subtype = getSubtypeLabel(props.SubtypeCD || props.subtypecd);
    if (subtype) return `${overlay.name} ${id} (${subtype})`;
    return `${overlay.name} ${id}`;
  }

  function getSubtypeLabel(value) {
    const subtype = String(value || "");
    const subtypeLabels = {
      11101: "Raw Water Main",
      11102: "Trunk Main",
      11103: "Reticulation Main",
      12102: "Tee",
      12103: "Wye",
      12104: "Cross",
      12105: "End Cap",
      12106: "Reducer",
      12107: "Tapping Device",
    };
    return subtypeLabels[subtype] || "";
  }

  function getGeometryScreenCenter(geometry, transform) {
    const points = getGeometryPaths(geometry)
      .flatMap((path) => path)
      .map((coord) => projectLngLat(coord[0], coord[1], transform))
      .filter(Boolean);
    if (!points.length) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  }

  function getOverlayFeatureLabel(overlay, props) {
    if (overlay.mode === "provider") return getWaterProviderName(props);
    if (overlay.mode === "council") return getCouncilName(props);
    return "";
  }

  function getWaterProviderName(props) {
    const council = normalizeCouncilKey(getCouncilName(props));
    return waterProviderByCouncil[council] || "Council water area";
  }

  function getCouncilName(props) {
    const preferredFields = ["lga_name", "locgovname", "locgov_name", "lga", "shire_name", "council", "name"];
    for (const field of preferredFields) {
      const value = findPropertyValue(props, field);
      if (value) return cleanCouncilName(value);
    }
    const fallback = Object.values(props || {}).find((value) => typeof value === "string" && value.trim());
    return fallback ? cleanCouncilName(fallback) : "";
  }

  function findPropertyValue(props, fieldName) {
    const target = fieldName.toLowerCase();
    const entry = Object.entries(props || {}).find(([key]) => cleanName(key).toLowerCase() === target);
    return entry ? String(entry[1] || "").trim() : "";
  }

  function cleanCouncilName(value) {
    return titleCase(String(value || "")
      .replace(/_/g, " ")
      .replace(/\b(regional|city|shire)\s+council\b/gi, "")
      .replace(/\bcouncil\b/gi, "")
      .replace(/\b(regional|shire|city)\b$/gi, "")
      .replace(/\s+/g, " ")
      .trim());
  }

  function normalizeCouncilKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\b(regional|city|shire|council)\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function resetOverlayQueries() {
    window.clearTimeout(state.overlayTimer);
    state.suggestedOverlaysApplied = false;
    state.overlays.forEach((overlay) => {
      if (overlay.abortController) overlay.abortController.abort();
      overlay.enabled = Boolean(overlay.defaultEnabled);
      overlay.userToggled = false;
      overlay.features = [];
      overlay.status = overlay.enabled ? "Ready" : "Off";
      overlay.lastExtentKey = "";
      overlay.requestKey = "";
      overlay.abortController = null;
    });
  }

  function planStyle(key, color, drawOrder, lineweightMm, pointRadiusMm, fill = "") {
    return { key, color, drawOrder, lineweightMm, pointRadiusMm, fill };
  }

  function getPlanStyleForFeature(feature) {
    const key = feature.planStyleKey && feature.planStyleKey !== "generic"
      ? feature.planStyleKey
      : getPlanStyleKeyForFeature(feature);
    const style = planPreviewStyleDefinitions[key] || planPreviewStyleDefinitions.generic;
    if (!isExistingAsset(feature)) return style;
    return {
      ...style,
      color: existingAssetPlanColor,
      fill: style.fill ? existingAssetPlanFill : style.fill,
    };
  }

  function getPlanStyleKeyForFeature(feature) {
    const baseKey = getPlanStyleKeyForAssetPath(feature?.assetPath);
    const values = feature?.attributes || {};
    const path = normalizePlanAssetPath(feature?.assetPath);
    if (path.startsWith("watersupply/pipes/") && valueMatches(values, ["Use"], "Irrigation")) return "open_space_irrigation_pipe";
    if (
      path.startsWith("watersupply/fittings/")
      || path.startsWith("watersupply/valves/")
      || path.startsWith("watersupply/hydrants/")
      || path.startsWith("watersupply/meters/")
      || path.startsWith("watersupply/waterservices/")
      || path.startsWith("watersupply/servicefittings/")
    ) {
      if (valueMatches(values, ["Use"], "Irrigation") || valuesLookLikeSprinkler(values)) return "open_space_irrigation_fitting";
    }
    if (path.startsWith("openspace/electricalconduits/") && componentNotesContain(values, "Communications Conduit")) return "open_space_communication_conduit";
    if (path.startsWith("openspace/electricalfittings/") && componentNotesContain(values, "Communications Pit")) return "open_space_communication_pit";
    if (path.startsWith("openspace/electricalfittings/") && valueMatches(values, ["Type"], "Light")) return "open_space_electrical_light";
    return baseKey;
  }

  function isExistingAsset(feature) {
    return String(feature && feature.status || "").trim().toLowerCase() === "existing";
  }

  function getPlanStyleForOverlay(overlay, props) {
    const key = getPlanStyleKeyForOverlay(overlay, props);
    return planPreviewStyleDefinitions[key] || planPreviewStyleDefinitions.generic;
  }

  function isPipePlanStyle(style = {}) {
    return /^(water|sewer|stormwater)_pipe$/.test(String(style.key || ""))
      || /^(water_service|sewer_connection)$/.test(String(style.key || ""));
  }

  function isOutlineOnlyPolygonFeature(feature, style = {}) {
    return style.key === "cadastre_road_reserve"
      || /^cadastre\/landparcels\/roadreserve/i.test(String(feature?.assetPath || ""));
  }

  function getMutedOverlayPlanStyle(style, overlay = null) {
    const color = overlay && overlay.mode === "parcel" ? mapOverlayReferenceStyle.parcelColor : style.color;
    return {
      ...style,
      color,
      fill: hexToRgba(color, mapOverlayReferenceStyle.polygonFillAlpha),
      lineweightMm: Math.min(style.lineweightMm || 0.18, 0.14),
      pointRadiusMm: Math.max(0.68, (style.pointRadiusMm || 1) * 0.76),
    };
  }

  function getPlanStyleKeyForAssetPath(assetPath) {
    const normalized = String(assetPath || "").replace(/^Stormwater\//i, "StormWater/").toLowerCase();
    if (normalized.startsWith("cadastre/landparcels/roadreserve")) return "cadastre_road_reserve";
    if (normalized.startsWith("cadastre/landparcels/lot")) return "cadastre_lot";
    if (normalized.startsWith("cadastre/easements/easement")) return "cadastre_easement";
    if (normalized.startsWith("cadastre/surveymarks/") || normalized.startsWith("supplementary/surveymarks/")) return "survey_mark";
    if (normalized.startsWith("surface/contours/")) return "surface_contour";
    if (normalized.startsWith("watersupply/pipes/")) return "water_pipe";
    if (normalized.startsWith("watersupply/valves/")) return "water_valve";
    if (normalized.startsWith("watersupply/hydrants/")) return "water_hydrant";
    if (normalized.startsWith("watersupply/meters/")) return "water_meter";
    if (normalized.startsWith("watersupply/waterservices/")) return "water_service";
    if (normalized.startsWith("watersupply/fittings/")) return "water_fitting";
    if (normalized.startsWith("sewerage/pipes")) return "sewer_pipe";
    if (normalized.startsWith("sewerage/connections/")) return "sewer_connection";
    if (normalized.startsWith("sewerage/maintenanceholes/")) return "sewer_node";
    if (normalized.startsWith("sewerage/fittings/")) return "sewer_fitting";
    if (normalized.startsWith("stormwater/pipes/")) return "stormwater_pipe";
    if (normalized.startsWith("stormwater/pits/")) return "stormwater_pit";
    if (normalized.startsWith("stormwater/endstructures/")) return "stormwater_end_structure";
    if (normalized.startsWith("stormwater/wsudpolylines/") || normalized.startsWith("stormwater/wsudareas/")) return "stormwater_wsud";
    if (normalized.startsWith("stormwater/surfacedrains/")) return "stormwater_surface_drain";
    if (normalized.startsWith("transport/roadedges/")) return "transport_roadedge";
    if (normalized.startsWith("transport/pathways/")) return "transport_pathway";
    if (normalized.startsWith("transport/pavementareas/")) return "transport_pavement";
    if (normalized.startsWith("transport/parkingareas/")) return "transport_parking";
    if (normalized.startsWith("transport/roadislands/")) return "transport_roadisland";
    if (normalized.startsWith("transport/pramramps/")) return "transport_pramramp";
    if (normalized.startsWith("openspace/openspaceareas/")) return "open_space_area";
    if (normalized.startsWith("openspace/signs/")) return "open_space_sign";
    if (normalized.startsWith("openspace/electricalconduits/")) return "open_space_electrical_conduit";
    if (normalized.startsWith("openspace/electricalfittings/")) return "open_space_electrical_pit";
    if (normalized.startsWith("electrical/conduits/")) return "open_space_electrical_conduit";
    if (normalized.startsWith("electrical/pits/")) return "open_space_electrical_pit";
    if (normalized.startsWith("electrical/lights/")) return "open_space_electrical_light";
    if (normalized.startsWith("communication/conduits/") || normalized.startsWith("communications/conduits/") || normalized.startsWith("telecommunications/conduits/")) return "open_space_communication_conduit";
    if (normalized.startsWith("communication/pits/") || normalized.startsWith("communications/pits/") || normalized.startsWith("telecommunications/pits/")) return "open_space_communication_pit";
    if (normalized.startsWith("openspace/landscapeareas/")) return "open_space_landscape_area";
    if (normalized.startsWith("openspace/activitylandscapeedging/")) return "open_space_edging";
    if (normalized.startsWith("openspace/trees/")) return "open_space_tree";
    if (normalized.startsWith("openspace/activityareas/")) return "open_space_activity_area";
    if (normalized.startsWith("openspace/activitypoints/")) return "open_space_activity_point";
    if (normalized.startsWith("openspace/barbeques/")) return "open_space_barbeque";
    if (normalized.startsWith("openspace/tables/")) return "open_space_table";
    if (normalized.startsWith("openspace/seats/")) return "open_space_seat";
    if (normalized.startsWith("openspace/bicyclefittings/")) return "open_space_bicycle_fitting";
    if (normalized.startsWith("openspace/barrierspoint/")) return "open_space_barrier_point";
    if (normalized.startsWith("openspace/barrierscontinuous/")) return "open_space_barrier_continuous";
    if (normalized.startsWith("openspace/wastecollectionpoints/")) return "open_space_waste_collection";
    if (normalized.startsWith("openspace/shelters/shelterpolygon")) return "open_space_shelter_polygon";
    if (normalized.startsWith("openspace/shelters/")) return "open_space_shelter";
    if (normalized.startsWith("openspace/artworks/")) return "open_space_artwork";
    if (normalized.startsWith("openspace/boatingfacilities/")) return "open_space_boating_facility";
    if (normalized.startsWith("openspace/retainingwalls/")) return "open_space_retaining_wall";
    if (normalized.startsWith("openspace/buildings/")) return "open_space_building";
    if (normalized.startsWith("openspace/platforms/")) return "open_space_platform";
    if (normalized.startsWith("openspace/faunainfrastructure/faunapoint")) return "open_space_fauna_point";
    if (normalized.startsWith("openspace/faunainfrastructure/faunapolyline")) return "open_space_fauna_polyline";
    if (normalized.startsWith("openspace/landstabilisation/")) return "open_space_land_stabilisation";
    if (normalized.startsWith("openspace/preparedsurfaces/")) return "open_space_prepared_surface";
    if (normalized.startsWith("openspace/generalfixtures/")) return "open_space_fixture";
    return "generic";
  }

  function getPlanStyleKeyForOverlay(overlay, props) {
    if (overlay.mode === "parcel") return "cadastre_lot";
    const text = `${overlay.id || ""} ${overlay.name || ""} ${overlay.serviceKind || ""}`.toLowerCase();
    if (/easement/.test(text)) return "cadastre_easement";
    if (/road\s*reserve|road-reserve/.test(text)) return "cadastre_road_reserve";
    if (/headwall|end.?structure|outlet|culvert/.test(text)) return "stormwater_end_structure";
    if (/pit|gpt|sqid|inlet|waterbod/.test(text)) return "stormwater_pit";
    if (/wsud|basin|rain.?garden|quality.?area/.test(text) || overlay.mode === "service-polygon" && overlay.serviceKind === "stormwater") return "stormwater_wsud";
    if (/surface.?drain|open.?drain|sub.?soil/.test(text)) return "stormwater_surface_drain";
    if (/stormwater|drain|pipe network/.test(text)) return "stormwater_pipe";
    if (/hydrant/.test(text)) return "water_hydrant";
    if (/valve/.test(text)) return "water_valve";
    if (/meter/.test(text)) return "water_meter";
    if (/water.*service|service.*water/.test(text)) return "water_service";
    if (/water.*fitting|fitting.*water|recycled.*fitting/.test(text)) return "water_fitting";
    if (/water|recycled/.test(text)) return "water_pipe";
    if (/manhole|maintenance.?hole|sewer.*pit|pit.*well/.test(text)) return "sewer_node";
    if (/sewer.*fitting|fitting.*sewer/.test(text)) return "sewer_fitting";
    if (/sewer.*connection|connection.*sewer|sewer.*service/.test(text)) return "sewer_connection";
    if (/sewer/.test(text)) return "sewer_pipe";
    if (/path|footpath|bicycle/.test(text)) return "transport_pathway";
    if (/pavement|carpark|parking/.test(text)) return overlay.mode === "service-polygon" ? "transport_parking" : "transport_pavement";
    if (/island/.test(text)) return "transport_roadisland";
    if (/road|kerb|centre.?line|center.?line|segment|register/.test(text)) return "transport_roadedge";
    if (/park/.test(text)) return "generic";
    return getPlanStyleKeyForAssetKind(overlay.serviceKind, props);
  }

  function getPlanStyleKeyForAssetKind(serviceKind) {
    if (serviceKind === "water") return "water_pipe";
    if (serviceKind === "sewer") return "sewer_pipe";
    if (serviceKind === "stormwater") return "stormwater_pipe";
    if (serviceKind === "transport") return "transport_roadedge";
    if (serviceKind === "surface") return "surface_contour";
    return "generic";
  }

  function getAssetPathFromStructure(node) {
    const names = [];
    let current = node;
    while (current && current.nodeType === 1) {
      names.unshift(cleanName(current.tagName));
      current = current.parentElement;
    }
    const rootIndex = names.findIndex((name) => planStyleRoots.some((rootName) => rootName.toLowerCase() === name.toLowerCase()));
    const pathNames = rootIndex >= 0 ? names.slice(rootIndex) : names.slice(-3);
    return pathNames.filter(Boolean).join("/");
  }

  function getPlanLineWidthPx(style, selected) {
    const base = Math.max(1, (style.lineweightMm || 0.18) * 9);
    return selected ? base + 1.7 : base;
  }

  function getPlanPointRadiusPx(style, selected) {
    const compact = style.key === "sewer_fitting" || style.key === "stormwater_end_structure";
    const symbolScale = compact ? 0.55 : 1;
    const base = Math.max(3, (style.pointRadiusMm || 1) * 4.6 * symbolScale);
    return selected ? base + 1.6 : base;
  }

  function getRealWorldPointSymbolSize(feature, style, transform, sourcePoint, selected) {
    if (!isRealWorldSizedPointStyle(style)) return null;
    const size = getPointStructureSizeMetres(feature.attributes || {});
    if (!size) return null;
    const pixelsPerMetre = getPixelsPerMetreAtPoint(sourcePoint, transform);
    if (!pixelsPerMetre) return null;
    const minRadius = selected ? 4.2 : 3;
    return {
      radiusX: Math.max(minRadius, size.widthM * pixelsPerMetre.x / 2),
      radiusY: Math.max(minRadius, size.heightM * pixelsPerMetre.y / 2),
    };
  }

  function isRealWorldSizedPointStyle(style) {
    return style && (style.key === "stormwater_pit" || style.key === "sewer_node");
  }

  function getPointStructureSizeMetres(values = {}) {
    const diameter = getDimensionNumberByNames(values, [
      "ChamberSize_Diameter_mm",
      "ChamberSize_Diameter",
      "PitSize_Diameter_mm",
      "LidSize_Diameter_mm",
      "Diameter_mm",
      "Diameter",
    ]);
    if (diameter > 0) {
      const diameterM = dimensionToMetres(diameter);
      return { widthM: diameterM, heightM: diameterM };
    }

    let length = getDimensionNumberByNames(values, [
      "ChamberSize_Length_mm",
      "ChamberSize_Length",
      "PitSize_Length_mm",
      "LidSize_Length_mm",
      "Length_mm",
      "Length",
    ]);
    let width = getDimensionNumberByNames(values, [
      "ChamberSize_Width_mm",
      "ChamberSize_Width",
      "PitSize_Width_mm",
      "LidSize_Width_mm",
      "Width_mm",
      "Width",
    ]);

    if (!(length > 0 && width > 0)) {
      const textSize = parseDimensionText(getValueByNames(values, ["ChamberSize", "PitSize", "LidSize", "InletSize", "Size"]));
      if (textSize) {
        length = length || textSize.length;
        width = width || textSize.width;
      }
    }

    if (length > 0 && width > 0) {
      return {
        widthM: dimensionToMetres(length),
        heightM: dimensionToMetres(width),
      };
    }

    const singleSize = length || width;
    if (singleSize > 0) {
      const sizeM = dimensionToMetres(singleSize);
      return { widthM: sizeM, heightM: sizeM };
    }

    return null;
  }

  function getDimensionNumberByNames(values, names) {
    const value = getValueByNames(values, names);
    return parseSingleDimensionNumber(value);
  }

  function parseSingleDimensionNumber(value) {
    const text = String(value || "").trim();
    if (!text || /x/i.test(text)) return 0;
    const match = text.match(/\d+(?:\.\d+)?/);
    const number = match ? Number(match[0]) : 0;
    return Number.isFinite(number) ? number : 0;
  }

  function parseDimensionText(value) {
    const numbers = String(value || "").match(/\d+(?:\.\d+)?/g);
    if (!numbers || !numbers.length) return null;
    const first = Number(numbers[0]);
    const second = Number(numbers[1] || numbers[0]);
    if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
    return { length: first, width: second };
  }

  function dimensionToMetres(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number > 20 ? number / 1000 : number;
  }

  function getPixelsPerMetreAtPoint(sourcePoint, transform) {
    if (!sourcePoint || !transform) return null;
    if (transform.type !== "geo") {
      const scale = Number(transform.scale);
      return Number.isFinite(scale) && scale > 0 ? { x: scale, y: scale } : null;
    }

    const base = projectFeaturePoint(sourcePoint, transform);
    if (!base) return null;

    let east = null;
    let north = null;
    if (isMgaCoordinate(sourcePoint)) {
      east = projectFeaturePoint({ ...sourcePoint, x: sourcePoint.x + 1 }, transform);
      north = projectFeaturePoint({ ...sourcePoint, y: sourcePoint.y + 1 }, transform);
    } else {
      const latLng = toLatLng(sourcePoint);
      if (latLng) {
        const [lat, lng] = latLng;
        const metresPerDegreeLat = 111132;
        const metresPerDegreeLng = Math.max(1, 111320 * Math.cos(lat * Math.PI / 180));
        east = projectLatLngToScreen(lat, lng + 1 / metresPerDegreeLng, transform);
        north = projectLatLngToScreen(lat + 1 / metresPerDegreeLat, lng, transform);
      }
    }
    if (!east || !north) return null;
    return {
      x: Math.hypot(east.x - base.x, east.y - base.y),
      y: Math.hypot(north.x - base.x, north.y - base.y),
    };
  }

  function projectLatLngToScreen(lat, lng, transform) {
    const mercator = latLngToMercatorPoint(lat, lng);
    return {
      x: transform.offsetX + mercator.x * transform.baseScale,
      y: transform.offsetY + mercator.y * transform.baseScale,
    };
  }

  function getPlanDashForFeature(feature, style) {
    const values = { ...(feature.attributes || {}), Status: feature.status || "" };
    if (usesRemovedPlanStatus(values)) return abandonedPreviewDash;
    if (style.key === "cadastre_easement") return cadastreEasementPreviewDash;
    if (style.key === "transport_roadedge") return getRoadEdgePreviewDash(values);
    if (style.key === "water_pipe") return getWaterPipePreviewDash(values);
    if (style.key === "stormwater_pipe") return stormwaterPipePreviewDash;
    if (style.key === "stormwater_surface_drain") return stormwaterSurfaceDrainPreviewDash;
    if (style.key === "open_space_electrical_conduit") return [8, 3, 1.5, 3];
    if (style.key === "open_space_communication_conduit") return [4, 2];
    if (style.key === "open_space_irrigation_pipe") return [5, 2, 1.2, 2];
    if (style.key === "open_space_edging") return [3, 1.5];
    if (style.key === "open_space_barrier_continuous") return [3.5, 1.8];
    if (style.key === "open_space_retaining_wall") return [7, 2];
    if (style.key === "open_space_fauna_polyline") return [2, 2];
    if (style.key === "open_space_land_stabilisation") return [6, 2, 1.2, 2];
    return [];
  }

  function getOverlayDashForStyle(style, overlay, props) {
    if (style.key === "cadastre_easement") return cadastreEasementPreviewDash;
    if (style.key === "transport_roadedge") return getRoadEdgePreviewDash(props);
    if (style.key === "water_pipe") return getWaterPipePreviewDash(props);
    if (style.key === "stormwater_pipe") return stormwaterPipePreviewDash;
    if (style.key === "stormwater_surface_drain") return stormwaterSurfaceDrainPreviewDash;
    if (style.key === "open_space_electrical_conduit") return [8, 3, 1.5, 3];
    if (style.key === "open_space_communication_conduit") return [4, 2];
    if (style.key === "open_space_irrigation_pipe") return [5, 2, 1.2, 2];
    if (style.key === "open_space_edging") return [3, 1.5];
    if (style.key === "open_space_barrier_continuous") return [3.5, 1.8];
    if (style.key === "open_space_retaining_wall") return [7, 2];
    if (style.key === "open_space_fauna_polyline") return [2, 2];
    if (style.key === "open_space_land_stabilisation") return [6, 2, 1.2, 2];
    if (overlay.mode === "parcel") return [];
    return [];
  }

  function drawStyledScreenPath(points, options) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.lineWidth = options.lineWidth || 1.8;
    ctx.strokeStyle = options.stroke || "#000000";
    ctx.setLineDash(options.dash || []);
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    if (options.closePath) ctx.closePath();
    if (options.fill) {
      ctx.save();
      ctx.globalAlpha = options.fillAlpha == null ? ctx.globalAlpha : options.fillAlpha;
      ctx.fillStyle = options.fill;
      ctx.fill();
      ctx.restore();
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawSelectedPathHighlight(points, options = {}) {
    if (!points || points.length < 2) return;
    drawStyledScreenPath(points, {
      closePath: Boolean(options.closePath),
      dash: options.dash || [],
      lineWidth: (options.lineWidth || 2) + 5,
      stroke: "rgba(11, 31, 58, 0.78)",
    });
    drawStyledScreenPath(points, {
      closePath: Boolean(options.closePath),
      dash: options.dash || [],
      lineWidth: (options.lineWidth || 2) + 2.4,
      stroke: "rgba(255, 255, 255, 0.92)",
    });
  }

  function getOffsetScreenPaths(points, offset) {
    if (!points || points.length < 2 || !offset) return [points];
    return [getOffsetScreenPath(points, offset), getOffsetScreenPath(points, -offset)];
  }

  function getOffsetScreenPath(points, offset) {
    return points.map((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const length = Math.hypot(dx, dy);
      if (!length) return point;
      return {
        x: point.x + (-dy / length) * offset,
        y: point.y + (dx / length) * offset,
      };
    });
  }

  function drawPlanPointSymbol(point, style, selected, relatedPoints, values = {}, options = {}) {
    const realWorldSize = options.realWorldSize || null;
    const radius = realWorldSize ? realWorldSize.radiusX : getPlanPointRadiusPx(style, selected) * (options.radiusScale || 1);
    const radiusY = realWorldSize ? realWorldSize.radiusY : radius;
    const color = style.color;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = options.fill || color;
    ctx.lineWidth = options.lineWidth || (selected ? 2.4 : 1.8);
    ctx.setLineDash([]);

    if (selected) {
      ctx.save();
      ctx.strokeStyle = "rgba(11, 31, 58, 0.75)";
      ctx.lineWidth = options.selectedHaloWidth || 5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (style.key === "water_hydrant") {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      drawSymbolLine(point.x - radius, point.y, point.x + radius, point.y);
      drawSymbolLine(point.x, point.y - radiusY, point.x, point.y + radiusY);
    } else if (style.key === "water_valve") {
      const halfHeight = radiusY * 0.82;
      drawSymbolPolygon([[point.x - radius, point.y - halfHeight], [point.x, point.y], [point.x - radius, point.y + halfHeight]], false);
      drawSymbolPolygon([[point.x + radius, point.y - halfHeight], [point.x, point.y], [point.x + radius, point.y + halfHeight]], false);
    } else if (style.key === "water_meter") {
      drawSymbolPolyline(getRotatedSymbolPoints(point, [
        [-radius, -radiusY],
        [-radius, radiusY],
        [0, -radiusY * 0.18],
        [radius, radiusY],
        [radius, -radiusY],
        [-radius, -radiusY],
      ], options.rotation));
    } else if (style.key === "water_fitting" || style.key === "sewer_fitting") {
      drawSymbolRect(point.x - radius, point.y - radiusY, radius * 2, radiusY * 2);
    } else if (style.key === "sewer_node") {
      drawSewerNodeSymbol(point, radius, radiusY, values);
    } else if (style.key === "stormwater_pit") {
      drawStormwaterPitSymbol(point, radius, radiusY, values);
    } else if (style.key === "stormwater_end_structure") {
      drawStormwaterEndStructureSymbol(point, radius * 1.7, radiusY * 1.25);
    } else if (style.key === "open_space_sign") {
      drawSymbolPolygon([[point.x, point.y - radius], [point.x + radius, point.y], [point.x, point.y + radius], [point.x - radius, point.y]], false);
      drawSymbolLine(point.x, point.y + radius, point.x, point.y + radius * 1.75);
    } else if (style.key === "open_space_tree") {
      drawOpenSpaceTreeSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_activity_point") {
      drawOpenSpaceActivityPointSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_barbeque") {
      drawOpenSpaceBarbequeSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_table") {
      drawOpenSpaceTableSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_seat") {
      drawOpenSpaceSeatSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_bicycle_fitting") {
      drawOpenSpaceBicycleFittingSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_barrier_point") {
      drawOpenSpaceBarrierPointSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_waste_collection") {
      drawOpenSpaceWasteSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_shelter") {
      drawOpenSpaceShelterSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_artwork") {
      drawOpenSpaceArtworkSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_fauna_point") {
      drawOpenSpaceFaunaPointSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_electrical_pit") {
      drawOpenSpaceUtilityPitSymbol(point, radius, radiusY, "E");
    } else if (style.key === "open_space_communication_pit") {
      drawOpenSpaceUtilityPitSymbol(point, radius, radiusY, "C");
    } else if (style.key === "open_space_electrical_light") {
      drawOpenSpaceLightSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_irrigation_fitting") {
      drawOpenSpaceIrrigationFittingSymbol(point, radius, radiusY);
    } else if (style.key === "open_space_fixture") {
      drawOpenSpaceFixtureSymbol(point, radius, radiusY);
    } else if (style.key === "survey_mark") {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      drawSymbolLine(point.x - radius, point.y, point.x + radius, point.y);
      drawSymbolLine(point.x, point.y - radiusY, point.x, point.y + radiusY);
    } else if (style.key === "transport_pramramp") {
      drawSymbolPolygon([[point.x, point.y - radiusY], [point.x + radius, point.y + radiusY], [point.x - radius, point.y + radiusY]], false);
    } else {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 0.82, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSewerNodeSymbol(point, radius, radiusY, values) {
    const kind = getSewerNodeSymbolKind(values);
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (kind === "terminal_entry_point") {
      drawSymbolPolygon([[point.x, point.y - radiusY * 1.12], [point.x - radius * 1.05, point.y + radiusY * 0.86], [point.x + radius * 1.05, point.y + radiusY * 0.86]], false);
      return;
    }
    if (kind === "maintenance_shaft" || kind === "smart_pit") {
      drawSymbolLine(point.x - radius * 0.68, point.y - radiusY * 0.68, point.x + radius * 0.68, point.y + radiusY * 0.68);
      drawSymbolLine(point.x - radius * 0.68, point.y + radiusY * 0.68, point.x + radius * 0.68, point.y - radiusY * 0.68);
      if (kind === "smart_pit") {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 1.18, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(2, radius * 0.22), 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawStormwaterPitSymbol(point, radius, radiusY, values) {
    const kind = getStormwaterPitSymbolKind(values);
    const shape = getStormwaterPitShape(values);
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      drawSymbolRect(point.x - radius, point.y - radiusY, radius * 2, radiusY * 2);
    }
    if (kind === "maintenance_hole") {
      if (shape === "rectangular") {
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(2.4, Math.min(radius, radiusY) * 0.48), 0, Math.PI * 2);
        ctx.stroke();
        drawSymbolLine(point.x - radius * 0.62, point.y, point.x + radius * 0.62, point.y);
        drawSymbolLine(point.x, point.y - radiusY * 0.62, point.x, point.y + radiusY * 0.62);
      } else {
        drawSymbolLine(point.x - radius * 0.82, point.y, point.x + radius * 0.82, point.y);
        drawSymbolLine(point.x, point.y - radiusY * 0.82, point.x, point.y + radiusY * 0.82);
      }
    } else if (kind === "field_inlet") {
      drawSymbolLine(point.x - radius * 0.5, point.y - radiusY, point.x - radius * 0.5, point.y + radiusY);
      drawSymbolLine(point.x, point.y - radiusY, point.x, point.y + radiusY);
      drawSymbolLine(point.x + radius * 0.5, point.y - radiusY, point.x + radius * 0.5, point.y + radiusY);
    } else if (kind === "inlet") {
      drawSymbolRect(point.x - radius * 0.46, point.y - radiusY * 0.46, radius * 0.92, radiusY * 0.92);
    } else {
      drawSymbolLine(point.x - radius * 0.85, point.y, point.x + radius * 0.85, point.y);
      drawSymbolLine(point.x, point.y - radiusY * 0.85, point.x, point.y + radiusY * 0.85);
    }
  }

  function drawStormwaterEndStructureSymbol(point, radius, radiusY) {
    drawSymbolPolyline([[point.x - radius, point.y - radiusY], [point.x, point.y], [point.x + radius, point.y - radiusY]]);
    drawSymbolPolyline([[point.x - radius, point.y + radiusY * 0.15], [point.x, point.y + radiusY * 1.15], [point.x + radius, point.y + radiusY * 0.15]]);
  }

  function drawOpenSpaceTreeSymbol(point, radius, radiusY) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    drawSymbolLine(point.x - radius, point.y, point.x + radius, point.y);
    drawSymbolLine(point.x, point.y - radiusY, point.x, point.y + radiusY);
  }

  function drawOpenSpaceActivityPointSymbol(point, radius, radiusY) {
    drawSymbolPolygon([
      [point.x, point.y - radiusY],
      [point.x + radius * 0.95, point.y + radiusY * 0.34],
      [point.x - radius * 0.95, point.y + radiusY * 0.34],
    ], false);
    ctx.beginPath();
    ctx.arc(point.x, point.y + radiusY * 0.05, Math.max(2, radius * 0.22), 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawOpenSpaceBarbequeSymbol(point, radius, radiusY) {
    drawSymbolRect(point.x - radius * 0.92, point.y - radiusY * 0.62, radius * 1.84, radiusY * 1.24);
    for (const offset of [-0.42, 0, 0.42]) {
      drawSymbolLine(point.x - radius * 0.62, point.y + radiusY * offset, point.x + radius * 0.62, point.y + radiusY * offset);
    }
    drawSymbolLine(point.x - radius * 0.55, point.y + radiusY * 0.62, point.x - radius * 0.55, point.y + radiusY);
    drawSymbolLine(point.x + radius * 0.55, point.y + radiusY * 0.62, point.x + radius * 0.55, point.y + radiusY);
  }

  function drawOpenSpaceTableSymbol(point, radius, radiusY) {
    drawSymbolRect(point.x - radius, point.y - radiusY * 0.55, radius * 2, radiusY * 1.1);
    drawSymbolLine(point.x - radius * 0.65, point.y - radiusY * 0.55, point.x + radius * 0.65, point.y + radiusY * 0.55);
    drawSymbolLine(point.x + radius * 0.65, point.y - radiusY * 0.55, point.x - radius * 0.65, point.y + radiusY * 0.55);
  }

  function drawOpenSpaceSeatSymbol(point, radius, radiusY) {
    drawSymbolLine(point.x - radius, point.y - radiusY * 0.25, point.x + radius, point.y - radiusY * 0.25);
    drawSymbolLine(point.x - radius, point.y + radiusY * 0.28, point.x + radius, point.y + radiusY * 0.28);
    drawSymbolLine(point.x - radius * 0.72, point.y + radiusY * 0.28, point.x - radius * 0.72, point.y + radiusY);
    drawSymbolLine(point.x + radius * 0.72, point.y + radiusY * 0.28, point.x + radius * 0.72, point.y + radiusY);
  }

  function drawOpenSpaceBicycleFittingSymbol(point, radius, radiusY) {
    ctx.beginPath();
    ctx.arc(point.x - radius * 0.48, point.y + radiusY * 0.42, radius * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x + radius * 0.48, point.y + radiusY * 0.42, radius * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    drawSymbolLine(point.x - radius * 0.48, point.y + radiusY * 0.42, point.x, point.y - radiusY * 0.35);
    drawSymbolLine(point.x, point.y - radiusY * 0.35, point.x + radius * 0.48, point.y + radiusY * 0.42);
    drawSymbolLine(point.x - radius * 0.15, point.y + radiusY * 0.05, point.x + radius * 0.35, point.y + radiusY * 0.05);
    drawSymbolLine(point.x, point.y - radiusY * 0.35, point.x + radius * 0.26, point.y - radiusY * 0.82);
  }

  function drawOpenSpaceBarrierPointSymbol(point, radius, radiusY) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    drawSymbolLine(point.x, point.y - radiusY, point.x, point.y + radiusY);
  }

  function drawOpenSpaceWasteSymbol(point, radius, radiusY) {
    drawSymbolRect(point.x - radius * 0.72, point.y - radiusY * 0.55, radius * 1.44, radiusY * 1.35);
    drawSymbolLine(point.x - radius * 0.95, point.y - radiusY * 0.7, point.x + radius * 0.95, point.y - radiusY * 0.7);
    drawSymbolLine(point.x - radius * 0.35, point.y - radiusY * 0.95, point.x + radius * 0.35, point.y - radiusY * 0.95);
  }

  function drawOpenSpaceShelterSymbol(point, radius, radiusY) {
    drawSymbolPolygon([[point.x - radius, point.y - radiusY * 0.2], [point.x, point.y - radiusY], [point.x + radius, point.y - radiusY * 0.2]], false);
    drawSymbolLine(point.x - radius * 0.72, point.y - radiusY * 0.2, point.x - radius * 0.72, point.y + radiusY);
    drawSymbolLine(point.x + radius * 0.72, point.y - radiusY * 0.2, point.x + radius * 0.72, point.y + radiusY);
    drawSymbolLine(point.x - radius, point.y + radiusY, point.x + radius, point.y + radiusY);
  }

  function drawOpenSpaceArtworkSymbol(point, radius, radiusY) {
    drawSymbolPolygon([[point.x, point.y - radiusY], [point.x + radius, point.y], [point.x, point.y + radiusY], [point.x - radius, point.y]], false);
    drawSymbolLine(point.x - radius * 0.55, point.y - radiusY * 0.55, point.x + radius * 0.55, point.y + radiusY * 0.55);
    drawSymbolLine(point.x + radius * 0.55, point.y - radiusY * 0.55, point.x - radius * 0.55, point.y + radiusY * 0.55);
  }

  function drawOpenSpaceFaunaPointSymbol(point, radius, radiusY) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    drawSymbolPolygon([
      [point.x - radius * 0.55, point.y + radiusY * 0.12],
      [point.x, point.y - radiusY * 0.52],
      [point.x + radius * 0.55, point.y + radiusY * 0.12],
      [point.x + radius * 0.35, point.y + radiusY * 0.55],
      [point.x - radius * 0.35, point.y + radiusY * 0.55],
    ], false);
  }

  function drawOpenSpaceUtilityPitSymbol(point, radius, radiusY, label) {
    drawSymbolRect(point.x - radius, point.y - radiusY, radius * 2, radiusY * 2);
    drawSymbolText(label, point.x, point.y, Math.max(7, radius * 1.15));
  }

  function drawOpenSpaceLightSymbol(point, radius, radiusY) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      drawSymbolLine(
        point.x + Math.cos(angle) * radius * 0.72,
        point.y + Math.sin(angle) * radiusY * 0.72,
        point.x + Math.cos(angle) * radius * 1.28,
        point.y + Math.sin(angle) * radiusY * 1.28,
      );
    }
  }

  function drawOpenSpaceIrrigationFittingSymbol(point, radius, radiusY) {
    drawSymbolPolygon([[point.x, point.y - radiusY], [point.x + radius, point.y], [point.x, point.y + radiusY], [point.x - radius, point.y]], false);
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(2, radius * 0.28), 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawOpenSpaceFixtureSymbol(point, radius, radiusY) {
    drawSymbolPolygon([
      [point.x, point.y - radiusY],
      [point.x + radius * 0.86, point.y - radiusY * 0.5],
      [point.x + radius * 0.86, point.y + radiusY * 0.5],
      [point.x, point.y + radiusY],
      [point.x - radius * 0.86, point.y + radiusY * 0.5],
      [point.x - radius * 0.86, point.y - radiusY * 0.5],
    ], false);
  }

  function drawSymbolLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawSymbolPolyline(points) {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.stroke();
  }

  function getRotatedSymbolPoints(origin, localPoints, rotation = 0) {
    const angle = Number(rotation) || 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return localPoints.map(([x, y]) => [
      origin.x + x * cos - y * sin,
      origin.y + x * sin + y * cos,
    ]);
  }

  function drawSymbolPolygon(points, fill) {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
  }

  function drawSymbolRect(x, y, width, height) {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
  }

  function drawSymbolText(text, x, y, size) {
    ctx.save();
    ctx.font = `700 ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(text, x, y + size * 0.04);
    ctx.restore();
  }

  function getWaterPipePreviewDash(values) {
    if (isWaterConduit(values)) return [8, 4];
    const paperDash = getWaterPipeSpecPaperDash(values);
    return paperDash.map((value) => Math.max(1, Math.round(value * 2.7)));
  }

  function getWaterPipeSpecPaperDash(values) {
    const materialKey = getMaterialLineTypeKey(getValueByNames(values, ["Material"]));
    const classKey = getClassLineTypeKey(getValueByNames(values, ["Class"]));
    if (!materialKey && !classKey) return [];
    const bandDash = getWaterPipeBandPaperDash(values);
    const base = getMaterialPaperDash(materialKey) || bandDash;
    const classScale = getClassDashScale(getValueByNames(values, ["Class"]));
    return base.map((value) => Math.round(Math.max(0.45, value * classScale) * 100) / 100);
  }

  function getWaterPipeBandPaperDash(values) {
    const diameter = numericValue(getValueByNames(values, ["Diameter_mm", "Diameter", "DiameterMM", "NominalDiameter"]));
    if (diameter <= 100) return [2.8, 1.5];
    if (diameter <= 150) return [4.2, 1.4, 1, 1.4];
    if (diameter <= 225) return [3.8, 1.5, 0.8, 1.5];
    return [4.5, 1.6, 1.1, 1.6, 1.1, 1.6];
  }

  function getMaterialLineTypeKey(value) {
    const material = normalToken(value);
    if (!material) return "";
    if (["PE", "PE100", "PE80", "HDPE"].includes(material)) return "PE";
    if (["MSCL", "MS", "MILDSTEEL", "STEEL"].includes(material)) return "MSCL";
    if (["DI", "DICL", "DUCTILEIRON", "DUCTILEIRONCEMENTLINED"].includes(material)) return "DI";
    if (["PVCO", "PVCM", "PVCU", "UPVC", "PVC"].includes(material)) return material;
    return material.slice(0, 12);
  }

  function getClassLineTypeKey(value) {
    return normalToken(value).slice(0, 12);
  }

  function getMaterialPaperDash(materialKey) {
    if (materialKey === "PVCO") return [7, 1.6];
    if (["PVCU", "UPVC", "PVC", "PVCM"].includes(materialKey)) return [3.2, 1.2];
    if (materialKey === "PE") return [5.2, 1.4, 1, 1.4];
    if (materialKey === "MSCL") return [5, 1.4, 1, 1.4, 1, 1.4];
    if (materialKey === "DI") return [3.8, 1.3, 0.9, 1.3];
    return null;
  }

  function getClassDashScale(value) {
    const pipeClass = normalToken(value);
    if (!pipeClass) return 1;
    const digits = pipeClass.replace(/\D+/g, "");
    if (digits) {
      const number = Number(digits);
      if (number >= 35) return 1.22;
      if (number >= 21) return 1.12;
      if (number >= 16) return 1.04;
      if (number <= 9) return 0.88;
    }
    if (pipeClass.includes("SDR21")) return 1.12;
    return 1;
  }

  function getRoadEdgePreviewDash(values) {
    const code = getRoadEdgeProfileCode(values);
    const codeDashes = {
      B1: [5, 2, 1, 2],
      B2: [3, 1.5],
      B4: [3, 1.5],
      B6: [6, 2, 1, 2, 1, 2],
      B7: [3, 1.5],
      M1: [6, 2, 2, 2],
      M3: [6, 2, 1, 2, 1, 2, 1, 2],
      M4: [4, 2.5],
      M5: [4, 2.5],
      M6: [4, 2.5],
      SM2: [6, 2, 1.5, 2, 1.5, 2],
      SM3: [6, 2, 1.5, 2, 1.5, 2],
      SM4: [6, 2, 1.5, 2, 1.5, 2],
      SM5: [6, 2, 1.5, 2, 1.5, 2],
      ER1: [2.5, 1.5],
      ER2: [4, 1, 1, 1],
      INV600: [1, 2],
      INV900: [1, 2],
    };
    if (code) return codeDashes[code] || [];
    const typeDashes = {
      "BARRIER KERB": [3, 1.5],
      "BARRIER KERB AND CHANNEL": [5, 2, 1, 2],
      "SEMI-MOUNTABLE KERB": [6, 2, 1.5, 2, 1.5, 2],
      "MOUNTABLE KERB": [4, 2.5],
      "EDGE RESTRAINT": [4, 1, 1, 1],
      CHANNEL: [1, 2],
      "MOUNTABLE KERB AND CHANNEL": [6, 2, 2, 2],
    };
    return typeDashes[getRoadEdgeTypeKey(values)] || [];
  }

  function getRoadEdgeProfileCode(values) {
    const text = [
      getValueByNames(values, ["Notes"]),
      getValueByNames(values, ["Profile"]),
      getValueByNames(values, ["Type"]),
      getValueByNames(values, ["ADACId"]),
    ].join(" ").toUpperCase();
    const match = text.match(/\b(INV\s*(?:600|900)|SM\s*[2345]|ER\s*[12]|B\s*[12467]|M\s*[13456])\b/);
    return match ? match[1].replace(/\s+/g, "") : "";
  }

  function getRoadEdgeTypeKey(values) {
    return String(getValueByNames(values, ["Type"]) || "").trim().toUpperCase();
  }

  function isWaterConduit(values) {
    return String(getValueByNames(values, ["Use"]) || "").trim().toUpperCase() === "CONDUIT";
  }

  function usesRemovedPlanStatus(values) {
    const status = String(getValueByNames(values, ["Status", "LifecycleStatus", "ConstructionStatus"]) || "").toLowerCase();
    return /abandon|removed|remove|decommission|demolish|retired|redundant/.test(status);
  }

  function getSewerNodeSymbolKind(values) {
    const text = `${getValueByNames(values, ["Type", "Subtype", "Name"]) || ""}`.toLowerCase();
    if (/terminal|tep|entry/.test(text)) return "terminal_entry_point";
    if (/shaft/.test(text)) return "maintenance_shaft";
    if (/smart/.test(text)) return "smart_pit";
    return "maintenance_hole";
  }

  function getStormwaterPitSymbolKind(values) {
    const text = `${getValueByNames(values, ["Type", "Subtype", "Name", "Notes", "ADACId", "AssetID", "AssetId"]) || ""}`.toLowerCase();
    if (/maintenance|manhole|access|chamber|\bmh\b/.test(text)) return "maintenance_hole";
    if (/field/.test(text)) return "field_inlet";
    if (/inlet|gully|catch/.test(text)) return "inlet";
    return "pit";
  }

  function getStormwaterPitShape(values) {
    const text = `${getValueByNames(values, ["Shape", "Type", "Subtype"]) || ""}`.toLowerCase();
    if (/circle|circular|round|manhole/.test(text)) return "circle";
    return "rectangular";
  }

  function getValueByNames(values, names) {
    if (!values) return "";
    const entries = Object.entries(values);
    for (const name of names) {
      const target = cleanName(name).toLowerCase();
      const match = entries.find(([key]) => cleanName(key).toLowerCase() === target);
      if (match && match[1] != null) return String(match[1]).trim();
    }
    return "";
  }

  function getObjectByName(values, name) {
    if (!values) return null;
    const target = cleanName(name).toLowerCase();
    const match = Object.entries(values).find(([key]) => cleanName(key).toLowerCase() === target);
    const value = match ? match[1] : null;
    if (Array.isArray(value)) return value.find((item) => item && typeof item === "object" && !Array.isArray(item)) || null;
    return value && typeof value === "object" ? value : null;
  }

  function valueMatches(values, names, expected) {
    const target = String(expected || "").trim().toLowerCase();
    if (!target) return false;
    return names.some((name) => String(getValueByNames(values, [name]) || "").trim().toLowerCase() === target);
  }

  function componentNotesContain(values, needle) {
    const target = String(needle || "").trim().toLowerCase();
    if (!target) return false;
    const componentInfo = getObjectByName(values, "ComponentInfo");
    return [
      getValueByNames(values, ["Notes", "ComponentInfo_Notes"]),
      componentInfo ? getValueByNames(componentInfo, ["Notes"]) : "",
    ].some((text) => String(text || "").toLowerCase().includes(target));
  }

  function valuesLookLikeSprinkler(values) {
    const text = [
      getValueByNames(values, ["ADACId", "Use", "Type", "Name", "Notes", "ComponentInfo_Notes"]),
      componentNotesContain(values, "Sprinkler") ? "sprinkler" : "",
    ].join(" ").toLowerCase();
    return /\b(irrigation|sprinkler|spray|rotor|drip|bubbler)\b/.test(text);
  }

  function normalToken(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
  }

  function numericValue(value) {
    const number = Number(String(value || "").replace(/[^\d.-]+/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function hexToRgba(hex, alpha) {
    const value = String(hex || "#000000").replace("#", "");
    const full = value.length === 3
      ? value.split("").map((part) => part + part).join("")
      : value.padEnd(6, "0").slice(0, 6);
    const number = Number.parseInt(full, 16);
    const red = number >> 16 & 255;
    const green = number >> 8 & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function drawPointMarker(point, feature, selected, allPoints, transform = null, sourcePoint = null) {
    const style = getPlanStyleForFeature(feature);
    drawPlanPointSymbol(point, style, selected, allPoints, feature.attributes || {}, {
      realWorldSize: getRealWorldPointSymbolSize(feature, style, transform, sourcePoint, selected),
      rotation: getPointSymbolRotation(feature, style, point, transform),
    });
  }

  function getPointSymbolRotation(feature, style, screenPoint, transform) {
    if (style?.key !== "water_meter" || !screenPoint || !transform) return 0;
    const lot = findNearestLotForMeterSymbol(feature);
    if (!lot) return 0;
    const lotScreenPoints = getProjectedFeatureScreenPoints(lot, transform);
    if (lotScreenPoints.length < 3) return 0;
    const target = getClosestPointOnPolygonBoundary(screenPoint, lotScreenPoints);
    if (!target) return 0;
    const angleToBoundary = Math.atan2(target.y - screenPoint.y, target.x - screenPoint.x);
    return angleToBoundary + Math.PI / 2;
  }

  function drawEndpointMarker(point) {
    if (!point) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#0b1f3a";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  function drawGrid(width, height) {
    ctx.fillStyle = "#f8fbfe";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#e3ebf3";
    ctx.lineWidth = 1;

    const step = 48;
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function getFeatureLabelLines(feature) {
    if (shouldSuppressFeatureLabel(feature)) return [];
    const cacheKey = state.labelMode === "simple" ? "_simpleLabelLines" : "_detailedLabelLines";
    if (feature && Array.isArray(feature[cacheKey])) return feature[cacheKey];
    const id = formatReportValue(feature.id) || "Asset";
    const type = formatReportValue(feature.type);
    const primary = type && id && id !== "Asset" ? `${type} ${id}` : (type || id);
    if (state.labelMode === "simple") return cacheFeatureLabelLines(feature, cacheKey, [getSimpleFeatureLabel(feature)]);
    const generatorLabel = getGeneratorPlanLabel(feature);
    if (generatorLabel != null) {
      return cacheFeatureLabelLines(feature, cacheKey, withDetailedLabelAdacId(feature, String(generatorLabel).split(/\n+/).map((line) => line.trim()).filter(Boolean)));
    }
    const layer = formatReportValue(feature.layer).toUpperCase();
    return cacheFeatureLabelLines(feature, cacheKey, withDetailedLabelAdacId(feature, layer ? [layer, primary] : [primary]));
  }

  function cacheFeatureLabelLines(feature, cacheKey, lines) {
    const labelLines = (Array.isArray(lines) ? lines : [lines]).map((line) => String(line || "").trim()).filter(Boolean);
    if (feature) feature[cacheKey] = labelLines;
    return labelLines;
  }

  function withDetailedLabelAdacId(feature, lines) {
    const labelLines = (Array.isArray(lines) ? lines : [lines]).map((line) => String(line || "").trim()).filter(Boolean);
    if (!labelLines.length) return [];
    const adacId = formatReportValue(feature?.id || planLabelValue(getPlanLabelValues(feature), ["ADACId"]));
    if (!adacId) return labelLines;
    const normalizedAdacId = normalizeLabelToken(adacId);
    const firstLine = normalizeLabelToken(labelLines[0]);
    if (firstLine === normalizedAdacId || firstLine.startsWith(`${normalizedAdacId} `)) return labelLines;
    return [adacId, ...labelLines];
  }

  function getSimpleFeatureLabel(feature) {
    const specialistLabel = getSpecialistSimpleFeatureLabel(feature);
    if (specialistLabel) return specialistLabel;
    return formatReportValue(feature?.id)
      || planLabelValue(getPlanLabelValues(feature), ["ADACId"])
      || formatReportValue(feature?.type)
      || "Asset";
  }

  function getSpecialistSimpleFeatureLabel(feature) {
    if (!feature) return "";
    const id = formatReportValue(feature.id) || planLabelValue(getPlanLabelValues(feature), ["ADACId"]);
    if (id) return id;
    const path = normalizePlanAssetPath(feature.assetPath);
    if (path.startsWith("openspace/")) return getOpenSpaceSimpleFeatureLabel(feature);
    if (path.startsWith("electrical/")) return getElectricalSimpleFeatureLabel(feature);
    if (path.startsWith("communication/") || path.startsWith("communications/") || path.startsWith("telecommunications/")) return getCommunicationSimpleFeatureLabel(feature);
    const styleKey = getPlanStyleKeyForFeature(feature);
    if (String(styleKey || "").startsWith("open_space_")) return getOpenSpaceStyleSimpleFeatureLabel(styleKey, feature);
    return "";
  }

  function getOpenSpaceSimpleFeatureLabel(feature) {
    const values = getPlanLabelValues(feature);
    const path = normalizePlanAssetPath(feature.assetPath);
    if (path.startsWith("openspace/openspaceareas/")) return planLabelValue(values, ["Type", "Use", "Name"]) || "OPEN SPACE";
    if (path.startsWith("openspace/signs/")) return planLabelValue(values, ["SignText", "Type"]) || "SIGN";
    if (path.startsWith("openspace/trees/")) return planLabelValue(values, ["CommonName", "BotanicalName", "Species", "Type"]) || "TREE";
    if (path.startsWith("openspace/electricalconduits/")) return getOpenSpaceStyleSimpleFeatureLabel(getPlanStyleKeyForFeature(feature), feature);
    if (path.startsWith("openspace/electricalfittings/")) return getOpenSpaceStyleSimpleFeatureLabel(getPlanStyleKeyForFeature(feature), feature);
    if (path.startsWith("openspace/landscapeareas/")) return planLabelValue(values, ["Type", "Use", "SurfaceTreatment"]) || "LANDSCAPE";
    if (path.startsWith("openspace/activitylandscapeedging/")) return planLabelValue(values, ["Type", "Material"]) || "EDGING";
    if (path.startsWith("openspace/activityareas/")) return planLabelValue(values, ["Type", "Use"]) || "ACTIVITY";
    if (path.startsWith("openspace/activitypoints/")) return planLabelValue(values, ["Type", "Use"]) || "ACTIVITY POINT";
    if (path.startsWith("openspace/barbeques/")) return planLabelValue(values, ["Type", "Material"]) || "BBQ";
    if (path.startsWith("openspace/tables/")) return planLabelValue(values, ["Type", "Material"]) || "TABLE";
    if (path.startsWith("openspace/seats/")) return planLabelValue(values, ["Type", "Material"]) || "SEAT";
    if (path.startsWith("openspace/bicyclefittings/")) return planLabelValue(values, ["Type", "Use"]) || "BIKE FITTING";
    if (path.startsWith("openspace/barrierspoint/")) return planLabelValue(values, ["Type", "Use"]) || "BOLLARD";
    if (path.startsWith("openspace/barrierscontinuous/")) return planLabelValue(values, ["Type", "Use"]) || "BARRIER";
    if (path.startsWith("openspace/wastecollectionpoints/")) return planLabelValue(values, ["Type", "Use"]) || "BIN";
    if (path.startsWith("openspace/shelters/shelterpolygon")) return planLabelValue(values, ["Type", "Use"]) || "SHELTER";
    if (path.startsWith("openspace/shelters/")) return planLabelValue(values, ["Type", "Use"]) || "SHELTER";
    if (path.startsWith("openspace/artworks/")) return planLabelValue(values, ["Type", "Name", "Material"]) || "ARTWORK";
    if (path.startsWith("openspace/boatingfacilities/")) return planLabelValue(values, ["Type", "Use"]) || "BOATING";
    if (path.startsWith("openspace/retainingwalls/")) return planLabelValue(values, ["Type", "WallMaterial", "Material"]) || "RETAINING WALL";
    if (path.startsWith("openspace/buildings/")) return planLabelValue(values, ["Type", "Use", "Name"]) || "BUILDING";
    if (path.startsWith("openspace/platforms/")) return planLabelValue(values, ["Type", "Use", "Material"]) || "PLATFORM";
    if (path.startsWith("openspace/faunainfrastructure/")) return planLabelValue(values, ["Type", "Use", "Name"]) || "FAUNA";
    if (path.startsWith("openspace/landstabilisation/")) return planLabelValue(values, ["Type", "Treatment", "Material"]) || "LAND STABILISATION";
    if (path.startsWith("openspace/preparedsurfaces/")) return planLabelValue(values, ["Type", "Use", "SurfaceTreatment", "Material"]) || "PREPARED SURFACE";
    if (path.startsWith("openspace/generalfixtures/")) return planLabelValue(values, ["Type", "Use", "Name"]) || "FIXTURE";
    return getOpenSpaceStyleSimpleFeatureLabel(getPlanStyleKeyForFeature(feature), feature);
  }

  function getOpenSpaceStyleSimpleFeatureLabel(styleKey, feature) {
    const values = getPlanLabelValues(feature);
    const mapping = {
      open_space_area: "OPEN SPACE",
      open_space_sign: "SIGN",
      open_space_electrical_conduit: "ELEC CONDUIT",
      open_space_electrical_pit: "ELEC PIT",
      open_space_electrical_light: "LIGHT",
      open_space_communication_conduit: "COMM CONDUIT",
      open_space_communication_pit: "COMM PIT",
      open_space_irrigation_pipe: "IRRIGATION",
      open_space_irrigation_fitting: "IRR FITTING",
      open_space_landscape_area: "LANDSCAPE",
      open_space_edging: "EDGING",
      open_space_tree: "TREE",
      open_space_activity_area: "ACTIVITY",
      open_space_activity_point: "ACTIVITY POINT",
      open_space_barbeque: "BBQ",
      open_space_table: "TABLE",
      open_space_seat: "SEAT",
      open_space_bicycle_fitting: "BIKE FITTING",
      open_space_barrier_point: "BOLLARD",
      open_space_barrier_continuous: "BARRIER",
      open_space_waste_collection: "BIN",
      open_space_shelter: "SHELTER",
      open_space_shelter_polygon: "SHELTER",
      open_space_artwork: "ARTWORK",
      open_space_boating_facility: "BOATING",
      open_space_retaining_wall: "RETAINING WALL",
      open_space_building: "BUILDING",
      open_space_platform: "PLATFORM",
      open_space_fauna_point: "FAUNA",
      open_space_fauna_polyline: "FAUNA",
      open_space_land_stabilisation: "LAND STABILISATION",
      open_space_prepared_surface: "PREPARED SURFACE",
      open_space_fixture: "FIXTURE",
    };
    return planLabelValue(values, ["Type", "Use", "Name"]) || mapping[styleKey] || "OPEN SPACE";
  }

  function getElectricalSimpleFeatureLabel(feature) {
    const values = getPlanLabelValues(feature);
    const path = normalizePlanAssetPath(feature.assetPath);
    if (path.startsWith("electrical/lights/")) return planLabelValue(values, ["Type", "Use"]) || "LIGHT";
    if (path.startsWith("electrical/conduits/")) return planLabelValue(values, ["Type", "Use"]) || "ELEC CONDUIT";
    if (path.startsWith("electrical/pits/")) return planLabelValue(values, ["Type", "Use"]) || "ELEC PIT";
    return planLabelValue(values, ["Type", "Use", "Name"]) || "ELECTRICAL";
  }

  function getCommunicationSimpleFeatureLabel(feature) {
    const values = getPlanLabelValues(feature);
    const path = normalizePlanAssetPath(feature.assetPath);
    if (path.startsWith("communication/conduits/") || path.startsWith("communications/conduits/") || path.startsWith("telecommunications/conduits/")) return planLabelValue(values, ["Type", "Use"]) || "COMM CONDUIT";
    if (path.startsWith("communication/pits/") || path.startsWith("communications/pits/") || path.startsWith("telecommunications/pits/")) return planLabelValue(values, ["Type", "Use"]) || "COMM PIT";
    return planLabelValue(values, ["Type", "Use", "Name"]) || "COMMUNICATION";
  }

  function normalizeLabelToken(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  }

  function isFeatureLabelable(feature) {
    if (!feature || shouldSuppressFeatureLabel(feature)) return false;
    return Boolean(formatReportValue(feature.id) || formatReportValue(feature.type) || formatReportValue(feature.layer));
  }

  function shouldShowFeatureLabel(feature) {
    if (!isFeatureLabelable(feature)) return false;
    const layer = state.layers.get(feature.layer);
    if (layer && !layer.labelVisible) return false;
    const layerType = layer ? layer.types.get(feature.assetTag) : null;
    if (layerType && !layerType.labelVisible) return false;
    return true;
  }

  function shouldSuppressFeatureLabel(feature) {
    if (!feature) return false;
    if (planPathStarts(feature, "transport/roadedges/")) return true;
    if (planPathStarts(feature, "cadastre/landparcels/roadreserve")) return true;
    return isSubsoilDrainFeature(feature);
  }

  function isSubsoilDrainFeature(feature) {
    const path = normalizePlanAssetPath(feature?.assetPath);
    if (path.includes("subsoil") && path.includes("drain")) return true;
    const text = [
      feature?.layer,
      feature?.type,
      feature?.id,
      planLabelValue(feature?.attributes, ["Type", "Name", "AssetType", "Use"]),
      planLabelValue(feature?.fullAttributes, ["Type", "Name", "AssetType", "Use"]),
    ].join(" ").toLowerCase();
    return /sub[\s_-]*soil/.test(text) && /drain/.test(text);
  }

  function getGeneratorPlanLabel(feature) {
    const values = getPlanLabelValues(feature);
    const statusOnly = planStatusOnlyLabelForFeature(feature, values);
    if (statusOnly) return statusOnly;
    if (planPathStarts(feature, "cadastre/landparcels/roadreserve")) return planRoadReserveLabel(values);
    if (planPathStarts(feature, "cadastre/landparcels/lot")) return planLotLabel(values);
    if (planPathStarts(feature, "cadastre/easements/easement")) return planEasementLabel(values);
    if (planPathStarts(feature, "surface/contours/")) return planSurfaceContourLabel(feature, values);
    if (planPathStarts(feature, "watersupply/pipes/")) return planWaterPipeLabel(values);
    if (planPathStarts(feature, "sewerage/pipes")) return planSewerPipeLabel(values);
    if (planPathStarts(feature, "stormwater/pipes/")) return planStormwaterPipeLabel(values);
    if (planPathStarts(feature, "sewerage/connections/")) return planHouseConnectionLabel(values);
    if (planPathStarts(feature, "watersupply/valves/")) return planValveLabel(values);
    if (planPathStarts(feature, "watersupply/hydrants/")) return planIsDuckfootHydrant(values) ? "DFH" : "FH";
    if (planPathStarts(feature, "watersupply/meters/")) return planWaterMeterLabel(values);
    if (planPathStarts(feature, "watersupply/waterservices/")) return "";
    if (planPathStarts(feature, "sewerage/fittings/")) return planSewerFittingLabel(values, feature.id);
    if (planPathStarts(feature, "watersupply/fittings/")) return planFittingLabel(values);
    if (planPathStarts(feature, "sewerage/maintenanceholes/")) return planSewerNodeLabel(values);
    if (planPathStarts(feature, "stormwater/pits/")) return planStormwaterPitLabel(values);
    if (planPathStarts(feature, "stormwater/endstructures/")) return planStormwaterEndStructureLabel(values);
    if (planPathStarts(feature, "stormwater/wsudpolylines/")) return planFlowManagementDeviceLabel(values);
    if (planPathStarts(feature, "stormwater/wsudareas/")) return planWsudLabel(values);
    if (planPathStarts(feature, "stormwater/surfacedrains/")) return planSurfaceDrainLabel(values);
    if (planPathStarts(feature, "transport/pathways/")) return planPathwayLabel(values);
    if (planPathStarts(feature, "transport/pavementareas/")) return planPavementLabel(values);
    if (planPathStarts(feature, "transport/parkingareas/")) return "PARKING";
    if (planPathStarts(feature, "transport/roadislands/")) return planRoadIslandLabel(values);
    if (planPathStarts(feature, "transport/pramramps/")) return planPramRampLabel(values);
    if (planPathStarts(feature, "transport/roadedges/")) return "";
    if (planPathStarts(feature, "openspace/openspaceareas/")) return planOpenSpaceGenericLabel(values, "Open Space Area");
    if (planPathStarts(feature, "openspace/signs/")) return planLabelValue(values, ["SignText", "Type"]) || "Sign";
    if (planPathStarts(feature, "openspace/trees/")) return planTreeLabel(values);
    if (planPathStarts(feature, "openspace/barrierscontinuous/")) return planOpenSpaceBarrierContinuousLabel(values);
    if (planPathStarts(feature, "openspace/bicyclefittings/")) return planLabelValue(values, ["Type"]) || "Bicycle Fitting";
    if (planPathStarts(feature, "openspace/activityareas/")) return planLabelValue(values, ["Type", "Use"]) || "Activity Area";
    if (planPathStarts(feature, "openspace/activitylandscapeedging/")) return planLabelValue(values, ["Type", "Material"]) || "Edging";
    if (planPathStarts(feature, "openspace/activitypoints/")) return planLabelValue(values, ["Type", "Use"]) || "Activity Point";
    if (planPathStarts(feature, "openspace/barbeques/")) return planLabelValue(values, ["Type", "Material"]) || "Barbeque";
    if (planPathStarts(feature, "openspace/tables/")) return planLabelValue(values, ["Type", "Material"]) || "Table";
    if (planPathStarts(feature, "openspace/landscapeareas/")) return planLabelValue(values, ["Type", "Use", "SurfaceTreatment"]) || "Landscape Area";
    if (planPathStarts(feature, "openspace/seats/")) return planLabelValue(values, ["Type", "Material"]) || "Seat";
    if (planPathStarts(feature, "openspace/barrierspoint/")) return planLabelValue(values, ["Type", "Use"]) || "Bollard";
    if (planPathStarts(feature, "openspace/wastecollectionpoints/")) return planLabelValue(values, ["Type", "Use"]) || "Bin";
    if (planPathStarts(feature, "openspace/shelters/shelterpolygon")) return planLabelValue(values, ["Type", "Use"]) || "Shelter";
    if (planPathStarts(feature, "openspace/shelters/")) return planLabelValue(values, ["Type", "Use"]) || "Shelter";
    if (planPathStarts(feature, "openspace/artworks/")) return planLabelValue(values, ["Type", "Name", "Material"]) || "Artwork";
    if (planPathStarts(feature, "openspace/boatingfacilities/")) return planLabelValue(values, ["Type", "Use"]) || "Boating Facility";
    if (planPathStarts(feature, "openspace/retainingwalls/")) return planLabelValue(values, ["Type", "WallMaterial", "Material"]) || "Retaining Wall";
    if (planPathStarts(feature, "openspace/buildings/")) return planLabelValue(values, ["Type", "Use", "Name"]) || "Building";
    if (planPathStarts(feature, "openspace/platforms/")) return planLabelValue(values, ["Type", "Use", "Material"]) || "Platform";
    if (planPathStarts(feature, "openspace/faunainfrastructure/")) return planLabelValue(values, ["Type", "Use", "Name"]) || "Fauna Infrastructure";
    if (planPathStarts(feature, "openspace/landstabilisation/")) return planLabelValue(values, ["Type", "Treatment", "Material"]) || "Land Stabilisation";
    if (planPathStarts(feature, "openspace/preparedsurfaces/")) return planLabelValue(values, ["Type", "Use", "SurfaceTreatment", "Material"]) || "Prepared Surface";
    if (planPathStarts(feature, "openspace/generalfixtures/")) return planLabelValue(values, ["Type", "Use", "Name"]) || "Fixture";
    if (planPathStarts(feature, "openspace/electricalconduits/")) return planLabelValue(values, ["Type", "Use"]) || "Electrical Conduit";
    if (planPathStarts(feature, "openspace/electricalfittings/")) return planLabelValue(values, ["Type", "Use"]) || "Electrical Fitting";
    return null;
  }

  function getPlanLabelValues(feature) {
    const values = {
      ...(feature.fullAttributes || {}),
      ...(feature.labelValues || {}),
    };
    if (!planLabelValue(values, ["Status"])) values.Status = feature.status || "";
    if (!planLabelValue(values, ["ADACId"])) values.ADACId = feature.id || "";
    return values;
  }

  function planPathStarts(feature, prefix) {
    return normalizePlanAssetPath(feature.assetPath).startsWith(normalizePlanAssetPath(prefix));
  }

  function normalizePlanAssetPath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^stormwater\//i, "stormwater/").toLowerCase();
  }

  function planLabelValue(values, names) {
    if (!values) return "";
    const entries = Object.entries(values);
    for (const name of names) {
      const target = cleanName(name).toLowerCase();
      const match = entries.find(([key]) => cleanName(key).toLowerCase() === target);
      if (match) return planLabelText(match[1]);
    }
    return "";
  }

  function planLabelObject(values, name) {
    if (!values) return null;
    const target = cleanName(name).toLowerCase();
    const match = Object.entries(values).find(([key]) => cleanName(key).toLowerCase() === target);
    const value = match ? match[1] : null;
    if (Array.isArray(value)) return value.find((item) => item && typeof item === "object" && !Array.isArray(item)) || null;
    return value && typeof value === "object" ? value : null;
  }

  function planLabelText(value) {
    if (value == null) return "";
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = planLabelText(item);
        if (text) return text;
      }
      return "";
    }
    if (typeof value === "object") return "";
    return String(value).trim();
  }

  function planCleanText(value) {
    return planLabelText(value);
  }

  function planFormatDiameter(value) {
    const text = planLabelText(value);
    if (!text) return "";
    const number = Number(text);
    return Number.isFinite(number) ? `Ø${Math.round(number)}` : "";
  }

  function planFormatPlainSize(value) {
    const text = planLabelText(value);
    if (!text) return "";
    const number = Number(text);
    return Number.isFinite(number) ? String(Math.round(number)) : text;
  }

  function planPipeSpecLabel(values) {
    return [
      planFormatDiameter(planLabelValue(values, ["Diameter_mm"])),
      planLabelValue(values, ["Material"]),
      planLabelValue(values, ["Class"]),
    ].filter(Boolean).join(" ");
  }

  function planWaterPipeLabel(values) {
    const statusLabel = planStatusAssetTypeLabel("water_pipe", values);
    return statusLabel || planPipeSpecLabel(values);
  }

  function planLotLabel(values) {
    const lot = planLabelValue(values, ["LotNo"]);
    const plan = planLabelValue(values, ["PlanNo", "PlanNumber"]);
    const label = lot ? `LOT ${lot}` : "LOT";
    return plan ? `${label}\n${plan}` : label;
  }

  function planRoadReserveLabel(values) {
    return planLabelValue(values, ["Name", "RoadName", "Road", "ReserveName"]) || "ROAD RESERVE";
  }

  function planEasementLabel(values) {
    const label = planLabelValue(values, ["LotNo"]).toUpperCase();
    if (label.startsWith("COV ")) return label;
    if (!label) return "EMT";
    if (label.startsWith("EMT ")) return label;
    if (label.startsWith("EASEMENT ")) return label.replace(/^EASEMENT\s+/i, "EMT ");
    return `EMT ${label}`;
  }

  function planConnectionLabel(values) {
    const diameter = planFormatDiameter(planLabelValue(values, ["Diameter_mm"]));
    return diameter ? `HC ${diameter}` : "HC";
  }

  function planValveLabel(values) {
    const use = planLabelValue(values, ["Use"]).toUpperCase();
    const valveType = planLabelValue(values, ["Type"]).toUpperCase();
    if (use.includes("STOP") || valveType.includes("GATE")) return "SV";
    if (valveType.includes("AIR")) return "AV";
    return "VALVE";
  }

  function planFittingLabel(values) {
    const fittingType = planLabelValue(values, ["Type"]).toUpperCase();
    if (fittingType.includes("BEND")) return "BEND";
    if (fittingType.includes("TEE")) {
      const body = planFormatPlainSize(planLabelValue(values, ["BodySize_mm"]));
      const branch = planFormatPlainSize(planLabelValue(values, ["BranchSize_mm"]));
      return `TEE ${[body, branch].filter(Boolean).join(" X ")}`.trim();
    }
    if (fittingType.includes("GIBAULT")) return "GIB";
    if (fittingType.includes("DEAD END") || fittingType.includes("END CAP") || fittingType === "END") return "END";
    if (fittingType.includes("REDUC")) return "RED";
    if (fittingType.includes("CONNECT")) return "CONN";
    if (fittingType.includes("TAPPING BAND")) return planIsEfTappingSaddle(values) ? "TS" : "TB";
    if (fittingType.includes("READY TAP")) return "RT";
    return fittingType || "FIT";
  }

  function planSewerFittingLabel(values, fallbackId = "") {
    const adacId = planLabelValue(values, ["ADACId"]) || fallbackId;
    if (adacId) return adacId;
    return planFittingTypeLabel(planLabelValue(values, ["Type"]));
  }

  function planFittingTypeLabel(value) {
    const text = String(value || "").trim().toUpperCase();
    if (text.includes("WYE")) return "WYE";
    if (text.includes("TEE")) return "TEE";
    if (text.includes("BEND")) return "BEND";
    if (text.includes("DEAD END") || text.includes("END CAP")) return "END";
    if (text.includes("REDUC")) return "REDUCER";
    return text || "FITTING";
  }

  function planIsEfTappingSaddle(values) {
    const componentInfo = planLabelObject(values, "ComponentInfo");
    const notes = planLabelValue(values, ["Notes"]) || planLabelText(componentInfo?.Notes);
    return notes.toUpperCase().includes("EF TAPPING SADDLE");
  }

  function planIsDuckfootHydrant(values) {
    const componentInfo = planLabelObject(values, "ComponentInfo");
    const notes = planLabelValue(values, ["Notes"]) || planLabelText(componentInfo?.Notes);
    return /\bDUCK\s*FOOT\s+HYDRANT\b|\bDUCKFOOT\s+HYDRANT\b/i.test(notes);
  }

  function planWaterMeterLabel(values) {
    const serial = planLabelValue(values, ["SerialNumber"]);
    if (serial && !planIsPlaceholderWaterMeterSerial(serial, values)) return planWaterMeterSerialLabel(serial);
    return "WM";
  }

  function planWaterMeterSerialLabel(serial) {
    const text = String(serial || "").trim();
    if (!text) return "WM";
    return text;
  }

  function planIsPlaceholderWaterMeterSerial(serial, values) {
    const text = String(serial || "").trim().toUpperCase();
    if (["UNKNOWN", "N/A", "NA", "NONE", "NULL", "-", "SN-{HANDLE}", "SN-HANDLE"].includes(text)) return true;
    const adacId = planLabelValue(values, ["ADACId"]).toUpperCase();
    return adacId.startsWith("WM-") && text === `SN-${adacId.slice(3)}`;
  }

  function planStormwaterPipeLabel(values) {
    const structure = planLabelObject(values, "PipeStructure");
    const cells = planLabelValue(values, ["Cells"]);
    let sizeText = "";
    if (structure) {
      for (const key of ["CircPipe", "EggPipe", "BoxPipe", "ArchPipe"]) {
        const candidate = planLabelObject(structure, key);
        if (!candidate) continue;
        const diameter = planFormatDiameter(planLabelValue(candidate, ["Diameter_mm"]));
        const material = planLabelValue(candidate, ["Material"]);
        const pipeClass = planLabelValue(candidate, ["Class"]);
        if (diameter) {
          const spec = [diameter, material, pipeClass].filter(Boolean).join(" ");
          sizeText = [cells, spec].filter(Boolean).join(" / ");
        } else {
          const dims = ["Width_mm", "Height_mm", "Span_mm", "Rise_mm"]
            .map((dimKey) => planFormatPlainSize(planLabelValue(candidate, [dimKey])))
            .filter(Boolean);
          const spec = key === "BoxPipe"
            ? [dims.join("x"), planBoxPipeMaterialLabel(material)].filter(Boolean).join(" ")
            : [dims.join("x"), material, pipeClass, key.replace("Pipe", "").toUpperCase()].filter(Boolean).join(" ");
          sizeText = [cells, spec].filter(Boolean).join(" / ");
        }
        break;
      }
    }
    const statusLabel = planStatusAssetTypeLabel("stormwater_pipe", values);
    return [
      statusLabel,
      `UIL ${planLabelValue(values, ["US_InvertLevel_m"])}`.trim(),
      `DIL ${planLabelValue(values, ["DS_InvertLevel_m"])}`.trim(),
      sizeText || [cells, planLabelValue(values, ["Material"])].filter(Boolean).join(" / "),
      planLabelValue(values, ["Length_m"]) ? `${planLabelValue(values, ["Length_m"])}m` : "",
    ].filter(Boolean).join("\n");
  }

  function planBoxPipeMaterialLabel(material) {
    return String(material || "").replace(/\bBOX\b/ig, " ").trim();
  }

  function planSewerPipeLabel(values) {
    const statusLabel = planStatusAssetTypeLabel("sewer_pipe", values);
    if (statusLabel) return statusLabel;
    const spec = [
      planFormatDiameter(planLabelValue(values, ["Diameter_mm"])),
      planLabelValue(values, ["Material"]),
      planLabelValue(values, ["Class"]),
    ].filter(Boolean).join(" ");
    return [
      `UIL ${planFormatMeasure(planLabelValue(values, ["US_InvertLevel_m"]), 3)}`,
      `DIL ${planFormatMeasure(planLabelValue(values, ["DS_InvertLevel_m"]), 3)}`,
      spec,
      `${planFormatMeasure(planLabelValue(values, ["Length_m"]), 3)}m`,
    ].filter(Boolean).join("\n");
  }

  function planHouseConnectionLabel(values) {
    const statusLabel = planStatusAssetTypeLabel("sewer_connection", values);
    if (statusLabel) return statusLabel;
    const connectionType = planLabelValue(values, ["Type"]).toUpperCase();
    const isStub = connectionType.includes("STUB");
    const diameter = planFormatDiameter(planLabelValue(values, ["Diameter_mm"]));
    return [
      `HCB ${planFormatMeasure(isStub ? 0 : planLabelValue(values, ["Chainage_m"]), 2)}`,
      isStub && diameter ? `${diameter} STUB` : "",
      `OFFSET ${planFormatMeasure(planLabelValue(values, ["Offset_m"]), 2)}`,
      `SL ${planFormatMeasure(planLabelValue(values, ["SurfaceLevel_m"]), 2)}`,
      `IL ${planFormatMeasure(planLabelValue(values, ["InvertLevel_m"]), 2)}`,
    ].filter(Boolean).join("\n");
  }

  function planSewerNodeLabel(values) {
    const statusLabel = planStatusAssetTypeLabel("sewer_node", values);
    if (statusLabel && !planExistingStructureCanKeepDetail("sewer_node", values)) return statusLabel;
    const nodeReference = planCleanNodeReference(values);
    const surface = planSurfaceLevelLabel(values);
    return [nodeReference, surface ? `SL${surface}` : ""].filter(Boolean).join("\n") || planLabelValue(values, ["ADACId"]);
  }

  function planCleanNodeReference(values) {
    const adacId = planLabelValue(values, ["ADACId"]);
    return adacId.toUpperCase().startsWith("MH") ? adacId.slice(2) : adacId;
  }

  function planStormwaterPitLabel(values) {
    const pitId = planLabelValue(values, ["PitNumber"]) || planLabelValue(values, ["ADACId"]) || "PIT";
    const statusLabel = planStatusAssetTypeLabel("stormwater_pit", values);
    if (statusLabel && !planExistingStructureCanKeepDetail("stormwater_pit", values)) return statusLabel;
    const surface = planLabelValue(values, ["SurfaceLevel_m"]);
    return [pitId, surface ? `SL${surface}` : ""].filter(Boolean).join("\n");
  }

  function planStormwaterEndStructureLabel(values) {
    const structureId = planLabelValue(values, ["StructureID"]) || planLabelValue(values, ["ADACId"]) || "END STRUCTURE";
    const statusLabel = planStatusAssetTypeLabel("stormwater_end_structure", values);
    if (statusLabel && !planExistingStructureCanKeepDetail("stormwater_end_structure", values)) return statusLabel;
    const surface = planLabelValue(values, ["StructureLevel_m"]);
    return [structureId, surface ? `SL${surface}` : ""].filter(Boolean).join("\n");
  }

  function planWsudLabel(values) {
    return planLabelValue(values, ["Sqid_Id"]) || planLabelValue(values, ["ADACId"]) || planLabelValue(values, ["TreatmentMeasure"]);
  }

  function planFlowManagementDeviceLabel(values) {
    return planLabelValue(values, ["Sqid_Id"]) || planLabelValue(values, ["ADACId"]) || planLabelValue(values, ["Type"]);
  }

  function planSurfaceDrainLabel(values) {
    const material = planLabelValue(values, ["LiningMaterial", "BatterMaterial", "Material"]);
    const label = material ? `${material} Surface Drain` : "Surface Drain";
    return planStatusPrefixedLabel("stormwater_surface_drain", values, label);
  }

  function planPathwayLabel(values) {
    const width = planLabelValue(values, ["Width_m"]);
    return width ? `${width}m PATHWAY` : "PATHWAY";
  }

  function planPavementLabel(values) {
    const lines = [];
    const name = planLabelValue(values, ["ADACId"]) || planLabelValue(values, ["Name"]);
    if (name) lines.push(name);
    const surface = planLabelObject(values, "Surface");
    if (surface) {
      const type = planLabelValue(surface, ["SurfaceType"]);
      const thickness = planLabelValue(surface, ["SurfaceThickness_mm"]);
      if (type || thickness) lines.push(`SURFACE: ${[thickness ? `${thickness}mm` : "", type].filter(Boolean).join(" ")}`);
    }
    const structure = planLabelObject(values, "PavementStructure");
    if (structure) {
      const base = planLabelObject(structure, "BaseLayer");
      const subBase = planLabelObject(structure, "SubBaseLayer");
      const lowerSubBase = planLabelObject(structure, "LowerSubBaseLayer");
      if (base) lines.push(planPavementLayerLine("BASE", base));
      if (subBase) lines.push(planPavementLayerLine("SUB BASE", subBase));
      if (lowerSubBase) lines.push(planPavementLayerLine("LOWER SUB BASE", lowerSubBase));
    }
    const subGrade = planLabelObject(values, "SubGrade");
    const cbr = subGrade ? planLabelValue(subGrade, ["CBR"]) : "";
    if (cbr) lines.push(`SUBGRADE CBR: ${cbr}`);
    return lines.filter(Boolean).join("\n");
  }

  function planPavementLayerLine(label, layer) {
    const depth = planLabelValue(layer, ["LayerDepth_mm"]);
    const type = planLabelValue(layer, ["LayerType"]);
    return `${label}: ${[depth ? `${depth}mm` : "", type].filter(Boolean).join(" ")}`.trim();
  }

  function planRoadIslandLabel(values) {
    return planLabelValue(values, ["Type"]).toUpperCase() || "ROAD ISLAND";
  }

  function planPramRampLabel(values) {
    return "";
  }

  function planOpenSpaceGenericLabel(values, fallback) {
    return planLabelValue(values, ["Type", "Use", "Name", "Material", "SurfaceTreatment", "Treatment"]) || fallback;
  }

  function planTreeLabel(values) {
    const genus = planLabelValue(values, ["Genus"]);
    const species = planLabelValue(values, ["Species"]);
    if (genus && species) return `${genus.slice(0, 3).toUpperCase()} ${species.slice(0, 3).toLowerCase()}`;
    if (genus) return genus.slice(0, 3).toUpperCase();
    if (species) return species.slice(0, 3).toUpperCase();
    return "Tree";
  }

  function planOpenSpaceBarrierContinuousLabel(values) {
    const barrierType = planLabelValue(values, ["Type"]).toUpperCase();
    return barrierType.includes("GATE") ? "Gate" : (planLabelValue(values, ["Type", "Use"]) || "Barrier");
  }

  function planSurfaceContourLabel(feature, values) {
    for (const key of ["RL_m", "Elevation_m", "Elevation", "Level_m", "Level", "ContourLevel_m", "ContourLevel", "Contour", "Z"]) {
      const text = planFormatOptionalMeasure(planLabelValue(values, [key]), 2);
      if (text) return text;
    }
    const zValues = (feature.points || []).map((point) => point.z).filter((value) => value != null && value !== "");
    const numeric = zValues.map(Number).filter(Number.isFinite);
    if (!numeric.length) return "";
    if (Math.max(...numeric) - Math.min(...numeric) > 0.01) return "";
    return planFormatOptionalMeasure(numeric.reduce((total, value) => total + value, 0) / numeric.length, 2);
  }

  function planStatusOnlyLabelForFeature(feature, values) {
    const styleKey = planStatusStyleKey(feature);
    if (!styleKey) return "";
    const statusLabel = planStatusAssetTypeLabel(styleKey, values);
    if (!statusLabel) return "";
    if (planExistingStructureCanKeepDetail(styleKey, values)) return "";
    return statusLabel;
  }

  function planStatusStyleKey(feature) {
    const path = normalizePlanAssetPath(feature.assetPath);
    if (path.startsWith("watersupply/pipes/")) return "water_pipe";
    if (path.startsWith("watersupply/valves/")) return "water_valve";
    if (path.startsWith("watersupply/hydrants/")) return "water_hydrant";
    if (path.startsWith("watersupply/meters/")) return "water_meter";
    if (path.startsWith("watersupply/waterservices/")) return "water_service";
    if (path.startsWith("watersupply/fittings/")) return "water_fitting";
    if (path.startsWith("sewerage/pipes")) return "sewer_pipe";
    if (path.startsWith("sewerage/connections/")) return "sewer_connection";
    if (path.startsWith("sewerage/maintenanceholes/")) return "sewer_node";
    if (path.startsWith("sewerage/fittings/")) return "sewer_fitting";
    if (path.startsWith("stormwater/pipes/")) return "stormwater_pipe";
    if (path.startsWith("stormwater/pits/")) return "stormwater_pit";
    if (path.startsWith("stormwater/endstructures/")) return "stormwater_end_structure";
    if (path.startsWith("stormwater/wsudpolylines/")) return "stormwater_wsud";
    if (path.startsWith("stormwater/surfacedrains/")) return "stormwater_surface_drain";
    if (path.startsWith("stormwater/wsudareas/")) return "stormwater_wsud";
    return "";
  }

  function planExistingStructureCanKeepDetail(styleKey, values) {
    if (!["sewer_node", "stormwater_pit", "stormwater_end_structure"].includes(styleKey)) return false;
    if (planConstructionStatusGroup(values) !== "existing") return false;
    if (styleKey === "stormwater_end_structure") {
      return ["StructureLevel_m", "StructureLevel", "SurfaceLevel_m", "SurfaceLevel", "SL", "RL"].some((key) => planNonZeroNumber(planLabelValue(values, [key])));
    }
    if (styleKey === "sewer_node") return Boolean(planSurfaceLevelLabel(values));
    return ["SurfaceLevel_m", "SurfaceLevel", "Surface_Level_m", "Surface_Level", "SurfaceRL_m", "SurfaceRL", "SL", "RL"].some((key) => planNonZeroNumber(planLabelValue(values, [key])));
  }

  function planStatusAssetTypeLabel(styleKey, values) {
    const status = planStatusDisplayLabel(values);
    return status ? `${status} ${planAssetTypeLabel(styleKey, values)}`.trim() : "";
  }

  function planStatusPrefixedLabel(styleKey, values, label) {
    const status = planStatusDisplayLabel(values);
    if (!status) return label;
    const assetType = planAssetTypeLabel(styleKey, values);
    const suffix = planLabelSuffixAfterType(label, assetType);
    if (suffix != null) return `${status} ${assetType} ${suffix}`.trim();
    return `${status} ${label || assetType}`.trim();
  }

  function planStatusDisplayLabel(values) {
    const tokens = new Set(planNormalisedStatus(values).split(" ").filter(Boolean));
    if (tokens.has("retired") || tokens.has("retire")) return "Retired";
    if (["removed", "remove", "decommissioned", "decom", "demolished", "demolish"].some((token) => tokens.has(token))) return "Removed";
    if (tokens.has("abandoned") || tokens.has("abandon")) return "Abandoned";
    if (tokens.has("existing")) return "Existing";
    return "";
  }

  function planConstructionStatusGroup(values) {
    const tokens = new Set(planNormalisedStatus(values).split(" ").filter(Boolean));
    if (["removed", "abandoned", "abandon", "retired", "retire"].some((token) => tokens.has(token))) return "removed";
    if (tokens.has("existing")) return "existing";
    return "new";
  }

  function planNormalisedStatus(values) {
    const componentInfo = planLabelObject(values, "ComponentInfo");
    const raw = planLabelText(componentInfo?.Status) || planLabelValue(values, ["ComponentInfo_Status", "Status"]);
    return String(raw || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }

  function planAssetTypeLabel(styleKey, values) {
    const mapping = {
      cadastre_lot: "Lot Boundary",
      cadastre_easement: "Easement",
      cadastre_road_reserve: "Road Reserve",
      survey_mark: "Survey Mark",
      water_service: "Water Service",
      water_valve: "Stop Valve",
      water_hydrant: "Fire Hydrant",
      water_meter: "Water Meter",
      sewer_pipe: "Sewer Main",
      sewer_connection: "House Connection",
      sewer_node: "MH",
      sewer_fitting: "Sewer Fitting",
      stormwater_pipe: "Stormwater Pipe",
      stormwater_pit: "Stormwater Pit",
      stormwater_end_structure: "Stormwater End Structure",
      stormwater_wsud: "WSUD Area",
      stormwater_surface_drain: "Surface Drain",
    };
    if (styleKey === "water_pipe") return planLabelValue(values, ["Use"]).toUpperCase() === "CONDUIT" ? "Water Conduit" : "Water Main";
    if (styleKey === "water_fitting") {
      const fittingType = planLabelValue(values, ["Type"]).toUpperCase();
      if (fittingType.includes("TAPPING BAND")) return "Tapping Band";
      if (fittingType.includes("READY TAP")) return "Ready Tap";
      return "Water Fitting";
    }
    return mapping[styleKey] || titleCase(styleKey.replace(/_/g, " "));
  }

  function planLabelSuffixAfterType(label, assetType) {
    const normalizedLabel = String(label || "").replace(/\s+/g, " ").trim();
    const normalizedType = String(assetType || "").replace(/\s+/g, " ").trim();
    if (!normalizedLabel.toUpperCase().startsWith(normalizedType.toUpperCase())) return null;
    return normalizedLabel.slice(normalizedType.length).trim();
  }

  function planSurfaceLevelLabel(values) {
    for (const key of ["SurfaceLevel_m", "SurfaceLevel", "Surface_Level_m", "Surface_Level", "SurfaceRL_m", "SurfaceRL", "SL", "RL"]) {
      const label = planFormatSurfaceLevel(planLabelValue(values, [key]));
      if (label) return label;
    }
    for (const key of ["Levels", "Level", "SewerLevels"]) {
      const nested = planLabelObject(values, key);
      const label = nested ? planSurfaceLevelLabel(nested) : "";
      if (label) return label;
    }
    return "";
  }

  function planFormatSurfaceLevel(value) {
    let text = planLabelText(value);
    if (!text) return "";
    const match = text.match(/\b(?:SL|SURFACE(?:\s+LEVEL)?|RL)\s*:?\s*(-?\d+(?:\.\d+)?)/i);
    if (match) text = match[1];
    const number = Number(text);
    if (!Number.isFinite(number) || Math.abs(number) <= 1e-9) return "";
    return planFormatMeasure(number, 3);
  }

  function planFormatMeasure(value, minimumDecimals = 2) {
    const number = Number(planLabelText(value));
    if (!Number.isFinite(number)) return "0.00";
    let [whole, decimal] = number.toFixed(3).split(".");
    decimal = decimal.replace(/0+$/, "");
    if (decimal.length < minimumDecimals) decimal = decimal.padEnd(minimumDecimals, "0");
    return `${whole}.${decimal}`;
  }

  function planFormatOptionalMeasure(value, minimumDecimals = 2) {
    const text = planLabelText(value);
    if (!text && text !== "0") return "";
    const number = Number(text);
    return Number.isFinite(number) ? planFormatMeasure(number, minimumDecimals) : "";
  }

  function planNonZeroNumber(value) {
    const number = Number(planLabelText(value));
    return Number.isFinite(number) && Math.abs(number) > 1e-9;
  }

  function drawLabelLeader(start, labelPoint, lines, selected, options = {}) {
    if (!start || !labelPoint) return;
    const metrics = getCanvasLabelMetrics(lines, options.scaleMultiplier || 1);
    if (!metrics.labelLines.length) return;
    const endpoint = getClosestPointOnLabelBox(start, labelPoint, metrics, options);
    if (!endpoint || distanceBetween(start, endpoint) < 2) return;

    drawInScreenSpace(() => {
      ctx.save();
      ctx.strokeStyle = selected ? "rgba(11, 31, 58, 0.84)" : hexToRgba(options.color || "#0b1f3a", 0.56);
      ctx.lineWidth = Math.max(0.7, getMapLabelScale() * 0.35);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(endpoint.x, endpoint.y);
      ctx.stroke();
      ctx.fillStyle = selected ? "rgba(11, 31, 58, 0.84)" : hexToRgba(options.color || "#0b1f3a", 0.56);
      ctx.beginPath();
      ctx.arc(start.x, start.y, Math.max(1.1, getMapLabelScale() * 0.55), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function getClosestPointOnLabelBox(start, labelPoint, metrics, options = {}) {
    const corners = getLabelBoxCorners(labelPoint.x, labelPoint.y, metrics, {
      anchor: options.anchor || "offset",
      rotation: Number(options.rotation) || 0,
    });
    if (!corners.length) return null;
    let closest = null;
    for (let index = 0; index < corners.length; index += 1) {
      const edgeStart = corners[index];
      const edgeEnd = corners[(index + 1) % corners.length];
      const candidate = projectPointToSegment(start, edgeStart, edgeEnd);
      const distance = distanceBetween(start, candidate);
      if (!closest || distance < closest.distance) {
        closest = { point: candidate, distance };
      }
    }
    return closest?.point || null;
  }

  function getClosestPointOnScreenPath(point, points) {
    if (!point || !Array.isArray(points) || !points.length) return null;
    if (points.length === 1) return points[0];
    let closest = null;
    for (let index = 0; index < points.length - 1; index += 1) {
      const candidate = projectPointToSegment(point, points[index], points[index + 1]);
      const distance = distanceBetween(point, candidate);
      if (!closest || distance < closest.distance) {
        closest = { point: candidate, distance };
      }
    }
    return closest?.point || points[Math.floor(points.length / 2)];
  }

  function drawLabel(lines, x, y, selected, featureUid = "", options = {}) {
    const metrics = getCanvasLabelMetrics(lines, options.scaleMultiplier || 1);
    if (!metrics.labelLines.length) return;

    drawInScreenSpace(() => {
      const canvasWidth = els.canvas.clientWidth || els.canvas.width;
      const canvasHeight = els.canvas.clientHeight || els.canvas.height;
      if (!isLabelAnchorNearViewport(x, y, canvasWidth, canvasHeight, Math.max(metrics.width, metrics.height, 24))) return;
      const { x: boxX, y: boxY } = getLabelBoxOrigin(x, y, metrics, options.anchor || "offset");
      const rotation = Number(options.rotation) || 0;
      const hitBox = getLabelHitBox(x, y, metrics, options);
      if (featureUid) {
        const labelHitBox = {
          featureUid,
          collisionGroup: options.collisionGroup || "",
          ...hitBox,
        };
        state.labelHitBoxes.push(labelHitBox);
        if (labelHitBox.collisionGroup) {
          if (!state.labelHitBoxesByGroup.has(labelHitBox.collisionGroup)) {
            state.labelHitBoxesByGroup.set(labelHitBox.collisionGroup, []);
          }
          state.labelHitBoxesByGroup.get(labelHitBox.collisionGroup).push(labelHitBox);
        }
      }

      if (rotation) {
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.translate(-x, -y);
      }
      ctx.fillStyle = selected ? "#0b1f3a" : "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle = selected ? "#0b1f3a" : "#d9e2ec";
      ctx.lineWidth = metrics.strokeWidth;
      ctx.beginPath();
      roundedRect(boxX, boxY, metrics.width, metrics.height, metrics.cornerRadius);
      ctx.fill();
      ctx.stroke();
      let textY = boxY + metrics.padding;
      metrics.labelLines.forEach((line, index) => {
        const size = metrics.lineHeights[index];
        ctx.font = `${index === 0 ? 700 : 650} ${size}px Manrope, Arial, sans-serif`;
        ctx.fillStyle = selected ? "#ffffff" : (index === 0 ? "#122033" : "#526175");
        textY += size;
        ctx.fillText(line, boxX + metrics.padding, textY);
        textY += metrics.lineGap;
      });
    });
  }

  function getLabelHitBox(x, y, metrics, options = {}) {
    const { x: boxX, y: boxY } = getLabelBoxOrigin(x, y, metrics, options.anchor || "offset");
    const rotation = Number(options.rotation) || 0;
    return rotation
      ? getRotatedRectBounds(boxX, boxY, metrics.width, metrics.height, x, y, rotation)
      : { x: boxX, y: boxY, width: metrics.width, height: metrics.height };
  }

  function getCanvasLabelMetrics(lines, scaleMultiplier = 1) {
    const labelLines = (Array.isArray(lines) ? lines : [lines]).map((line) => truncateCanvasLabel(line, 52)).filter(Boolean);
    const multiplier = Number.isFinite(Number(scaleMultiplier)) && Number(scaleMultiplier) > 0 ? Number(scaleMultiplier) : 1;
    const scale = getMapLabelScale() * multiplier * getLabelModeScaleMultiplier();
    const primarySize = 2.55 * scale;
    const secondarySize = 2.25 * scale;
    const padding = 1.5 * scale;
    const lineGap = 0.6 * scale;
    const lineHeights = labelLines.map((_, index) => (index === 0 ? primarySize : secondarySize));
    const contentHeight = lineHeights.reduce((total, size) => total + size, 0) + Math.max(0, labelLines.length - 1) * lineGap;
    const textWidth = labelLines.length
      ? Math.max(...labelLines.map((line, index) => {
        ctx.font = `${index === 0 ? 700 : 650} ${index === 0 ? primarySize : secondarySize}px Manrope, Arial, sans-serif`;
        return ctx.measureText(line).width;
      }))
      : 0;
    return {
      labelLines,
      lineHeights,
      padding,
      lineGap,
      width: textWidth + padding * 2,
      height: contentHeight + padding * 2,
      cornerRadius: 1.2 * scale,
      strokeWidth: Math.max(0.5, scale),
    };
  }

  function getLabelBoxOrigin(x, y, metrics, anchor = "offset") {
    const scale = getMapLabelScale();
    if (anchor === "center") {
      return {
        x: x - metrics.width / 2,
        y: y - metrics.height / 2,
      };
    }
    const offset = getLabelOffsetAnchorOrigin(x, y, metrics, anchor, scale);
    if (offset) return offset;
    return {
      x: x + 8 * scale,
      y: y - metrics.height - 7 * scale,
    };
  }

  function getLabelOffsetAnchorOrigin(x, y, metrics, anchor, scale) {
    const parts = getLabelOffsetAnchorParts(anchor);
    if (!parts) return null;
    const gaps = {
      offset: { x: 8 * scale, y: 7 * scale },
      "point-offset": { x: 3 * scale, y: 3 * scale },
      "fitting-offset": { x: 1.5 * scale, y: 1.5 * scale },
    }[parts.base] || { x: 8 * scale, y: 7 * scale };
    return {
      x: parts.corner.includes("w") ? x - metrics.width - gaps.x : x + gaps.x,
      y: parts.corner.includes("n") ? y - metrics.height - gaps.y : y + gaps.y,
    };
  }

  function getLabelBoxCorners(x, y, metrics, options = {}) {
    const origin = getLabelBoxOrigin(x, y, metrics, options.anchor || "center");
    const corners = [
      { x: origin.x, y: origin.y },
      { x: origin.x + metrics.width, y: origin.y },
      { x: origin.x + metrics.width, y: origin.y + metrics.height },
      { x: origin.x, y: origin.y + metrics.height },
    ];
    const rotation = Number(options.rotation) || 0;
    return rotation ? corners.map((corner) => rotatePoint(corner, x, y, rotation)) : corners;
  }

  function getRotatedRectBounds(x, y, width, height, originX, originY, rotation) {
    const corners = [
      rotatePoint({ x, y }, originX, originY, rotation),
      rotatePoint({ x: x + width, y }, originX, originY, rotation),
      rotatePoint({ x: x + width, y: y + height }, originX, originY, rotation),
      rotatePoint({ x, y: y + height }, originX, originY, rotation),
    ];
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  function rotatePoint(point, originX, originY, rotation) {
    const cosValue = Math.cos(rotation);
    const sinValue = Math.sin(rotation);
    const dx = point.x - originX;
    const dy = point.y - originY;
    return {
      x: originX + dx * cosValue - dy * sinValue,
      y: originY + dx * sinValue + dy * cosValue,
    };
  }

  function isLabelAnchorNearViewport(x, y, width, height, buffer = 24) {
    return x >= -buffer
      && x <= width + buffer
      && y >= -buffer
      && y <= height + buffer;
  }

  function getMapAnnotationScale() {
    const zoom = Number(state.zoom);
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }

  function getMapLabelScale() {
    const zoom = getMapAnnotationScale();
    if (zoom <= 4) return zoom;
    return Math.min(5.2, 4 + Math.pow(zoom - 4, 0.45) * 0.55);
  }

  function getLabelModeScaleMultiplier() {
    return state.labelMode === "simple" ? 0.72 : 1;
  }

  function drawInScreenSpace(draw) {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    draw();
    ctx.restore();
  }

  function truncateCanvasLabel(value, maxLength) {
    const text = String(value || "").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function getTransform(features, width, height) {
    const allPoints = features.flatMap((feature) => feature.points);
    const xs = allPoints.map((point) => point.x);
    const ys = allPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const padding = 46;
    const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY) * state.zoom;
    const contentWidth = spanX * scale;
    const contentHeight = spanY * scale;
    const offsetX = (width - contentWidth) / 2 + state.pan.x;
    const offsetY = (height - contentHeight) / 2 + state.pan.y;

    return { minX, minY, maxY, spanX, spanY, padding, scale, width, height, offsetX, offsetY };
  }

  function project(point, transform) {
    return {
      x: transform.offsetX + (point.x - transform.minX) * transform.scale,
      y: transform.offsetY + (transform.maxY - point.y) * transform.scale,
    };
  }

  function unproject(point, transform) {
    return {
      x: transform.minX + (point.x - transform.offsetX) / transform.scale,
      y: transform.maxY - (point.y - transform.offsetY) / transform.scale,
    };
  }

  function unprojectCanvasPoint(point, transform) {
    if (transform && transform.type === "geo") {
      return {
        type: "geo",
        x: (point.x - transform.offsetX) / transform.baseScale,
        y: (point.y - transform.offsetY) / transform.baseScale,
      };
    }
    return {
      type: "raw",
      ...unproject(point, transform),
    };
  }

  function projectWorldPoint(point, transform) {
    if (transform && transform.type === "geo" && point.type === "geo") {
      return {
        x: transform.offsetX + point.x * transform.baseScale,
        y: transform.offsetY + point.y * transform.baseScale,
      };
    }
    return project(point, transform);
  }

  function toLatLng(point) {
    if (isLongitudeLatitude(point)) return [point.y, point.x];
    if (!isMgaCoordinate(point)) return null;
    return mgaToLatLng(point.x, point.y, state.coordinateZone || 56);
  }

  function latLngToMercatorPoint(lat, lng) {
    const sinLat = Math.sin(clamp(lat, -85.05112878, 85.05112878) * Math.PI / 180);
    return {
      x: (lng + 180) / 360,
      y: 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI),
    };
  }

  function mercatorPointToLatLng(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const lng = x * 360 - 180;
    const latRadians = Math.atan(Math.sinh(Math.PI * (1 - 2 * y)));
    return {
      lat: latRadians * 180 / Math.PI,
      lng,
    };
  }

  function isLongitudeLatitude(point) {
    return Math.abs(point.x) <= 180 && Math.abs(point.y) <= 90;
  }

  function isMgaCoordinate(point) {
    return point.x >= 100000 && point.x <= 900000 && point.y >= 5000000 && point.y <= 10000000;
  }

  function mgaToLatLng(easting, northing, zone) {
    const a = 6378137;
    const f = 1 / 298.257222101;
    const k0 = 0.9996;
    const e2 = f * (2 - f);
    const ePrime2 = e2 / (1 - e2);
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const x = easting - 500000;
    const y = northing - 10000000;
    const lonOrigin = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
    const m = y / k0;
    const mu = m / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
    const phi1 = mu
      + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
      + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
      + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
      + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const tanPhi1 = Math.tan(phi1);
    const n1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
    const r1 = a * (1 - e2) / (1 - e2 * sinPhi1 * sinPhi1) ** 1.5;
    const t1 = tanPhi1 * tanPhi1;
    const c1 = ePrime2 * cosPhi1 * cosPhi1;
    const d = x / (n1 * k0);

    const lat = phi1 - (n1 * tanPhi1 / r1) * (
      d * d / 2
      - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ePrime2) * d ** 4 / 24
      + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ePrime2 - 3 * c1 * c1) * d ** 6 / 720
    );
    const lon = lonOrigin + (
      d
      - (1 + 2 * t1 + c1) * d ** 3 / 6
      + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ePrime2 + 24 * t1 * t1) * d ** 5 / 120
    ) / cosPhi1;

    return [lat * 180 / Math.PI, lon * 180 / Math.PI];
  }

  function findFeatureAtCanvasPoint(point) {
    const features = state.filteredFeatures;
    if (!features.length) return null;

    const width = els.canvas.clientWidth || els.canvas.width;
    const height = els.canvas.clientHeight || els.canvas.height;
    const transform = getActiveMapTransform(features, width, height);
    const hitCandidates = [];

    features.forEach((feature, index) => {
      const screenPointPairs = (feature.points || [])
        .map((sourcePoint) => ({
          sourcePoint,
          screenPoint: projectFeaturePoint(sourcePoint, transform),
        }))
        .filter((pair) => Boolean(pair.screenPoint));
      const distance = getFeatureHitDistance(point, screenPointPairs, feature, transform);
      if (distance === null) return;
      hitCandidates.push({ feature, distance, index });
    });

    hitCandidates.sort((a, b) => getGeometryHitRank(a.feature.geometryKind) - getGeometryHitRank(b.feature.geometryKind) || a.distance - b.distance || b.index - a.index);
    return hitCandidates[0] ? hitCandidates[0].feature : null;
  }

  function findLabelAtCanvasPoint(point) {
    for (let index = state.labelHitBoxes.length - 1; index >= 0; index -= 1) {
      const box = state.labelHitBoxes[index];
      if (
        point.x >= box.x
        && point.x <= box.x + box.width
        && point.y >= box.y
        && point.y <= box.y + box.height
      ) {
        return box;
      }
    }
    return null;
  }

  function getGeometryHitRank(geometryKind) {
    if (geometryKind === "Point") return 1;
    if (geometryKind === "Line") return 2;
    if (geometryKind === "Polygon") return 3;
    return 2;
  }

  function findOverlayFeatureAtCanvasPoint(point) {
    const features = state.filteredFeatures;
    if (!features.length) return null;

    const width = els.canvas.clientWidth || els.canvas.width;
    const height = els.canvas.clientHeight || els.canvas.height;
    const transform = getActiveMapTransform(features, width, height);
    if (!transform || transform.type !== "geo") return null;

    const candidates = [];
    state.overlays
      .filter((overlay) => overlay.enabled && overlay.features.length)
      .sort((a, b) => getOverlayDrawOrder(b) - getOverlayDrawOrder(a))
      .forEach((overlay, overlayIndex) => {
        overlay.features.forEach((feature, featureIndex) => {
          const distance = getOverlayHitDistance(point, feature.geometry, transform, overlay.mode);
          if (distance === null) return;
          candidates.push({
            overlay,
            feature,
            distance,
            geometryRank: getGeometryHitRank(getOverlayGeometryLabel(feature.geometry)),
            index: overlayIndex * 100000 + featureIndex,
          });
        });
      });

    candidates.sort((a, b) => a.geometryRank - b.geometryRank || a.distance - b.distance || b.index - a.index);
    return candidates[0] ? { overlay: candidates[0].overlay, feature: candidates[0].feature } : null;
  }

  function getOverlayHitDistance(point, geometry, transform, mode) {
    const pointCoords = getGeometryPointCoords(geometry)
      .map((coord) => projectLngLat(coord[0], coord[1], transform))
      .filter(Boolean);
    if (pointCoords.length) {
      const closestPoint = Math.min(...pointCoords.map((item) => distanceBetween(point, item)));
      return closestPoint <= 12 ? closestPoint : null;
    }

    const paths = getGeometryPaths(geometry);
    if (!paths.length) return null;
    const closeRing = isPolygonGeometry(geometry);
    let closest = Infinity;
    let insidePolygon = false;
    paths.forEach((path) => {
      const screenPoints = path.map((coord) => projectLngLat(coord[0], coord[1], transform)).filter(Boolean);
      if (closeRing && screenPoints.length > 2 && isPointInPolygon(point, screenPoints)) insidePolygon = true;
      if (screenPoints.length > 1) closest = Math.min(closest, getClosestSegmentDistance(point, screenPoints, closeRing));
    });
    if (insidePolygon && mode === "parcel") return 0;
    return closest <= (mode === "parcel" ? 8 : 10) ? closest : null;
  }

  function getFeatureHitDistance(point, screenPointPairs, feature, transform) {
    const points = screenPointPairs.map((pair) => pair.screenPoint);
    const geometryKind = feature?.geometryKind;
    if (!points.length) return null;
    if (geometryKind === "Point") {
      return getPointFeatureHitDistance(point, screenPointPairs, feature, transform);
    }
    if (geometryKind === "Polygon" && points.length > 2 && isPointInPolygon(point, points)) {
      return 0;
    }
    if (points.length < 2) return null;
    const closestSegment = getClosestSegmentDistance(point, points, geometryKind === "Polygon");
    return closestSegment <= 10 ? closestSegment : null;
  }

  function getPointFeatureHitDistance(point, screenPointPairs, feature, transform) {
    const style = getPlanStyleForFeature(feature);
    let best = Infinity;
    screenPointPairs.forEach((pair) => {
      const symbolSize = getPointHitSymbolSize(feature, style, transform, pair.sourcePoint);
      const distance = symbolSize
        ? getPointSymbolHitDistance(point, pair.screenPoint, symbolSize, feature, style)
        : distanceBetween(point, pair.screenPoint) <= 12 ? distanceBetween(point, pair.screenPoint) : null;
      if (distance !== null) best = Math.min(best, distance);
    });
    return Number.isFinite(best) ? best : null;
  }

  function getPointHitSymbolSize(feature, style, transform, sourcePoint) {
    const realWorldSize = getRealWorldPointSymbolSize(feature, style, transform, sourcePoint, false);
    if (realWorldSize) return realWorldSize;
    if (style?.key !== "stormwater_pit" && style?.key !== "sewer_node") return null;
    const radius = getPlanPointRadiusPx(style, false);
    return { radiusX: radius, radiusY: radius };
  }

  function getPointSymbolHitDistance(point, centre, symbolSize, feature, style) {
    const tolerance = 3;
    const radiusX = Math.max(3, Number(symbolSize.radiusX) || 0);
    const radiusY = Math.max(3, Number(symbolSize.radiusY) || radiusX);
    const dx = Math.abs(point.x - centre.x);
    const dy = Math.abs(point.y - centre.y);

    if (isRectangularPointHitSymbol(feature, style)) {
      if (dx <= radiusX + tolerance && dy <= radiusY + tolerance) {
        return Math.hypot(Math.max(0, dx - radiusX), Math.max(0, dy - radiusY));
      }
      return null;
    }

    const normalized = (dx * dx) / ((radiusX + tolerance) * (radiusX + tolerance))
      + (dy * dy) / ((radiusY + tolerance) * (radiusY + tolerance));
    return normalized <= 1 ? Math.max(0, Math.hypot(dx, dy) - Math.min(radiusX, radiusY)) : null;
  }

  function isRectangularPointHitSymbol(feature, style) {
    if (style?.key !== "stormwater_pit") return false;
    return getStormwaterPitShape(feature?.attributes || {}) !== "circle";
  }

  function getClosestSegmentDistance(point, points, closeRing) {
    let closest = Infinity;
    for (let index = 0; index < points.length - 1; index += 1) {
      closest = Math.min(closest, distanceToSegment(point, points[index], points[index + 1]));
    }
    if (closeRing && points.length > 2) {
      closest = Math.min(closest, distanceToSegment(point, points[points.length - 1], points[0]));
    }
    return closest;
  }

  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return distanceBetween(point, start);
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return distanceBetween(point, {
      x: start.x + t * dx,
      y: start.y + t * dy,
    });
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function isPointInPolygon(point, points) {
    let inside = false;
    for (let index = 0, previousIndex = points.length - 1; index < points.length; previousIndex = index, index += 1) {
      const current = points[index];
      const previous = points[previousIndex];
      const intersects = current.y > point.y !== previous.y > point.y
        && point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function setStatus(message, isError) {
    els.statusText.textContent = message;
    root.querySelector(".viewer-status").classList.toggle("viewer-status--error", Boolean(isError));
  }

  function centerViewerInViewport() {
    if (!els.shell) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        els.shell.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      });
    });
  }

  function getParseErrorDetails(parseError, xmlText = "") {
    const text = String(parseError.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) {
      return {
        message: "The XML is not well-formed.",
        title: "XML parse error",
        detail: "The browser could not parse the uploaded XML.",
        suggestion: "Check that every opening XML tag has a matching closing tag, then upload the file again.",
      };
    }
    const structuralDetails = getXmlStructureErrorDetails(text, xmlText);
    if (structuralDetails) return structuralDetails;
    const message = text.length > 180 ? `${text.slice(0, 177)}...` : text;
    return {
      message,
      title: "XML parse error",
      detail: message,
      suggestion: "Fix the malformed XML tag structure, then upload the file again.",
    };
  }

  function getParseErrorSummary(parseError, xmlText = "") {
    return getParseErrorDetails(parseError, xmlText).message;
  }

  function getXmlStructureErrorDetails(message, xmlText = "") {
    const mismatch = String(message || "").match(/Opening and ending tag mismatch:\s*([A-Za-z0-9_:-]+)\s+line\s+(\d+)\s+and\s+([A-Za-z0-9_:-]+)/i);
    if (!mismatch) return null;
    const openTag = formatXmlToken(mismatch[1]);
    const openLine = Number(mismatch[2]);
    const closeTag = formatXmlToken(mismatch[3]);
    const lines = String(xmlText || "").split(/\r?\n/);
    const nearbyAsset = findNearbyUnwrappedAsset(lines, openLine, closeTag);
    if (nearbyAsset) {
      const firstElementText = nearbyAsset.firstElementValue
        ? `<${nearbyAsset.firstElement}>${nearbyAsset.firstElementValue}</${nearbyAsset.firstElement}>`
        : `<${nearbyAsset.firstElement}>`;
      return {
        message: `Missing opening <${closeTag}> tag near line ${nearbyAsset.line}.`,
        title: `Missing opening tag: ${closeTag}`,
        detail: `Line ${nearbyAsset.line} starts ${nearbyAsset.id ? `asset ${nearbyAsset.id}` : `a new asset`} directly after </${closeTag}>, but it is not wrapped in <${closeTag}>.`,
        suggestion: `Insert <${closeTag}> on the line immediately before ${firstElementText}. The block should start with <${closeTag}> and end with the existing </${closeTag}>.`,
        loc: { lineNumber: nearbyAsset.line },
        repair: {
          type: "insert-before-line",
          confidence: "high",
          lineNumber: nearbyAsset.line,
          text: `${nearbyAsset.insertIndent || ""}<${closeTag}>`,
          label: `Insert missing <${closeTag}> before ${firstElementText}.`,
        },
      };
    }
    return {
      message: `XML tag mismatch: </${closeTag}> does not match <${openTag}> from line ${openLine}.`,
      title: `Mismatched closing tag: ${closeTag}`,
      detail: `The parser found </${closeTag}> while still inside <${openTag}> from line ${openLine}.`,
      suggestion: `Check for a missing opening <${closeTag}> tag or an extra closing </${closeTag}> near this asset block.`,
      loc: { lineNumber: openLine },
    };
  }

  function findNearbyUnwrappedAsset(lines, containerLine, assetTag) {
    const start = Math.max(0, Number(containerLine || 1) - 1);
    for (let index = start; index < Math.min(lines.length, start + 120); index += 1) {
      const firstElement = String(lines[index] || "").match(/^\s*<([A-Za-z0-9_:-]+)>/);
      if (!firstElement || formatXmlToken(firstElement[1]) === assetTag) continue;
      const previousSignificant = findPreviousSignificantXmlLine(lines, index);
      if (!previousSignificant || !new RegExp(`<\\/${assetTag}>\\s*$`).test(previousSignificant.text)) continue;
      return {
        line: index + 1,
        firstElement: formatXmlToken(firstElement[1]),
        firstElementValue: getInlineXmlElementValue(lines[index], formatXmlToken(firstElement[1])),
        id: getInlineXmlElementValue(lines[index], "ADACId") || findNearbyAssetId(lines, index),
        insertIndent: getParentElementIndent(lines[index]),
      };
    }
    return null;
  }

  function getParentElementIndent(line) {
    const indent = String(line || "").match(/^\s*/)?.[0] || "";
    return indent.length >= 2 ? indent.slice(0, -2) : indent;
  }

  function findPreviousSignificantXmlLine(lines, index) {
    for (let current = index - 1; current >= 0; current -= 1) {
      const text = String(lines[current] || "").trim();
      if (text) return { line: current + 1, text };
    }
    return null;
  }

  function findNearbyAssetId(lines, index) {
    for (let current = index; current < Math.min(lines.length, index + 8); current += 1) {
      const value = getInlineXmlElementValue(lines[current], "ADACId");
      if (value) return value;
    }
    return "";
  }

  function getInlineXmlElementValue(line, elementName) {
    const match = String(line || "").match(new RegExp(`<${elementName}(?:\\s[^>]*)?>([^<]*)<\\/${elementName}>`, "i"));
    return match ? String(match[1] || "").trim() : "";
  }

  function inferLayerFromStructure(node) {
    const context = getStructuralTags(node);
    const assetTag = context[0] || "";
    const text = context.join(" ").toLowerCase();

    if (hasAnyTag(context, ["Sewerage"])) return "Sewer";
    if (hasAnyTag(context, ["WaterSupply", "PotableWater", "RecycledWater", "Water"])) return "Water";
    if (hasAnyTag(context, ["Stormwater", "Drainage"])) return "Stormwater";
    if (hasAnyTag(context, ["Transport"])) return "Transport";
    if (hasAnyTag(context, ["OpenSpace", "Open Space"])) return "OpenSpace";
    if (hasAnyTag(context, ["Surface"])) return "Surface";
    if (hasAnyTag(context, ["Cadastre", "Cadastral"])) return "Cadastre";
    if (hasAnyTag(context, ["Telecommunications", "Communication", "Communications"])) return "Telecommunications";
    if (hasAnyTag(context, ["Electrical", "Electricity", "Power"])) return "Electrical";
    if (hasAnyTag(context, ["Enhancements"])) return "Enhancements";
    if (hasAnyTag(context, ["Supplementary"])) return "Supplementary";

    if (/maintenancehole|pipenonpressure|pipesnonpressure/.test(text)) return "Sewer";
    if (/stormwater|subsoildrain|pit|culvert|headwall|outlet|inlet/.test(text)) return "Stormwater";
    if (/openspace|open\s*space|openspacearea|activityarea|activitypoint|activitylandscapeedging|landscapearea|edging|barbeque|table|seat|bicyclefitting|barrier|bollard|wastecollection|shelter|shelterpolygon|artwork|boatingfacility|retainingwall|tree|building|platform|faunapoint|faunapolyline|faunainfrastructure|landstabilisation|preparedsurface|fixture/.test(text)) return "OpenSpace";
    if (/hydrant|valve|pipepressure|pipespressure|fitting|connection|meter/.test(text)) return "Water";
    if (/pavement|roadedge|kerb|pathway|footpath|driveway|vehiclecrossing|linemarking|roadsign|signs?|traffic|island/.test(text)) return "Transport";
    if (/spotheight|contour|breakline|profileline/.test(text)) return "Surface";
    if (/lot|parcel|boundary|easement|roadreserve/.test(text)) return "Cadastre";
    if (/pointfeature|polylinefeature|polygonfeature/.test(text)) return "Supplementary";

    return "Other";
  }

  function getStructuralTags(node) {
    const names = [cleanName(node.tagName)];
    let current = node.parentElement;
    while (current && names.length < 8) {
      names.push(cleanName(current.tagName));
      current = current.parentElement;
    }
    return names;
  }

  function hasAnyTag(tags, names) {
    const normalized = tags.map((tag) => tag.toLowerCase());
    return names.some((name) => normalized.includes(name.toLowerCase()));
  }

  function inferGeometryKind(node, points, context = {}) {
    if (points.length <= 1) return "Point";
    if (isLinearSurfaceFeature(node, context)) return "Line";
    if (/^cadastre\/landparcels\/roadreserve/i.test(String(context.assetPath || "")) && points.length > 2) return "Polygon";
    const hasPolygon = Array.from(node.querySelectorAll("*")).some((item) => cleanName(item.tagName).toLowerCase() === "polygon");
    if (hasPolygon) return "Polygon";
    if (/polygon|area|surface|pavement|footpath|island|reserve/i.test(`${node.tagName} ${getFirstValue(node, ["Type", "AssetType", "Name"])}`)) {
      return "Polygon";
    }

    const first = points[0];
    const last = points[points.length - 1];
    if (points.length > 3 && round(first.x) === round(last.x) && round(first.y) === round(last.y)) return "Polygon";
    return "Line";
  }

  function isLinearSurfaceFeature(node, context = {}) {
    const text = [
      cleanName(node.tagName),
      context.assetPath,
      context.type,
      context.planStyleKey,
      getFirstValue(node, ["Type", "AssetType", "Name", "Class", "Subtype", "FeatureType"]),
    ].join(" ").toLowerCase();
    return /(^|[^a-z])(contour|break\s*line|breakline|profile\s*line|profileline)([^a-z]|$)/i.test(text);
  }

  function naturalCompare(a, b) {
    return String(a || "").localeCompare(String(b || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  function titleCase(value) {
    return String(value || "").toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }

  function formatDetailLabel(value) {
    const normalized = cleanName(value).replace(/[^a-z0-9]+/gi, "").toLowerCase();
    const labelOverrides = {
      surfacelevelm: "SL",
      invertlevelm: "IL",
      invertlevels: "IL",
      invertlevel: "IL",
      usinvertlevelm: "USIL",
      upstreaminvertlevelm: "USIL",
      dsinvertlevelm: "DSIL",
      downstreaminvertlevelm: "DSIL",
      ussurfacelevelm: "USSL",
      upstreamsurfacelevelm: "USSL",
      dssurfacelevelm: "DSSL",
      downstreamsurfacelevelm: "DSSL",
    };
    if (labelOverrides[normalized]) return labelOverrides[normalized];

    const spaced = collapseRepeatedDetailPrefix(cleanName(value)
      .replace(/[_-]+/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim());
    if (!spaced) return "";

    const upperWords = new Set(["adac", "ahd", "gda", "gis", "gps", "id", "mga", "xml"]);
    const lowerUnits = new Set(["m", "mm", "km", "ha"]);
    return spaced.split(" ").map((word) => {
      const lower = word.toLowerCase();
      if (upperWords.has(lower)) return lower.toUpperCase();
      if (lowerUnits.has(lower)) return lower;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return titleCase(word);
    }).join(" ");
  }

  function collapseRepeatedDetailPrefix(value) {
    const words = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) return words.join(" ");
    const sameWord = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
    for (let prefixLength = Math.floor(words.length / 2); prefixLength >= 1; prefixLength -= 1) {
      const repeats = words.slice(0, prefixLength).every((word, index) => sameWord(word, words[index + prefixLength]));
      if (repeats) return words.slice(prefixLength).join(" ");
    }
    return words.join(" ");
  }

  function getFirstValue(node, names) {
    for (const name of names) {
      const attr = findAttribute(node, [name]);
      if (attr) return attr;
    }

    for (const name of names) {
      const child = Array.from(node.children).find((item) => cleanName(item.tagName).toLowerCase() === cleanName(name).toLowerCase());
      if (child) {
        const value = String(child.textContent || "").trim();
        if (value) return value;
      }
    }

    return "";
  }

  function findAttribute(node, names) {
    const lowerNames = names.map((name) => cleanName(name).toLowerCase());
    const attr = Array.from(node.attributes || []).find((item) => lowerNames.includes(cleanName(item.name).toLowerCase()));
    return attr ? attr.value : "";
  }

  function cleanName(name) {
    return String(name || "").replace(/^.*:/, "");
  }

  function getDepth(node) {
    let depth = 0;
    let current = node;
    while (current.parentElement) {
      depth += 1;
      current = current.parentElement;
    }
    return depth;
  }

  function isFiniteNumber(value) {
    return value !== "" && Number.isFinite(Number(value));
  }

  function round(value) {
    return Math.round(Number(value) * 1000) / 1000;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateCanvasStateAttributes() {
    els.canvas.dataset.mapMode = state.mapMode;
    els.canvas.dataset.coordinateZone = String(state.coordinateZone || "");
    els.canvas.dataset.zoom = state.zoom.toFixed(3);
    els.canvas.dataset.panX = state.pan.x.toFixed(1);
    els.canvas.dataset.panY = state.pan.y.toFixed(1);
    els.canvas.dataset.measurementMode = state.measurement.mode;
    els.canvas.classList.toggle("is-measuring", isMeasurementActive());
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  init();
})();
