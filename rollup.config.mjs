import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const watching = Boolean(process.env.ROLLUP_WATCH);

export default {
  input: 'src/card.ts',
  output: {
    file: 'dist/xiaomi-p3-humidifier-card.js',
    format: 'es',
    inlineDynamicImports: true,
  },
  plugins: [
    resolve(),
    json(),
    typescript(),
    !watching && terser({ format: { comments: false } }),
  ],
};
