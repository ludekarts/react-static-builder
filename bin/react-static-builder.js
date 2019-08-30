#!/usr/bin/env node

// Oevrride node's require with ESM.
require = require("esm")(module);

const fs = require("fs");
const path = require("path");
const promisify = require("util").promisify;

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);


(async function ReactStaticBuilder() {
  const args = process.argv.slice(2);
  
  if (args.includes("init")) {
    initialize();
  } else if (args.includes("build")) {
    build();   
  }  
  
}());


// --- Tasks ----------------

async function initialize() {
  
  const rcConfig = await readFile(path.resolve(`${__dirname}/templates/rc-config.tmp`));
  const routesConfig = await readFile(path.resolve(`${__dirname}/templates/routes-config.tmp`));

  try {        
    // Read package.json.
    const packageJson = JSON.parse(
      await readFile(path.resolve("./package.json"), "utf8")
    );

    // Set build script.
    if (!packageJson.scripts || !packageJson.scripts.static) {
      packageJson.scripts.static = "rimraf static/* && webpack --mode production --env.prod=static";
    } else {
      packageJson.scripts.reactStaticBuild = "rimraf static/* && webpack --mode production --env.prod=static";
    }

    await writeFile(path.resolve("./package.json"), JSON.stringify(packageJson, null, 2), "utf8"); 

    // Create .staticrc file.
    try {
      await access(".staticrc", fs.constants.R_OK);
      console.error(`File ".staticrc" already exist. Step skipped.`);      
    } catch (error) {
      await writeFile(".staticrc", rcConfig, "utf8"); 
    }
    
    // Create static routes.
    try {
      await access("./src/static-routes.js", fs.constants.R_OK);
      console.error(`File "static-routes.js" already exist. Step skipped.`); 
    } catch (error) {
      await writeFile("./src/static-routes.js", routesConfig, "utf8"); 
    }

  } catch (error) {
    console.error(error);        
  }
}


async function build() {
  const currentDirectory = process.cwd();
  
  // Get .staticrc configuration file.
  let staticRcConfig;
  try {
    staticRcConfig = JSON.parse(
      await readFile(`${currentDirectory}/.staticrc`)
    );  
  } catch (error) {
    throw new Error ("'build' command requires presents of .staticrc configuration file in your project's root directory");
  }
  

  // ---- Set global variables for the generator ----------------

  global.window = global.window || {};   
  global.rsbStaticrc = staticRcConfig; 
  global.staticRoutes = require(`${currentDirectory}/${staticRcConfig.config}`).default;
  
  // Get build script name.
  const staticBuild = staticRcConfig.entries.static.indexOf("./") === 0 
    ? staticRcConfig.entries.static.slice(2)
    : staticRcConfig.entries.static;

  // Execute build script.
  require(path.resolve(`${currentDirectory}/${staticRcConfig.output}/cache/${staticBuild}`));
}