import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// export type CreateViteConfigOptions = {
//   entry: string;
//   name: string;
//   outDir?: string;
//   srcDir: string;
// };

// export const createViteConfig = (options: CreateViteConfigOptions) => {
//   const outDir = options.outDir ?? "dist";
//   const srcDir = options.srcDir;

//   const baseDtsOptions = {
//     entryRoot: srcDir,
//     // exclude: options.exclude,
//     // tsconfigPath: options.tsconfigPath,
//     compilerOptions: {
//       declarationMap: false,
//     },
//   };

//   return defineConfig({
//     plugins: [
//       // esm
//       dts({
//         ...baseDtsOptions,
//         outDir: `${outDir}/esm`,
//         compilerOptions: {
//           ...baseDtsOptions.compilerOptions,
//           module: 99, // ESNext
//         },
//       }),
//       // cjs
//       dts({
//         ...baseDtsOptions,
//         outDir: `${outDir}/cjs`,
//         compilerOptions: {
//           ...baseDtsOptions.compilerOptions,
//           module: 1, // CommonJS
//         },
//       }),
//     ],
//     build: {
//       outDir,
//       sourcemap: true,
//       minify: false,
//       lib: {
//         entry: options.entry,
//         name: options.name,
//         formats: ["cjs", "es"],
//         fileName: (format) =>
//           format === "cjs" ? `cjs/[name].cjs` : `esm/[name].js`,
//       },
//       rollupOptions: {
//         external: ["react"],
//         // output: {
//         //   preserveModules: true,
//         // },
//       },
//     },
//   });
// };

// const config = createViteConfig({
//   entry: path.resolve(__dirname, "src/index.ts"),
//   name: "ReactURLSearchState",
//   srcDir: "./src",
// });

// export default mergeConfig(
//   config,
//   defineConfig({
//     test: {
//       environment: "jsdom",
//       setupFiles: "./tests/setup.ts",
//       globals: true,
//     },
//   }),
// );

const entry = path.resolve(__dirname, "src/index.ts");
const name = "ReactURLSearchState";
const outDir = "dist";
const srcDir = "./src";

const baseDtsOptions = {
  entryRoot: srcDir,
  // exclude: options.exclude,
  // tsconfigPath: options.tsconfigPath,
  compilerOptions: {
    declarationMap: false,
  },
};

export default defineConfig({
  plugins: [
    // esm
    dts({
      ...baseDtsOptions,
      outDir: `${outDir}/esm`,
      compilerOptions: {
        ...baseDtsOptions.compilerOptions,
        module: 99, // ESNext
      },
    }),
    // cjs
    dts({
      ...baseDtsOptions,
      outDir: `${outDir}/cjs`,
      compilerOptions: {
        ...baseDtsOptions.compilerOptions,
        module: 1, // CommonJS
      },
    }),
  ],
  build: {
    outDir,
    sourcemap: true,
    minify: false,
    lib: {
      entry,
      name,
      formats: ["cjs", "es"],
      fileName: (format) =>
        format === "cjs" ? `cjs/[name].cjs` : `esm/[name].js`,
    },
    rollupOptions: {
      external: ["react"],
      // output: {
      //   preserveModules: true,
      // },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    globals: true,
  },
});
