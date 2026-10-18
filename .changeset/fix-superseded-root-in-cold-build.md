---
'@wyw-in-js/transform': patch
---

Fix an `AbortError: superseded` failure in concurrent cold builds on a shared cache when a loader changes a module's code before wyw, for example Storybook's `react-docgen-loader`, which appends `Component.__docgenInfo = …` to component modules (#422). While such a module waited for its own evaluation, other transforms that needed it replaced its cache entry with a new entrypoint of the same code, and after a few restarts the module failed to build. A request that the module being transformed already covers is now served by that module, so it keeps its cache entry and finishes. A module whose code changes on disk or in the loader output is still restarted or rejected as before.
