![react-static-builder-logo](bin/assets/rsb-logo.png)

# React Static Builder
Toolset for building static web applications in React.

## Disclaimer
This is not a library that provides a ready to use solution. It is more a toolset allowing developer to introduce static rendering in React web application. It requires some configuration (docs below) but in the same time enables a lot of flexibility and takes out a burden of tedious setup of static rendering. If you're looking for something more blackbox-ish you may try React-static, Gatsby or anything else out there. Plenty of fish in the sea. 🐟😅

## Key features
The author is a bit subjective in this matter but here we go:
 - Do not relies on any specific React library besides React itself.
 - Simple mechanism to provide data for routes and views.
 - Webpack configuration enhancement - in theory this should be the only thing you need to add to your Webpack configuration.
 - Full controll over each staticly render page.
 - Starter template.
 - Basepath support a.k.a. serve your app from subdirectory.
 - It can be gradually implemented in the app.
 - TODO: ~~Render subsets of routes - handy if you have big web app with hundred of subpages and only wan to update (or more likely add) some.~~


## Command Line Interface (CLI)
After instalation React Static Builder (RSB) provide a CLI tool. It's main purpose is to set up a structure for the static build and bootsratap application later on.

To inintialize RSB type in yous comand line `react-static-builder init`. This command does three things:
 1. Creates statup files:
    - `.staticrc` file which contains default setup for the static render.
    - `src/static-routes.js` file where you can put configuration for all static routes in your app.
    - `src/static.js` file with initial template for static pages to start with.
 3. Add `static` script to your **package.json** file that will generate static app.
 4. Install **rimraf** in your project so it can use it to clean the build directory with ease.

## GUIDELINE: From zero to static-hero
Static render is fairly easy in it principles, however sometimes setting it up can be quite tedious task. RSB tries to remove some of this hustle and bring us better dev experience.

### Basic concept

------------------------

Lest start with the **basic setup**, that assumes you don't need any additional configuration, just the deafults that RSB provides you out of the box.

1. Install RSB: `npm i -D react-static-builder`.
2. Initialize RSB: `react-static-builder init`.
3. Open your **webpack.config.js** file and wrap output in RSB's Webpack helper:
    ```
    import { webpackConfig } from "react-static-builder/server";
    . . .

    export default webpackConfig((env, { mode }) => {
      return {
        // Your config goes here.
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
5. Open `src/static-routes.js` file and add root route `/` for your app:
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
8. Now you should see new folder called `static` with files ready to copy to the server.

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

    render(
      <BrowserRouter>
        <Application/>
      </BrowserRouter>
      , "app"
    );
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
        // More routes here...
      ];
    }
    ```
6. Run `npm run static` task. Files should be generated in **static** folder.


#### Dymaic content - fetching data
The true power of static render is to populate app with data before it reach the users. RSB allows you to do that by using `static-routes.js` and `useRouteData` hook.

1. Add another view to your app that requires some external data.
2. Install `node-fetch` into your project - data fetching logic need to be **isomorphic.
3. In `static-routes.js` add another route that will match one you've added to your app. Declare `getData` method that will be responsible for providing data to the view. See below:
    ```
    import fetch from "node-fetch";
    . . .

    export default async function staticRoutes() {
      return [
        // Other routers.
        {
          path: "/myNewView",
          getData: () => fetch("https://api.com/data/for/my/new/view").then(r => r.json()),
        },
      ];
    }
    ```

4. In your view import two hooks: `useRouteMatch` from **react-router-dom** and `useRouteData` from **react-static-builder**:
    ```
    import { useLocation } from "react-router-dom";
    import { useRouteData } from "react-static-builder";
    . . .

    export default function Users(props) {
      const { pathname } = useLocation();
      const users = useRouteData(pathname);
      return ...
    }
    ```
5. And that's it. Now you can freely add more routes and subroutes and use these two hooks to call data required for render.

6. *Additionally you can create a custom hook to make pulling data even more straight forward:

```
// use-route-data.js

import { useLocation } from "react-router-dom";
import { useRouteData } from "react-static-builder";

export default function () {
  const { pathname } = useLocation();
  const data = useRouteData(pathname);
  return data;
}

```


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
        // Pull out chunk modules.
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


### Using basepath

Basepath is useful when you want to serve your app from a subdirectory e.g. https://myDomain.com/myStaticApp In order to achieve that you need to modify `.static` file and provide the **basepath** value. Best practice is to set it to the relative path starts in your domain's root directory. For *myDomain.com* it would be just `/myStaticApp` assuming that app folder lies directly in root directory of your domain:

```
{
  ...
  "basepath": "/myStaticApp",
  ...
}
```

Because setting basepath correctly can be tricky below you can find how make it works with **react-router** and **@reach/router**.

#### Basepath with React Router

1. Add **basepath** to your `.staticrc` config file:
    ```
    {
      ...
      "basepath": "/ssr",
      ...
    }
    ```

1. Set **basename** for `<StaticRouter/>`:

    ```
    ...

    // We need to remove basepath from the current url since React Router sets this property by basename.
    const location = currentRoute.replace(staticrc.basepath, "");
    // We sets the basename to one from our config.
    const basename = staticrc.basepath;
    const html = generator.html(
      <StaticRouter location={location} basename={basename}>
        <Application />
      </StaticRouter>
    );

    ...
    ```
1.  Set **basename** for `<BrowserRouter/>`:

    ```
    ...

    render(
      <BrowserRouter basename={staticrc.basepath}>
        <Application/>
      </BrowserRouter>,
      "app"
    );

    ...
    ```
1. Create custom hook that allows you easily pull data for the route:

    ```
    // use-route-data.js

    import { useLocation } from "react-router-dom";
    import { useRouteData } from "react-static-builder";

    export default function () {
      const { pathname } = useLocation();
      // If we use a basepath in our config this will make sure static routes gets their data.
      const basepath = staticrc.basepath || "";
      const data = useRouteData(`${basepath}${pathname}`);
      return data;
    }
    ```

#### Basepath with @Reach/router

1. Add **basepath** to your `.staticrc` config file:
    ```
    {
      ...
      "basepath": "/ssr",
      ...
    }
    ```

1. Set **basename** for your main `<Router/>` on the app:
    ```
    ...

    <Router basepath={staticrc.basepath}>
      ...
    </Route>

    ...
    ```

1. Use **currentRoute** for **url** in `<ServerLocation/>` as usual:

    ```
    ...

    <ServerLocation url={currentRoute}>
      <Application />
    </ServerLocation>

    ...
    ```
1. *@reach/router seems to be more straightforward than the react-router but it also have it's odd behaviours (in my opinion). Basepath affects only relative links - which is desirable, however in terms of app's main navigation, where most likely you'd put an absolute links basepath have no effect. This means when you click on "home" link `/` you will be send to the root of your page and most often it is not what you would like to do. To solve this issue we could create a new `<Base Link/>` component that will be aware of basepath and stick to the basepath directory (if that what we want 😉):

    ```
    // base-link.js

    import React from "react";
    import { Link } from "@reach/router";

    export default function BaseLink({ to, ...props }) {
      const basepath = staticrc.basepath || "";
      return <Link to={`${basepath}${to}`} {...props} />;
    }
    ```
    now in the main menu you could do something like this:

    ```
    // navigation.js

    import React from "react";
    import BaseLink from "./base-link";
    import { Link } from "@reach/router";

    export default function Navigation(props) {
      return (
        <div>
          <Link to="/">Parent App Landing</Link>    // Link outside the app to the root directory.
          <BaseLink to="/">Home</BaseLink>          // Internal app link - home.
          <BaseLink to="/about">About</BaseLink>    // Internal app link - about.
          <BaseLink to="/contact">Contact</BaseLink>// Internal app link - contact.
        </div>
      );
    }

    ```