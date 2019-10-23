const exec = require("child_process").exec;

// SuspenseBuild Plugin.
function SuspenseBuild(predicate, maxSuspenseTime = 20000) {
  this.timeout = maxSuspenseTime;
  this.predicate = predicate;
  this.start = Date.now();
  this.interval = 100;
  return {
    apply: compiler => {
      if (typeof predicate !== "function")
        throw new Error(
          `SuspenseBuild: Wrong predicete type. Got: "${typeof predicate}" instead of "function".`
        );
      if (!compiler.hooks)
        throw new Error(`SuspenseBuild: Incompatible webpack version.`);

      const plugin = { name: "SuspenseBuild" };
      compiler.hooks.run.tapAsync(plugin, (compilation, callback) => {
        const tick = () => {
          if (this.predicate()) {
            console.log(`awaited: ${Date.now() - this.start}ms`);
            callback();
          } else if (Date.now() - this.start > this.timeout) {
            throw Error("SuspenseBuild: Timeout exceeded.");
          } else {
            setTimeout(tick, this.interval);
          }
        };
        tick();
      });
    }
  };
}

// ExecAfterBuild Plugin.
function ExecuteAfterBuild(command) {
  this.command = command;
  return {
    apply: compiler => {
      if (compiler.hooks && this.command) {
        const plugin = { name: "ExecuteAfterBuild" };
        compiler.hooks.done.tapAsync(plugin, (compilation, callback) => {          
          exec(this.command, (error, stdout, stderr) => {
            error instanceof Error
              ? console.error(error)
              : console.log(stdout, stderr);
            callback();
          });
        });
      }
    }
  };
}

// Export.
module.exports.SuspenseBuild = SuspenseBuild;
module.exports.ExecuteAfterBuild = ExecuteAfterBuild;