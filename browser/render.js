import React from "react";
import ReactDOM from "react-dom";
import staticRoutes from "staticRoutes";
import DatatProvider from "./data-provider";

export const isBrowser = typeof document !== "undefined";

export default async function render(application, id) {
  if (isBrowser) {
    const target = document.getElementById(id);
    if (target.hasChildNodes()) {
      ReactDOM.hydrate(<DatatProvider>{application}</DatatProvider>, target);
    } else {
      const routes = await staticRoutes();
      ReactDOM.render(
        <DatatProvider staticRoutes={routes}>{application}</DatatProvider>,
        target
      );
    }
  }
}
