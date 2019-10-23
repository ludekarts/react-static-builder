import React, { useState, useEffect, useContext, useMemo , createContext }  from "react";

// Create Data Context.
const DataContext = createContext();

// Application modes.
const MODE = {
  STATIC: "static-render",
  PRODUCTION: "hydrate-render",
  DEVELOPMENT: "dynamic-render"
};

// Hook for any component that wants to access static data.
export function useRouteData(path) {  
  const { routesData, fetchData, include } = useContext(DataContext);
  // Remove trailing slash. 
  const url = /\/$/.test(path) ? path.slice(0, -1) : path;
  include && include(url);
  return routesData[url] || fetchData(url);
};

// Export Data Provider.
export default function DataProvider(props) {
  const { children, staticRoutes, include } = props;

  // Determine current application mode.
  const mode =
    staticRoutes === undefined
      ? MODE.PRODUCTION
      : Array.isArray(staticRoutes)
      ? MODE.DEVELOPMENT
      : MODE.STATIC;

  // Actual data proveider for "useRouteData" hook.
  const [routesData, addRouteData] = useState(
    mode === MODE.STATIC
      ? staticRoutes
      : mode === MODE.PRODUCTION
      ? pullPrerenderData()
      : {}
  );

  // Set url that requests data.
  const [url, fetchData] = useState();

  // Conext object.
  const context = useMemo(() => ({ routesData, fetchData, include }), [routesData]);
  
  // List of available data queries.
  const dataQueries =
    mode === MODE.DEVELOPMENT ? routeToQuery(staticRoutes) : {};

  // Data fetching logic.
  useEffect(() => {    
    mode === MODE.PRODUCTION
      ? url && fetchLocalData(addRouteData)
      : typeof dataQueries[url] === "function" &&
        fetchRouteData(url, dataQueries, addRouteData);
  }, [url]);

  return (
    <DataContext.Provider value={context}>
      {children}
    </DataContext.Provider>
  );
}

// ---- Helpers ----------------

// Fetch dynaimc data for sepcific route.
async function fetchRouteData(url, dataQueries, addRouteData) {
  try {
    const result = await dataQueries[url]();
    addRouteData(routes => ({ ...routes, [url]: result }));
  } catch (e) {
    console.error(e);
  }
}

// Fetch local data for sepcific route.
async function fetchLocalData(addRouteData) {
  try {
    const localData = await fetch(
      `${window.location.href}/routeData.json`
    ).then(r => r.json());
    addRouteData(data => ({ ...data, ...localData }));
  } catch (e) {
    console.error(e);
  }
}

// Pull prerender data for production build.
function pullPrerenderData() {
  const data = window.__static_builder__ ? window.__static_builder__ : {};
  delete window.__static_builder__;
  return data;
}

// Transform routes object into query object.
function routeToQuery(routes = []) {
  return routes.reduce((acc, route) => {
    acc[route.path] = route.getData;
    return acc;
  }, {});
}

