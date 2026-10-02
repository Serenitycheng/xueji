import {withWorkflow} from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {serverExternalPackages:['@napi-rs/canvas','pdfjs-dist'],outputFileTracingIncludes:{'/*':['./node_modules/@napi-rs/canvas*/**/*','./node_modules/pdfjs-dist/legacy/build/*']}};

export default withWorkflow(nextConfig);
