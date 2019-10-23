![react-static-builder-logo](./src/assets/rsb-logo.png)

# React Static Builder
Static site builder for React web applications

## Ussage 
This library currently support only Webpack, in the future we intend to extend also to Rollup and possibly other vendors.

### Command Line Interface (CLI)
React static builder (RSB) by default installs as a CLI tool. It main purpose is to set up structure for the static build and later on bootsratap and build static application.

To inintialize RSB type in yous comand line `react-static-builder init`. This command does three things:
 1. Create statup files: 
    - `.staticrc` file which contains default setup for the static render.
    - `src/static-routes.js` file where you can put configuration for all static routes in your app.
    - `src/static.js` file with initial template to start with.
 3. Add `static` script to your **package.json** file that will generate static app.
 4. Install `rimraf` in your project so it can clean the build directory with ease.

## From zero to static-hero
Static render is fairly easy in it principles, however sometimes setting it up can be quite tedious task. RSB tries to remove someone of this hustle and bring us better dev experience.

### Basic concept
------------------------
Lest start with the **basic setup**, that assumes you don't need any additional configuration, just deafults that RSB provides you out of the box. 

1. Install RSB: `npm i -D react-static-builder`.
2. Initialize RSB: `react-static-builder init`.
3. Open your **webpack.config.js** file and wrap output in RSB server-helper:
    ```
    import { webpackConfig } from "react-static-builder/server";
    . . .
    
    export default webpackConfig((env, { mode }) => {
      return {
        // Your regular config goes here.
      });
    ```
4. In your **index.js** (or whatever main app file you have) replace React's **render** method with the one from RSB pasisng container **ID** as a second parameter:
    ```
    import React from "react";
    import Application from "./app";
    import { render } from "react-static-builder";
    . . .
    
    render(<Application/>, "app");
    ```
5. Open `src/static-routes.js` file and add root route for your app:
    ```
    export default async function staticRoutes() {
      return [
        {
          path: "/",
          description: "My Awsome App!"
        },
      ];
    }
    ```
6. Open `src/static.js` file and make sure that all imports are set properly.
7. In your terminal run: `npm run static`.
8. Now you should see new folder called `static` with files ready to copy to the server

### Advanced concepts
------------------------

#### Adding routing
To be honest, static render without routing is not as much fun as it can be, so lets use **react-router** to introduce some more advanced concepts.

1. At first lets add a routing libray: `npm i -S react-router-dom`.
2. Create one or two more routes.
3. In your **index.js** wrap application component with `<BrowserRouter />` component:
    ```
    import { render } from "react-static-builder";
    import { BrowserRouter } from "react-router-dom";
    . . .
    
    render(<BrowserRouter><Application/></BrowserRouter>, "app");
    ``` 
4. Simiraly in **static.js** wrap application component with `<StaticRouter />` component:
    ```
    . . .
    const html = generator.html(
        <StaticRouter location={currentRoute}>
          <Application />
        </StaticRouter>
    );
    ```
5. In **static-routes.js** add new objectw with paths you wan to be staticly rendered:
    ```
    export default async function staticRoutes() {
      return [
        { path: "/"},
        { path: "/landing"},
        // More paths here...
      ];
    }
    ```
6. Run `npm run static`. Files should be generated in **static** folder.
    

#### Dymaic content - fetching data
The true power of static render is to populate app with data before it reach the users. RSB allows you to do that by using `static-routes.js` and `useRouteData` hook.

1. Add another view to your app that requires some external data.
2. Install `node-fetch` to your project. Data fetching logic need to be isomorphic.
3. In `static-routes.js` add route matching one you've added to your app with `getData` method that will be responsible for providing data to the view:
    ```
    import fetch from "node-fetch";
    . . .
    
    export default async function staticRoutes() {  
      return [
       // Other routers.
        {
          path: "/someview",
          getData: () => fetch("https://...").then(r=>r.json()),      
        },
      ];
    }
    ```
    
4. In your view import two hooks: `useRouteMatch` from **react-router-dom** and `useRouteData` from RSB:
    ```
    import { useRouteMatch } from "react-router-dom";
    import { useRouteData } from "react-static-builder";
    . . .
    
    export default function Users(props) {    
      const { url } = useRouteMatch();  
      const users = useRouteData(url);  
      return ...
    }
    ```
 5. And that's it. Now in any route or subroute you can use thees two hoks to call data required to render the view.


#### Pulling out styles
You may have noticed that dispute tour app renders now statically you can see a flash of unstyled content. This is because we're not providing styles in our static version. Lets see how we can change that? This example assumes you're using **styled-components** but this technique can be applied to any type of CSS (pure sss, sass, css-in-js).

1. Lets install **babel plugin** for **styled-components** that help us with server side rendering.
    ```
    npm i -D babel-plugin-styled-components
    ```
2. Add `babel-plugin-styled-components` into your **plugins** config in `.babelrc` file.
3. In **static.js** file we need to add ode that will extract styles from out app and puts them in inline css:
    ```
    import { ServerStyleSheet, StyleSheetManager } from "styled-components";
    . . .
    
    // Render Static App.
    generateStaticRoutes((currentRoute, generator) => {
        const sheet = new ServerStyleSheet();
        const html = generator.html(
            <StyleSheetManager sheet={sheet.instance}>
                <StaticRouter location={currentRoute}>
                    <Application />
                </StaticRouter>
            </StyleSheetManager>
        );
        // Extract styles.
        const styles = sheet.getStyleTags();
        sheet.seal();
        // . . .
        
        return (
            <html>
                <head>
                    {generator.include(styles)}
                </head>
                <body>
                    <div id="app">{generator.include(html)}</div>
                </body>
            </html>
        );
    });
    ```

#### Code splitting
The final step in our quest to become static-hero is code splitting. We'll use `loadable-components` to bring this functionality into our app.

1. At first lets install all dependencies forthe **loadable components**:
    ```
    npm i @loadable/component @loadable/server && npm i -D @loadable/babel-plugin @loadable/webpack-plugin
    ```
2. Now in **index.js** lets wrapp our `render` method with `loadableReady` function to wait for all loadable components to be loaded.
    ```
    import { loadableReady } from "@loadable/component";
    . . .
    
    loadableReady(() => render(<App/>,"app"));
    ```
3. Add `@loadable/babel-plugin` into your **plugins** config in `.babelrc` file.
4. Add `LoadablePlugin` into **plugins** array in `webpack.config.js` file. It is important to set proper
5. After that we need to replace components that should be lazy loaded with dynamic imports 
    ```
    const LazyComponent = loadable(() => import('./lazy-component'))
    ```
6. Now we nedd to modify **static.js** so it can extract particular chunks for the specific routes:
    ```
    import { ChunkExtractor, ChunkExtractorManager } from "@loadable/server";
    . . .

    generateStaticRoutes((currentRoute, generator) => {  
        const extractor = new ChunkExtractor({ statsFile: path.resolve("./static/loadable.json") })
        
        const html = generator.html(
          <ChunkExtractorManager extractor={extractor}>
            <StaticRouter location={currentRoute} context={context}>
              <Application />
            </StaticRouter>        
          </ChunkExtractorManager>
        );
        const scripts = extractor.getScriptTags();
       
        return (
            <html lang="pl">
                <head>
                    {generator.include(scripts)}
                </head>
                <body>
                    <div id="app">{generator.include(html)}</div>          
                </body>
            </html>
        );
    });
    ```
7.
