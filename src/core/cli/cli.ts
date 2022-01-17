// import yargs from 'yargs';

import { builder } from '../builder/builder';
import { resolvePath } from '../utils/fs';
import { recursiveReadDir } from '../utils/recursive-readdir';

// const args = yargs()
//   .scriptName('esdocs')
//   .usage('$0 <cmd> [args]')
//   .command(['start', 'dev'], 'run ui–stand server in watch mode')
//   .help()
//   .parse(process.argv);

builder(resolvePath('./demo'));
