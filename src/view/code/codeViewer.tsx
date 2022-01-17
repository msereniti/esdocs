import './codeViewer.css';

import * as programmingLanguages from '@setup/programmingLanguages/syntaxes.js';
import * as themes from '@setup/programmingLanguages/themes.js';
import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';

for (const language in programmingLanguages) {
  const languageDefinition =
    programmingLanguages[language as keyof typeof programmingLanguages].default;

  SyntaxHighlighter.registerLanguage(language, languageDefinition);
}

export const CodeViewer: React.FC<{ language: string; sourceCode: string }> = ({
  language,
  sourceCode,
}) => {
  const style = React.useMemo(() => {
    const base = themes.vs;

    return {
      ...base,
      'pre[class*="language-"]': {
        ...base['pre[class*="language-"]'],
        padding: 0,
        border: 'none',
      },
    };
  }, []);

  return (
    <SyntaxHighlighter
      className="es-docs__code-viewer"
      language={language}
      showLineNumbers={false}
      style={style}
      wrapLongLines
    >
      {sourceCode}
    </SyntaxHighlighter>
  );
};
