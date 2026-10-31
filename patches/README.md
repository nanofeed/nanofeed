# Dependency patch

`eslint-plugin-import-x+4.17.1.patch` adapts the `no-internal-modules` rule to the `minimatch` 11 matcher API. The plugin currently imports `makeRe`, which was removed in version 11. The patched rule retains its allow and forbid checks; tests cover both module formats. `patch-package` applies the patch during `npm ci`.

When a compatible upstream plugin is released, update the plugin, remove the patch and its temporary `minimatch` override, and run the audit and lint compatibility tests. Seven low-severity audit findings currently trace to `deepmerge`, which has no patched release.
