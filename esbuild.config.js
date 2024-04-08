const esbuildConig = () =>
  require("esbuild").buildSync({
    entryPoints: ["./src/main.js"],
    bundle: true,
    outfile: "./dist/main.js",
    target: "node16",
    platform: "node",
    charset: "utf8",
    external: ["electron", "sass"],
  });

esbuildConig();
