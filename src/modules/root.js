import React from "react";
import DataProvider from "./data-provider";
import { renderToString } from "react-dom/server";

export default function StaticRoot(props) {
  const {children, generator: {includeScript, routes, currentRoute}} = props;
  const html = {
    __html: renderToString(
      <DataProvider staticRoutes={routes} currentRoute={currentRoute} include={includeScript}>
        {children}
      </DataProvider>
    )
  }
  return <div id="app" dangerouslySetInnerHTML={html}/>;
};
