Base core architecture:

1. Collecting all .md(x) files
2. Parsing .md(x) files ast
3. Extracting all code entries as separated chunks
4. Bundling with own bundler all code entries
5. Bundling all .md(x) to js (not jsx)
6. Putting compiled pages with compiled code entries as a runnable react components chunks to output
7. Optionally building html pages with it
