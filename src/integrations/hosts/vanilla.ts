import { EsDocsHost } from './hosts';

export const host: EsDocsHost = {
  staticFiles: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="./view/index.css" />
    <title>Article</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="./view/index.js"></script>
  </body>
</html>
`,
  },
};
