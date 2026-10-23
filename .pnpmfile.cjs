/**
 * Strip optional native binaries (Next SWC, sharp) so `pnpm install`
 * can complete on a slow or flaky registry without 30MB platform tarballs.
 * Stage 0 tests and lint do not need those binaries.
 */
function readPackage(pkg) {
  if (pkg.name === "next" || pkg.name === "sharp") {
    pkg.optionalDependencies = {};
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
