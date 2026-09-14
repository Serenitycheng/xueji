import type { NextConfig } from 'next';

const nextConfig: NextConfig = {serverExternalPackages:['@napi-rs/canvas','pdfjs-dist'],outputFileTracingIncludes:{'/*':['./node_modules/@napi-rs/canvas*/**/*','./node_modules/pdfjs-dist/legacy/build/*'],'/api/development-plan':['./learning-plans/development-ver2.pdf']}};

export default nextConfig;
