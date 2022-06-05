// @ts-ignore
import * as SyntaxHighlighter from 'react-syntax-highlighter';

import { esDocsFs } from '../utils/fs';

const defaultAliases: Record<string, string> = {
  ino: 'arduino',
  shell: 'bash',
  cs: 'csharp',
  dotnet: 'csharp',
  js: 'javascript',
  webmanifest: 'json',
  kt: 'kotlin',
  kts: 'kotlin',
  md: 'markdown',
  atom: 'markup',
  html: 'markup',
  mathml: 'markup',
  rss: 'markup',
  ssml: 'markup',
  svg: 'markup',
  xml: 'markup',
  objc: 'objectivec',
  py: 'python',
  rb: 'ruby',
  ts: 'typescript',
  yml: 'yaml',
  g4: 'antlr4',
  adoc: 'asciidoc',
  avs: 'avisynth',
  avdl: 'avro-idl',
  shortcode: 'bbcode',
  rbnf: 'bnf',
  oscript: 'bsl',
  cfc: 'cfscript',
  coffee: 'coffeescript',
  conc: 'concurnas',
  razor: 'cshtml',
  jinja2: 'django',
  'dns-zone': 'dns-zone-file',
  dockerfile: 'docker',
  gv: 'dot',
  eta: 'ejs',
  xls: 'excel-formula',
  xlsx: 'excel-formula',
  gamemakerlanguage: 'gml',
  gni: 'gn',
  'go-mod': 'go-module',
  hbs: 'handlebars',
  hs: 'haskell',
  idr: 'idris',
  gitignore: 'ignore',
  hgignore: 'ignore',
  npmignore: 'ignore',
  kum: 'kumir',
  context: 'latex',
  tex: 'latex',
  ly: 'lilypond',
  elisp: 'lisp',
  emacs: 'lisp',
  'emacs-lisp': 'lisp',
  moon: 'moonscript',
  n4jsd: 'n4js',
  nani: 'naniscript',
  qasm: 'openqasm',
  objectpascal: 'pascal',
  px: 'pcaxis',
  pcode: 'peoplecode',
  mscript: 'powerquery',
  pq: 'powerquery',
  pbfasm: 'purebasic',
  purs: 'purescript',
  qs: 'qsharp',
  rkt: 'racket',
  rpy: 'renpy',
  robot: 'robotframework',
  'sh-session': 'shell-session',
  shellsession: 'shell-session',
  smlnj: 'sml',
  sol: 'solidity',
  sln: 'solution-file',
  rq: 'sparql',
  t4: 't4-cs',
  trickle: 'tremor',
  troy: 'tremor',
  trig: 'turtle',
  tsconfig: 'typoscript',
  uct: 'unrealscript',
  uscript: 'unrealscript',
  url: 'uri',
  vb: 'visual-basic',
  vba: 'visual-basic',
  webidl: 'web-idl',
  mathematica: 'wolfram',
  nb: 'wolfram',
  wl: 'wolfram',
  xeoracube: 'xeora',
};

const supportedProgrammingLanguagesMap = Object.fromEntries(SyntaxHighlighter.Prism.supportedLanguages.map((language: any) => [language, true]));

export const bundleProgrammingLanguagesFiles = async (providedProgrammingLanguages: string[], destinationPath: string) => {
  /** TBD: add to configuration */
  const aliases = { ...defaultAliases };

  const programmingLanguages = [...new Set(providedProgrammingLanguages)].map((language) => aliases[language] || language);

  for (const language of programmingLanguages) {
    if (!supportedProgrammingLanguagesMap[language]) {
      /** TBD: just log warning */
      const errorMessage = `Programming language ${language} is not supported`;

      throw new Error(errorMessage);
    }
  }

  /** TBD: add ability for async loading syntaxes */

  // await ensureDir(resolvePath(destinationPath, 'syntaxes'));
  // await Promise.all(
  //   programmingLanguages.map((language) =>
  //     copyFile(
  //       resolvePath(
  //         nodeModulesPath,
  //         'react-syntax-highlighter',
  //         'dist',
  //         'esm',
  //         'programmingLanguages',
  //         'prism',
  //         `${language}.js`
  //       ),
  //       resolvePath(destinationPath, 'syntaxes', `${language}.js`)
  //     )
  //   )
  // );

  await esDocsFs.writeOutputFile(
    esDocsFs.resolvePath(destinationPath, 'syntaxes.js'),
    programmingLanguages.map((language) => `export * as ${language} from 'refractor/lang/${language}';`).join('\n')
  );

  const themes = ['vs', 'vs-dark'];

  /** TBD: add ability for async loading themes */

  await esDocsFs.writeOutputFile(
    esDocsFs.resolvePath(destinationPath, 'themes.js'),
    themes
      .map((theme) => {
        const varName = theme.replace(/\W/g, '_');

        return `export { default as ${varName} } from 'react-syntax-highlighter/dist/esm/styles/prism/${theme}';`;
      })
      .join('\n')
  );

  return {
    // syntax: Object.fromEntries(
    //   programmingLanguages.map((language) => [
    //     language,
    //     `/programmingLanguages/syntaxes/${language}.js`,
    //   ])
    // ),
  };
};
