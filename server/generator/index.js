// Node.
const fs = require("fs");
const path = require("path");

// Serializer.
const serialize = require("serialize-javascript");

// Initialize generator.
async function generateStaticRoutes (staticRender) {   

  // Dependencies.
  const React = require("react");  
  const DataProvider = require("../../lib").DataProvider;
  const renderToString = require("react-dom/server").renderToString;
  const renderToStaticMarkup = require("react-dom/server").renderToStaticMarkup;  

  // Check for React Static Builder Global Configuration.
  if (!staticrc) throw new Error("Cannot access '.staticrc' configuration");
  if (!staticRoutes) throw new Error("Cannot access staticRoutes");

  // Prepeare static routes.
  const routes = await staticRoutes();
  // Get global configuration.
  const { output, basepath } = staticrc;
  // Extract data queries from routes.
  const dataQueries = routes.map(route =>
    route.getData ? route.getData() : Promise.resolve()
  );

  console.log("Fetching data...");
  const results = await Promise.all(dataQueries);

  // Assembling data with routes.
  const { routesData, generatorData } = routes.reduce(
    (acc, route, index) => {
      // Add basepath if exist.
      if (basepath) route.path = `${basepath}/${route.path}`;

      // Cut out getData from configutarion - at this point it is useless.
      const { getData, ...config } = route;

      // Data for the generator - static verions, access to full config.
      acc.generatorData[route.path] = {
        ...config,
        response: results[index]
      };

      // Data for static version.
      acc.routesData[route.path] = results[index];
      return acc;
    },
    {
      routesData: {},
      generatorData: {}
    }
  );

  console.log("Rendering files...");

  await Promise.all(
    routes.map(async currentRoute => {
      const includes = {};
      const scriptData = [];
      const currentPath = /\/$/.test(currentRoute.path) 
        ? currentRoute.path.slice(0, -1) // Always remove trailing slash. 
        : currentRoute.path;

      const generator = {
        routeData: generatorData[currentPath],

        // If "basepath" provided preppend script's src attribute with "/".
        include: content => {
          const id = `__%RSB__INCLUDE__${uid()}%__`;
          includes[id] = content;
          return id;
        },

        html: children => {
          return renderToString(
            React.createElement(DataProvider, {
              staticRoutes: routesData,
              currentRoute: currentPath,
              include: content => scriptData.push(content)
            }, children)           
          );
        }
      };

      // Create route's absolute path.
      const file = (currentPath === "/"
          ? `${output}/index.html`
          : `${output}/${currentPath}/index.html`).replace(/\/+/g, "/");

      // Get static markup.
      const staticMarkup = staticRender(currentPath, generator);

      // Include declared assets.
      const html = includeAssets(
        typeof staticMarkup !== "string"
          ? `<!DOCTYPE html>${renderToStaticMarkup(staticMarkup)}`
          : staticMarkup,
        includes
      );

      const routeData = scriptData.length
        ? serialize(
            scriptData.reduce((acc, route) => {
              acc[route] = routesData[route];
              return acc;
            }, {}),
            { isJSON: true }
          ).replace(/\\u002F/g, "/")
        : undefined;

      // Create route's index file.
      const saveIndex = await createFile(
        file,
        insertMainScript(
          addComponentData(html, routeData),
          basepath ? `/${basepath}/` : "/"
        )
      );

      console.log(saveIndex);

      // Create route's data file.
      if (routeData) {
        const saveJson = await createFile(
          file.replace("index.html", "routeData.json"),
          routeData
        );
        console.log(saveJson);
      }
    })
  );

  console.log("Clearing cache...");
  rmdir(`${output}/cache`);

  console.log("Done! 👏");   
}


// ---- Helpers ----------------

function createFile(path, content) {
  return new Promise((resolve, reject) => {
    const directory = path.split("/");
    directory.pop();
    fs.mkdir(directory.join("/"), { recursive: true }, err => {
      err && reject(error);
      fs.writeFile(path, content, "utf8", err => {
        err && reject(error);
        resolve(`The file: "${path}" has been saved!`);
      });
    });
  });
}

function includeAssets(html, assets) {
  return html.replace(/__%RSB__INCLUDE__.+?%__/g, match => assets[match] || "");
}

function addComponentData(html, data) {
  if (!data) return html;
  if (html.includes("</head>")) {
    return html.replace(
      "</head>",
      `<script>window.__static_builder__ = ${data}</script></head>`
    );
  } else {
    return (html += `<script>window.__static_builder__ = ${data}</script>`);
  }
}

function insertMainScript(html, relativePath) {
  if (html.includes("</body>")) {
    return html.replace(
      "</body>",
      `<script src="${relativePath}index.js"></script></body>`
    );
  } else {
    return (html += `<script src="${relativePath}index.js"></script>`);
  }
}

function uid() {
  return (+new Date() + Math.random() * 100).toString(32);
}

// Remove local directory (sync).
function rmdir(source) {
  if (!fs.existsSync(source)) return;
  fs.readdirSync(source).forEach(file => {
    const filePath = path.join(source, file);
    !fs.lstatSync(filePath).isDirectory()
      ? fs.unlinkSync(filePath)
      : rmdir(filePath);
  });
  fs.rmdirSync(source);
}

// Export.
module.exports = generateStaticRoutes;
  