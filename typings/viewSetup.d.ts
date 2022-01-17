type NavigationNode = {
  id: string;
  label: string;
  hasArticle: boolean;
  url: string;
  children: NavigationNode[];
};

declare module '@setup/programmingLanguages/syntaxes.js' {
  const syntaxes: {
    [languageName: string]: () => any;
  };

  export default syntaxes;
}

declare module '@setup/programmingLanguages/themes.js' {
  const themes: {
    [themeName: string]: {};
  };

  export default themes;
}

declare module '@setup/navigation/tree.json' {
  const navigationTree: NavigationNode;

  export default navigationTree;
}

declare module '@setup/navigation/loaders.js' {
  const loaders: {
    [loaderName: string]: <T>() => Promise<{ default: T }>;
  };

  export default loaders;
}

declare module '@setup/navigation/resolveUrl.json' {
  type Url = string;
  type ChunkId = string;
  const resolveUrl: Record<Url, ChunkId>;

  export default resolveUrl;
}

declare module '@setup/frameworks/frameworks.js' {
  const frameworks: {
    [frameworkName: string]: {
      init: string;
      imports: string[];
      loadDependencies: <
        T extends { [dependencyName: string]: string }
      >() => Promise<{ ____dependencies____: T }>;
    };
  };

  export default frameworks;
}

declare module '@setup/playgrounds.js' {
  const playgrounds: {
    [playgroundId: string]: <T>() => Promise<{ default: T }>;
  };

  export default playgrounds;
}
