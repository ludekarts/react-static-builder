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

  const results = await Promise.all(dataQueries);
  console.log("✔ Data fetched");

  // Assembling data with routes.
  const { routesData, generatorData } = routes.reduce(
    (acc, route, index) => {

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


  const stats = {
    renderedFiles: 0,
    routesData: 0,
  };

  try {
    await Promise.all(
      routes.map(async currentRoute => {
        const includes = {};
        const scriptData = [];
        const currentPath = noTrailingSlash(currentRoute.path);

        // Generator object provided to "generateStaticRoutes".
        const generator = {

          // Data for currently render route.
          routeData: generatorData[currentPath],

          // Include given "content" into dinbal HTML.
          include: content => {
            const id = `__%RSB__INCLUDE__${uid()}%__`;
            includes[id] = content;
            return id;
          },

          // Render HTML string from given React children.
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
        const file = useSingleSlash(
          currentPath === "/"
            ? `${output}/${basepath || ""}/index.html`
            : `${output}/${basepath || ""}/${currentPath}/index.html`
          );

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
          ? useSingleSlash(
              serialize(
                scriptData.reduce((acc, route) => {
                  acc[route] = routesData[route];
                  return acc;
                }, {}),
                { isJSON: true }
              )
            )
          : undefined;

        // Create route's index file.

        await createFile(file, addComponentData(html, routeData));
        stats.renderedFiles += 1;

        // Create route's data file.
        if (routeData) {
          await createFile( file.replace("index.html", "routeData.json"), routeData);
          stats.routesData += 1;
        }
      })
    )
  } catch (error) {
    console.error(error);
  }
  console.log(`✔ Created ${stats.renderedFiles } files with ${stats.routesData} JSON data objects.`);
  rmdir(`${output}/cache`);
  console.log(`✔ Cache Cleared`);
  console.log("★ All Done! ★");
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

function useSingleSlash(path) {
  return path.replace(/(\\u002F|\/+)/g, "/");
}

function noTrailingSlash(path) {
  return path.length > 1 && /\/$/.test(path) ? path.slice(0, -1) : path;
}

// Export.
module.exports = generateStaticRoutes;
