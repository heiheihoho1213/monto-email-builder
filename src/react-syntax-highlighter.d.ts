declare module 'react-syntax-highlighter' {
  export const Light: any;
  export const Prism: any;
  export const PrismLight: any;
  export const registerLanguage: (name: string, lang: any) => void;
}

declare module 'react-syntax-highlighter/dist/esm/languages/hljs/json' {
  const json: any;
  export default json;
}

declare module 'react-syntax-highlighter/dist/esm/languages/hljs/xml' {
  const xml: any;
  export default xml;
}

declare module 'react-syntax-highlighter/dist/esm/styles/hljs/github' {
  const github: any;
  export default github;
}
