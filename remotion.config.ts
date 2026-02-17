import { Config } from '@remotion/bundler';

export default {
	webpackOverride: (config: Config) => config,
	entryPoint: './remotion/index.tsx',
};
